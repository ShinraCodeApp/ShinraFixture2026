import cron from 'node-cron';
import { MatchStatus } from '@prisma/client';
import { prisma } from '../config/database';
import { CacheService } from '../config/redis';
import { logger } from '../utils/logger';
import { SportsApiService } from '../services/sportsApi.service';
import { PredictionService } from '../services/predictions.service';
import { NotificationService } from '../services/notifications.service';
import { AIService } from '../services/ai.service';

const cache = new CacheService();

export function startCronJobs(): void {
  logger.info('Starting cron jobs...');

  // ── Live match updates every 30 seconds ───────────────
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
  const activeTournament = await prisma.tournament.findFirst({
    where: { isActive: true },
    select: { id: true },
  });
  if (!activeTournament) return;

  await cache.del(`standings:${activeTournament.id}`);
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
