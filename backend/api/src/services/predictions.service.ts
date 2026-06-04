import { MatchStatus, PredictionStatus } from '@prisma/client';
import dayjs from 'dayjs';
import { prisma } from '../config/database';
import { CacheService } from '../config/redis';
import { ApiError } from '../utils/ApiError';
import { AchievementService } from './achievement.service';

const cache = new CacheService();

// ── Scoring System ─────────────────────────────────────
// Exact score:          5 points
// Correct winner + GD:  4 points
// Correct winner:       3 points
// Correct draw:         3 points
// Wrong result:         0 points
// Perfect tournament:  50 bonus points

function calculatePoints(prediction: { homeScore: number; awayScore: number }, actual: { homeScore: number; awayScore: number }): number {
  if (prediction.homeScore === actual.homeScore && prediction.awayScore === actual.awayScore) {
    return 5; // Exact score
  }

  const predWinner = prediction.homeScore > prediction.awayScore ? 'home'
    : prediction.homeScore < prediction.awayScore ? 'away' : 'draw';
  const actualWinner = actual.homeScore > actual.awayScore ? 'home'
    : actual.homeScore < actual.awayScore ? 'away' : 'draw';

  if (predWinner !== actualWinner) return 0;

  // Correct winner
  if (predWinner === 'draw') return 3;

  const predGD = Math.abs(prediction.homeScore - prediction.awayScore);
  const actualGD = Math.abs(actual.homeScore - actual.awayScore);

  return predGD === actualGD ? 4 : 3;
}

export class PredictionService {
  static async getUserPredictions(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [predictions, total] = await Promise.all([
      prisma.prediction.findMany({
        where: { userId },
        include: {
          match: {
            select: {
              id: true, matchDate: true, status: true, stage: true, group: true,
              homeScore: true, awayScore: true,
              homeTeam: { select: { id: true, name: true, code: true, flagUrl: true } },
              awayTeam: { select: { id: true, name: true, code: true, flagUrl: true } },
            },
          },
        },
        orderBy: { match: { matchDate: 'desc' } },
        skip,
        take: limit,
      }),
      prisma.prediction.count({ where: { userId } }),
    ]);

    return { items: predictions, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
  }

  static async createOrUpdate(userId: string, dto: { matchId: string; homeScore: number; awayScore: number }) {
    const match = await prisma.match.findUnique({
      where: { id: dto.matchId },
      select: { id: true, status: true, matchDate: true },
    });

    if (!match) throw ApiError.notFound('Match');
    if (match.status !== MatchStatus.SCHEDULED) {
      throw ApiError.badRequest('Predictions can only be made for scheduled matches');
    }
    if (dayjs(match.matchDate).diff(dayjs(), 'minute') < 15) {
      throw ApiError.badRequest('Predictions close 15 minutes before kickoff');
    }

    const prediction = await prisma.prediction.upsert({
      where: { userId_matchId: { userId, matchId: dto.matchId } },
      update: { homeScore: dto.homeScore, awayScore: dto.awayScore },
      create: {
        userId,
        matchId: dto.matchId,
        homeScore: dto.homeScore,
        awayScore: dto.awayScore,
        predictedWinner: dto.homeScore > dto.awayScore ? 'home' : dto.homeScore < dto.awayScore ? 'away' : 'draw',
      },
    });

    // First prediction achievement
    const count = await prisma.prediction.count({ where: { userId } });
    if (count === 1) {
      await AchievementService.tryUnlock(userId, 'FIRST_PREDICTION');
    }

    return prediction;
  }

  static async batchCreate(userId: string, predictions: Array<{ matchId: string; homeScore: number; awayScore: number }>) {
    const results = [];
    for (const pred of predictions) {
      try {
        const result = await this.createOrUpdate(userId, pred);
        results.push({ matchId: pred.matchId, success: true, data: result });
      } catch (err) {
        results.push({ matchId: pred.matchId, success: false, error: (err as Error).message });
      }
    }
    return results;
  }

  static async getForMatch(userId: string, matchId: string) {
    return prisma.prediction.findUnique({
      where: { userId_matchId: { userId, matchId } },
    });
  }

  static async delete(userId: string, matchId: string): Promise<void> {
    const prediction = await prisma.prediction.findUnique({
      where: { userId_matchId: { userId, matchId } },
      include: { match: { select: { status: true, matchDate: true } } },
    });

    if (!prediction) throw ApiError.notFound('Prediction');
    if (prediction.match.status !== MatchStatus.SCHEDULED) {
      throw ApiError.badRequest('Cannot delete prediction for started match');
    }

    await prisma.prediction.delete({ where: { userId_matchId: { userId, matchId } } });
  }

  static async getGlobalRanking(tournamentId: string | undefined, page = 1, limit = 20) {
    const cacheKey = `ranking:global:${tournamentId ?? 'all'}:${page}`;
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where: { predictionPoints: { gt: 0 } },
        select: {
          id: true, username: true, displayName: true, avatar: true,
          level: true, predictionPoints: true, totalPredictions: true, correctPredictions: true,
          country: true,
        },
        orderBy: { predictionPoints: 'desc' },
        skip,
        take: limit,
      }),
      prisma.user.count({ where: { predictionPoints: { gt: 0 } } }),
    ]);

    const ranked = users.map((u, i) => ({ ...u, rank: skip + i + 1 }));
    const result = { items: ranked, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };

    await cache.set(cacheKey, result, 300);
    return result;
  }

  static async getMyRanking(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { predictionPoints: true },
    });
    if (!user) throw ApiError.notFound('User');

    const rank = await prisma.user.count({
      where: { predictionPoints: { gt: user.predictionPoints } },
    });

    return { rank: rank + 1, points: user.predictionPoints };
  }

  // Called after a match finishes to calculate points
  static async resolveMatchPredictions(matchId: string): Promise<void> {
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      select: { id: true, homeScore: true, awayScore: true, status: true },
    });

    if (!match || match.status !== MatchStatus.FINISHED) return;
    if (match.homeScore === null || match.awayScore === null) return;

    const predictions = await prisma.prediction.findMany({
      where: { matchId, status: PredictionStatus.PENDING },
    });

    for (const pred of predictions) {
      const points = calculatePoints(
        { homeScore: pred.homeScore, awayScore: pred.awayScore },
        { homeScore: match.homeScore!, awayScore: match.awayScore! }
      );

      const status = points > 0 ? PredictionStatus.WON : PredictionStatus.LOST;

      await prisma.$transaction([
        prisma.prediction.update({
          where: { id: pred.id },
          data: { status, pointsEarned: points },
        }),
        prisma.user.update({
          where: { id: pred.userId },
          data: {
            predictionPoints: { increment: points },
            totalPredictions: { increment: 1 },
            correctPredictions: points > 0 ? { increment: 1 } : undefined,
          },
        }),
      ]);
    }

    // Invalidate ranking cache
    await cache.delPattern('ranking:*');

    // Update quiniela standings
    await this.updateQuinielaStandings(matchId);
  }

  private static async updateQuinielaStandings(matchId: string): Promise<void> {
    const predictions = await prisma.prediction.findMany({
      where: { matchId, status: { not: PredictionStatus.PENDING }, quinielaGroupId: { not: null } },
      select: { userId: true, quinielaGroupId: true, pointsEarned: true },
    });

    for (const pred of predictions) {
      if (!pred.quinielaGroupId) continue;
      await prisma.quinielaGroupMember.updateMany({
        where: { groupId: pred.quinielaGroupId, userId: pred.userId },
        data: { totalPoints: { increment: pred.pointsEarned } },
      });
    }
  }
}
