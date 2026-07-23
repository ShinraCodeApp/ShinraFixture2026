import cron from 'node-cron';
import axios from 'axios';
import { MatchStatus, NotificationType } from '@prisma/client';
import { prisma } from '../config/database';
import { CacheService } from '../config/redis';
import { logger } from '../utils/logger';
import { SportsApiService } from '../services/sportsApi.service';
import { PredictionService } from '../services/predictions.service';
import { NotificationService } from '../services/notifications.service';
import { BracketScoringService } from '../services/bracketScoring.service';
import { AIService } from '../services/ai.service';
import { PlayerStatsService } from '../services/playerStats.service';

const cache = new CacheService();

// Internal sync: calls our own espn-sync endpoint (reuses all mapping logic)
async function triggerLiveSyncIfNeeded(): Promise<void> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - 3 * 60 * 60 * 1000);
  const windowEnd   = new Date(now.getTime() + 3 * 60 * 60 * 1000);

  const activeMatchCount = await prisma.match.count({
    where: {
      OR: [
        { status: { in: [MatchStatus.LIVE, MatchStatus.HALF_TIME] } },
        { status: MatchStatus.SCHEDULED, matchDate: { gte: windowStart, lte: windowEnd } },
      ],
    },
  });

  if (activeMatchCount === 0) return;

  try {
    const port = parseInt(process.env.PORT ?? '4000', 10);
    await axios.post(`http://localhost:${port}/api/v1/matches/espn-sync`, {}, { timeout: 45_000 });
    logger.debug(`Auto-sync completed (${activeMatchCount} active matches)`);
  } catch (err: any) {
    logger.warn('Auto-sync error:', err.message);
  }
}

export function startCronJobs(): void {
  logger.info('Starting cron jobs...');

  // ── Centralized ESPN + api-football sync every 60s ───────────────────────
  // Runs server-side — clients don't need to trigger sync individually.
  // Handles any number of concurrent users without extra API calls.
  cron.schedule('*/60 * * * * *', async () => {
    await triggerLiveSyncIfNeeded();
  });

  // ── WC results daily sync (every 2h, unconditional) ──────────────────────
  // Picks up results from the last 7 days even when no active matches exist.
  // This keeps the knockout bracket updated between match rounds.
  cron.schedule('0 */2 * * *', async () => {
    await triggerWCDailySync();
  });

  // ── Legacy live match updates (kept as fallback with externalId) ──────────
  cron.schedule('*/30 * * * * *', async () => {
    await updateLiveMatches();
  });

  // ── Pre-match notifications (15 min before) ───────────
  cron.schedule('*/5 * * * *', async () => {
    await sendPreMatchNotifications();
  });

  // ── Generate AI predictions for upcoming matches ──────
  cron.schedule('0 * * * *', async () => {
    await generateUpcomingPredictions();
  });

  // ── Resolve finished match predictions ────────────────
  cron.schedule('*/2 * * * *', async () => {
    await resolveFinishedPredictions();
  });

  // ── Update group standings ────────────────────────────
  cron.schedule('*/5 * * * *', async () => {
    await updateGroupStandings();
  });

  // ── Score bracket picks (every 10 min during knockout stage) ─────────────
  cron.schedule('*/10 * * * *', async () => {
    await BracketScoringService.scoreAllActiveTournaments().catch((e) =>
      logger.warn('Bracket scoring cron failed:', e)
    );
  });

  // ── Player stats sync (every 10 min) ─────────────────────────────────────
  cron.schedule('*/10 * * * *', async () => {
    const wc = await prisma.tournament.findFirst({ where: { type: 'WORLD_CUP', year: 2026 } }).catch(() => null);
    if (!wc) return;
    PlayerStatsService.syncTournamentLeaderboards(wc.id).catch((e) =>
      logger.warn('PlayerStats cron failed:', e)
    );
  });

  // ── Daily match notification at 12:00 PM ART (15:00 UTC) ────────────────
  cron.schedule('0 15 * * *', async () => {
    const result = await sendDailyMatchesNotification();
    logger.info(`Daily match notification: ${result}`);
  });

  // ── Clean expired refresh tokens (daily) ─────────────
  cron.schedule('0 3 * * *', async () => {
    await cleanExpiredTokens();
  });

  // ── Expire premium subscriptions (hourly) ─────────────
  cron.schedule('0 * * * *', async () => {
    await checkExpiredPremiums();
  });

  // ── Cache warmup (every 10 min) ───────────────────────
  cron.schedule('*/10 * * * *', async () => {
    await warmupCache();
  });

  logger.info('Cron jobs started');
}

async function updateLiveMatches(): Promise<void> {
  const liveMatches = await prisma.match.findMany({
    where: { status: MatchStatus.LIVE },
    select: { id: true, externalId: true },
  });

  if (!liveMatches.length) return;

  for (const match of liveMatches) {
    try {
      if (match.externalId) {
        const liveData = await SportsApiService.getMatchData(match.externalId);
        if (liveData) {
          await prisma.match.update({
            where: { id: match.id },
            data: {
              homeScore: liveData.homeScore,
              awayScore: liveData.awayScore,
              minute: liveData.minute,
              status: liveData.status as MatchStatus,
            },
          });

          // Emit to connected clients
          const io = (global as any).io;
          if (io) {
            io.to(`match:${match.id}`).emit('match:score', {
              homeScore: liveData.homeScore,
              awayScore: liveData.awayScore,
              minute: liveData.minute,
            });
          }

          await cache.del(`match:${match.id}`);
          await cache.del('matches:live');
        }
      }
    } catch (err) {
      logger.warn(`Failed to update live match ${match.id}:`, err);
    }
  }
}

async function sendPreMatchNotifications(): Promise<void> {
  const now = new Date();
  const in15min = new Date(now.getTime() + 15 * 60 * 1000);
  const in16min = new Date(now.getTime() + 16 * 60 * 1000);

  const upcomingMatches = await prisma.match.findMany({
    where: {
      status: MatchStatus.SCHEDULED,
      matchDate: { gte: in15min, lte: in16min },
    },
    select: { id: true },
  });

  for (const match of upcomingMatches) {
    await NotificationService.notifyMatchStart(match.id);
    logger.debug(`Pre-match notification sent for match ${match.id}`);
  }
}

async function generateUpcomingPredictions(): Promise<void> {
  const in24h = new Date(Date.now() + 24 * 60 * 60 * 1000);

  const upcomingMatches = await prisma.match.findMany({
    where: {
      status: MatchStatus.SCHEDULED,
      matchDate: { lte: in24h },
      homeWinProb: null,
    },
    select: { id: true },
    take: 10,
  });

  for (const match of upcomingMatches) {
    try {
      await AIService.predictMatch(match.id);
    } catch (err) {
      logger.warn(`Failed to generate AI prediction for match ${match.id}:`, err);
    }
  }
}

async function resolveFinishedPredictions(): Promise<void> {
  const recentlyFinished = await prisma.match.findMany({
    where: {
      status: MatchStatus.FINISHED,
      predictions: { some: { status: 'PENDING' } },
    },
    select: { id: true },
    take: 20,
  });

  for (const match of recentlyFinished) {
    try {
      await PredictionService.resolveMatchPredictions(match.id);
      logger.debug(`Resolved predictions for match ${match.id}`);
    } catch (err) {
      logger.warn(`Failed to resolve predictions for match ${match.id}:`, err);
    }
  }
}

async function updateGroupStandings(): Promise<void> {
  const wc = await prisma.tournament.findFirst({
    where: { type: 'WORLD_CUP', year: 2026, isActive: true },
    include: { groups: { include: { teams: { select: { id: true, teamId: true } } } } },
  });
  if (!wc) return;

  // Get all FINISHED group-stage matches
  const matches = await prisma.match.findMany({
    where: { tournamentId: wc.id, stage: 'GROUP', status: 'FINISHED' },
    select: { id: true, group: true, homeTeamId: true, awayTeamId: true, homeScore: true, awayScore: true },
  });

  // Build a stats map: teamId → { played, won, drawn, lost, gf, ga }
  const stats: Record<string, { played: number; won: number; drawn: number; lost: number; gf: number; ga: number }> = {};
  const ensure = (id: string) => {
    if (!stats[id]) stats[id] = { played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0 };
  };

  for (const m of matches) {
    if (m.homeTeamId == null || m.awayTeamId == null || m.homeScore == null || m.awayScore == null) continue;
    ensure(m.homeTeamId);
    ensure(m.awayTeamId);
    const h = stats[m.homeTeamId];
    const a = stats[m.awayTeamId];
    h.played++; h.gf += m.homeScore; h.ga += m.awayScore;
    a.played++; a.gf += m.awayScore; a.ga += m.homeScore;
    if (m.homeScore > m.awayScore) { h.won++; a.lost++; }
    else if (m.homeScore < m.awayScore) { a.won++; h.lost++; }
    else { h.drawn++; a.drawn++; }
  }

  // Update TournamentGroupTeam records
  for (const group of wc.groups) {
    const groupTeams = group.teams;
    const teamStats = groupTeams
      .map((gt) => ({ gt, s: stats[gt.teamId] ?? { played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0 } }))
      .sort((a, b) => {
        const ptsA = a.s.won * 3 + a.s.drawn;
        const ptsB = b.s.won * 3 + b.s.drawn;
        if (ptsB !== ptsA) return ptsB - ptsA;
        const dgA = a.s.gf - a.s.ga, dgB = b.s.gf - b.s.ga;
        if (dgB !== dgA) return dgB - dgA;
        return b.s.gf - a.s.gf;
      });

    for (let i = 0; i < teamStats.length; i++) {
      const { gt, s } = teamStats[i];
      const pts = s.won * 3 + s.drawn;
      await prisma.tournamentGroupTeam.update({
        where: { id: gt.id },
        data: {
          played: s.played, won: s.won, drawn: s.drawn, lost: s.lost,
          goalsFor: s.gf, goalsAgainst: s.ga, goalDifference: s.gf - s.ga,
          points: pts, position: i + 1,
        },
      });
    }
  }

  await cache.del(`standings:${wc.id}`);
  await cache.del(`tournament:${wc.id}`);
}

async function cleanExpiredTokens(): Promise<void> {
  const deleted = await prisma.refreshToken.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
  if (deleted.count > 0) {
    logger.info(`Cleaned ${deleted.count} expired refresh tokens`);
  }
}

async function checkExpiredPremiums(): Promise<void> {
  const expired = await prisma.user.findMany({
    where: {
      isPremium: true,
      premiumUntil: { lt: new Date() },
      role: { not: 'ADMIN' },
      isGifted: false,
    },
    select: { id: true },
  });

  for (const user of expired) {
    await prisma.user.update({
      where: { id: user.id },
      data: { isPremium: false, premiumUntil: null, role: 'USER' },
    });
  }

  if (expired.length > 0) {
    logger.info(`Revoked premium from ${expired.length} expired users`);
  }
}

async function warmupCache(): Promise<void> {
  // Warmup frequently accessed cache keys
  await cache.del('matches:live');
  await cache.del('matches:today');
}

const TOURNAMENT_EMOJI: Record<string, string> = {
  LIGA_ARG: '🇦🇷', LA_LIGA: '🇪🇸', PREMIER_LEAGUE: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  BUNDESLIGA: '🇩🇪', SERIE_A: '🇮🇹', LIGUE_1: '🇫🇷',
  WORLD_CUP: '🌍', COPA_AMERICA: '🌎', CHAMPIONS_LEAGUE: '👑',
  EURO: '⭐', LIBERTADORES: '🦅',
};

export async function sendDailyMatchesNotification(): Promise<string> {
  const now = new Date();
  // Use ART (UTC-3) day boundaries
  const artOffset = 3 * 60 * 60 * 1000;
  const artNow = new Date(now.getTime() - artOffset);
  const startOfArtDay = new Date(artNow);
  startOfArtDay.setUTCHours(0, 0, 0, 0);
  const endOfArtDay = new Date(artNow);
  endOfArtDay.setUTCHours(23, 59, 59, 999);
  // Convert back to UTC for DB query
  const startUTC = new Date(startOfArtDay.getTime() + artOffset);
  const endUTC   = new Date(endOfArtDay.getTime()   + artOffset);

  const matches = await prisma.match.findMany({
    where: {
      matchDate: { gte: startUTC, lte: endUTC },
      status: { in: [MatchStatus.SCHEDULED, MatchStatus.LIVE] },
    },
    include: {
      homeTeam: { select: { shortName: true, code: true } },
      awayTeam: { select: { shortName: true, code: true } },
      tournament: { select: { shortName: true, type: true } },
    },
    orderBy: { matchDate: 'asc' },
    take: 12,
  });

  if (matches.length === 0) return 'Sin partidos hoy — notificación no enviada';

  // Group by tournament
  const byTournament: Record<string, typeof matches> = {};
  for (const m of matches) {
    const key = m.tournament?.shortName ?? 'Otros';
    if (!byTournament[key]) byTournament[key] = [];
    byTournament[key].push(m);
  }

  const firstType = matches[0].tournament?.type ?? '';
  const emoji = TOURNAMENT_EMOJI[firstType] ?? '⚽';
  const totalTournaments = Object.keys(byTournament).length;

  // Title
  const title = `⚽ ${matches.length} partido${matches.length > 1 ? 's' : ''} hoy · ${Object.keys(byTournament).slice(0, 2).join(' · ')}`;

  // Body: show up to 3 matches with ART times
  const bodyLines = matches.slice(0, 3).map((m) => {
    const home = m.homeTeam?.shortName ?? m.homeTeam?.code ?? '?';
    const away = m.awayTeam?.shortName ?? m.awayTeam?.code ?? '?';
    const artTime = new Date(m.matchDate.getTime() - artOffset);
    const hh = String(artTime.getUTCHours()).padStart(2, '0');
    const mm = String(artTime.getUTCMinutes()).padStart(2, '0');
    return `${home} vs ${away} ${hh}:${mm}`;
  });
  if (matches.length > 3) bodyLines.push(`+${matches.length - 3} más`);

  const body = bodyLines.join(' · ');

  await NotificationService.sendBroadcast(title, body, NotificationType.MATCH_START);
  logger.info(`Daily notification sent: ${matches.length} matches, ${totalTournaments} tournaments`);
  return `OK: ${matches.length} partidos notificados`;
}

// Syncs WC results unconditionally — runs even when no match is live.
// Uses a 7-day lookback so knockout results are never missed between rounds.
async function triggerWCDailySync(): Promise<void> {
  try {
    const port = parseInt(process.env.PORT ?? '4000', 10);
    await axios.post(`http://localhost:${port}/api/v1/matches/espn-sync`, { lookback: 7 }, { timeout: 60_000 });
    logger.info('WC daily sync completed');
  } catch (err: any) {
    logger.warn('WC daily sync error:', err.message);
  }
}
