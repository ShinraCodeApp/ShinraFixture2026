import axios from 'axios';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';

// ESPN WC 2026 league slug
const ESPN_WC_LEAGUE = 'FIFA.WORLD';
const ESPN_BASE = 'https://site.api.espn.com/apis/site/v2/sports/soccer';

interface ESPNPlayerStat {
  name: string;
  displayValue: string;
  value?: number;
}

interface ESPNAthlete {
  displayName: string;
  shortName?: string;
  athlete?: { displayName: string; shortName?: string };
  stats?: ESPNPlayerStat[];
}

// Map ESPN stat labels → our DB fields
const STAT_MAP: Record<string, string> = {
  'Goals':              'goals',
  'Assists':            'assists',
  'Yellow Cards':       'yellowCards',
  'Red Cards':          'redCards',
  'Shots':              'shots',
  'Shots on Target':    'shotsOnTarget',
  'Passes':             'passes',
  'Key Passes':         'keyPasses',
  'Tackles':            'tackles',
  'Interceptions':      'interceptions',
  'Minutes Played':     'minutesPlayed',
  'Games Played':       'matchesPlayed',
  'Rating':             'avgRating',
};

async function fetchESPNLeaderboard(category: string): Promise<ESPNAthlete[]> {
  try {
    const url = `${ESPN_BASE}/${ESPN_WC_LEAGUE}/leaders?limit=50&category=${category}`;
    const res = await axios.get(url, { timeout: 10_000 });
    const leaders = res.data?.leaders ?? [];
    if (!Array.isArray(leaders)) return [];
    // ESPN returns [{displayName, leaders:[{athlete,stats}]}]
    const athletes: ESPNAthlete[] = [];
    for (const group of leaders) {
      for (const entry of group.leaders ?? []) {
        athletes.push({ displayName: entry.athlete?.displayName ?? entry.displayName, ...entry });
      }
    }
    return athletes;
  } catch {
    return [];
  }
}

async function fetchESPNMatchLinescores(matchExternalId: string): Promise<ESPNAthlete[]> {
  try {
    const url = `${ESPN_BASE}/${ESPN_WC_LEAGUE}/summary?event=${matchExternalId}`;
    const res = await axios.get(url, { timeout: 10_000 });
    const athletes: ESPNAthlete[] = [];
    for (const boxscore of res.data?.boxscore?.players ?? []) {
      for (const stat of boxscore.statistics ?? []) {
        for (const athlete of stat.athletes ?? []) {
          athletes.push({
            displayName: athlete.athlete?.displayName ?? '',
            shortName: athlete.athlete?.shortName,
            stats: stat.keys?.map((k: string, i: number) => ({
              name: stat.labels?.[i] ?? k,
              displayValue: athlete.stats?.[i] ?? '0',
              value: parseFloat(athlete.stats?.[i] ?? '0') || 0,
            })) ?? [],
          });
        }
      }
    }
    return athletes;
  } catch {
    return [];
  }
}

function parseStatValue(displayValue: string): number {
  const v = parseFloat(displayValue);
  return isNaN(v) ? 0 : v;
}

// Find a player in our DB by name fuzzy match within a tournament
async function resolvePlayer(displayName: string, tournamentId: string) {
  if (!displayName) return null;
  const parts = displayName.trim().split(/\s+/);
  const lastName = parts[parts.length - 1];

  // Try exact match first
  let player = await prisma.player.findFirst({
    where: { name: { equals: displayName, mode: 'insensitive' }, isActive: true },
  });
  if (player) return player;

  // Try shortName match
  player = await prisma.player.findFirst({
    where: { shortName: { equals: displayName, mode: 'insensitive' }, isActive: true },
  });
  if (player) return player;

  // Try last name contains
  player = await prisma.player.findFirst({
    where: { name: { contains: lastName, mode: 'insensitive' }, isActive: true },
  });
  return player;
}

async function upsertPlayerStats(
  playerId: string,
  tournamentId: string,
  updates: Partial<{
    goals: number; assists: number; yellowCards: number; redCards: number;
    shots: number; shotsOnTarget: number; passes: number; keyPasses: number;
    tackles: number; interceptions: number; minutesPlayed: number;
    matchesPlayed: number; avgRating: number;
  }>
) {
  await prisma.playerTournamentStats.upsert({
    where: { playerId_tournamentId: { playerId, tournamentId } },
    create: { playerId, tournamentId, ...updates },
    update: updates,
  });
}

// ── Main export: sync player stats for WC 2026 ─────────────────────────────

export class PlayerStatsService {

  // Called after a match finishes — syncs stats from the ESPN match summary
  static async syncMatchPlayerStats(matchExternalId: string, tournamentId: string): Promise<void> {
    if (!matchExternalId) return;

    try {
      const athletes = await fetchESPNMatchLinescores(matchExternalId);
      if (athletes.length === 0) return;

      for (const athlete of athletes) {
        const player = await resolvePlayer(athlete.displayName, tournamentId);
        if (!player) continue;

        const statUpdates: any = {};
        for (const stat of athlete.stats ?? []) {
          const dbField = STAT_MAP[stat.name];
          if (!dbField) continue;
          const val = stat.value ?? parseStatValue(stat.displayValue);
          if (dbField === 'avgRating') {
            statUpdates[dbField] = val > 0 ? val : undefined;
          } else {
            statUpdates[dbField] = val;
          }
        }

        if (Object.keys(statUpdates).length > 0) {
          await upsertPlayerStats(player.id, tournamentId, statUpdates);
        }
      }

      logger.debug(`[PlayerStats] synced match ${matchExternalId}`);
    } catch (err: any) {
      logger.warn(`[PlayerStats] syncMatchPlayerStats error: ${err.message}`);
    }
  }

  // Full tournament leaderboard sync — runs periodically and on-demand
  static async syncTournamentLeaderboards(tournamentId: string): Promise<{ synced: number; errors: string[] }> {
    const errors: string[] = [];
    let synced = 0;

    // Categories ESPN exposes for soccer leaders
    const categories = ['scoring', 'assists', 'yellowCards', 'redCards', 'shots', 'shotsOnTarget'];

    for (const cat of categories) {
      try {
        const athletes = await fetchESPNLeaderboard(cat);
        for (const athlete of athletes) {
          const player = await resolvePlayer(athlete.displayName, tournamentId);
          if (!player) continue;

          const statUpdates: any = {};
          for (const stat of athlete.stats ?? []) {
            const dbField = STAT_MAP[stat.name];
            if (!dbField) continue;
            statUpdates[dbField] = stat.value ?? parseStatValue(stat.displayValue);
          }

          if (Object.keys(statUpdates).length > 0) {
            await upsertPlayerStats(player.id, tournamentId, statUpdates);
            synced++;
          }
        }
      } catch (err: any) {
        errors.push(`${cat}: ${err.message}`);
      }
    }

    // Also sync all finished WC matches that have an externalId
    try {
      const finishedMatches = await prisma.match.findMany({
        where: { tournamentId, status: 'FINISHED', externalId: { not: null } },
        select: { externalId: true },
        take: 64,
      });

      for (const m of finishedMatches) {
        if (m.externalId) {
          await PlayerStatsService.syncMatchPlayerStats(m.externalId, tournamentId);
        }
      }
    } catch (err: any) {
      errors.push(`match-sync: ${err.message}`);
    }

    logger.info(`[PlayerStats] tournament sync complete — ${synced} records, ${errors.length} errors`);
    return { synced, errors };
  }

  // Recalculate stats from MatchEvents stored in our own DB
  // This is the fallback when ESPN data isn't available
  static async recalcFromMatchEvents(tournamentId: string): Promise<number> {
    const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });
    if (!tournament) return 0;

    // Fetch all relevant match events for this tournament
    const events = await prisma.matchEvent.findMany({
      where: { match: { tournamentId } },
      select: {
        type: true,
        scorerId: true,
        assistId: true,
        cardReceiverId: true,
        playerInId: true,
      },
    });

    // Build a map of playerId → accumulated stats
    const playerMap = new Map<string, {
      goals: number; assists: number; yellowCards: number;
      redCards: number; matchesPlayed: number;
    }>();

    const ensure = (id: string) => {
      if (!playerMap.has(id)) playerMap.set(id, { goals: 0, assists: 0, yellowCards: 0, redCards: 0, matchesPlayed: 0 });
      return playerMap.get(id)!;
    };

    for (const ev of events) {
      if ((ev.type === 'GOAL' || ev.type === 'PENALTY_SCORED') && ev.scorerId) {
        ensure(ev.scorerId).goals += 1;
      }
      if (ev.type === 'GOAL' && ev.assistId) {
        ensure(ev.assistId).assists += 1;
      }
      if (ev.type === 'YELLOW_CARD' && ev.cardReceiverId) {
        ensure(ev.cardReceiverId).yellowCards += 1;
      }
      if ((ev.type === 'RED_CARD' || ev.type === 'SECOND_YELLOW') && ev.cardReceiverId) {
        ensure(ev.cardReceiverId).redCards += 1;
      }
      if (ev.type === 'SUBSTITUTION_IN' && ev.playerInId) {
        ensure(ev.playerInId).matchesPlayed += 1;
      }
    }

    let upserted = 0;
    for (const [playerId, updates] of playerMap.entries()) {
      await upsertPlayerStats(playerId, tournamentId, updates);
      upserted++;
    }

    logger.info(`[PlayerStats] recalcFromMatchEvents — ${upserted} players updated`);
    return upserted;
  }
}
