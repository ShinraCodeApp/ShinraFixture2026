import { prisma } from '../config/database';
import { CacheService } from '../config/redis';
import { ApiError } from '../utils/ApiError';

const cache = new CacheService(300);

export class UsersService {
  static async getPublicProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, username: true, displayName: true, avatar: true,
        bio: true, country: true, level: true, xp: true,
        predictionPoints: true, totalPredictions: true, correctPredictions: true,
        isPremium: true, createdAt: true,
        favoriteTeams: {
          include: { team: { select: { id: true, name: true, code: true, flagUrl: true } } },
        },
        achievements: {
          include: { achievement: { select: { name: true, description: true, icon: true } } },
          orderBy: { unlockedAt: 'desc' },
          take: 6,
        },
        _count: { select: { predictions: true, comments: true } },
      },
    });
    if (!user) throw ApiError.notFound('User');
    return user;
  }

  static async getPublicPredictions(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      prisma.prediction.findMany({
        where: { userId, status: { not: 'PENDING' } },
        include: {
          match: {
            select: {
              id: true, matchDate: true, status: true, stage: true,
              homeScore: true, awayScore: true,
              homeTeam: { select: { id: true, name: true, code: true, flagUrl: true } },
              awayTeam: { select: { id: true, name: true, code: true, flagUrl: true } },
            },
          },
        },
        orderBy: { match: { matchDate: 'desc' } },
        skip, take: limit,
      }),
      prisma.prediction.count({ where: { userId, status: { not: 'PENDING' } } }),
    ]);
    return { items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
  }

  static async getAchievements(userId: string) {
    const [unlocked, all] = await Promise.all([
      prisma.userAchievement.findMany({
        where: { userId },
        include: { achievement: true },
        orderBy: { unlockedAt: 'desc' },
      }),
      prisma.achievement.findMany(),
    ]);
    const unlockedIds = new Set(unlocked.map((u) => u.achievementId));
    return {
      unlocked,
      locked: all.filter((a) => !unlockedIds.has(a.id)),
    };
  }

  static async updateProfile(userId: string, dto: {
    displayName?: string; bio?: string; country?: string;
    language?: string; timezone?: string;
    notificationsEnabled?: boolean;
  }) {
    return prisma.user.update({
      where: { id: userId },
      data: dto,
      select: {
        id: true, username: true, displayName: true, avatar: true,
        bio: true, country: true, language: true, timezone: true,
      },
    });
  }

  static async updateAvatar(userId: string, avatarUrl: string) {
    return prisma.user.update({
      where: { id: userId },
      data: { avatar: avatarUrl },
      select: { id: true, avatar: true },
    });
  }

  static async addFavoriteTeam(userId: string, teamId: string) {
    const count = await prisma.userFavoriteTeam.count({ where: { userId } });
    if (count >= 5) throw ApiError.badRequest('Maximum 5 favorite teams');

    await prisma.userFavoriteTeam.upsert({
      where: { userId_teamId: { userId, teamId } },
      update: {},
      create: { userId, teamId },
    });
  }

  static async removeFavoriteTeam(userId: string, teamId: string) {
    await prisma.userFavoriteTeam.deleteMany({ where: { userId, teamId } });
  }

  static async leaderboard(page = 1, limit = 20) {
    const cacheKey = `leaderboard:${page}:${limit}`;
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where: { predictionPoints: { gt: 0 } },
        select: {
          id: true, username: true, displayName: true, avatar: true,
          country: true, level: true, predictionPoints: true,
          totalPredictions: true, correctPredictions: true,
        },
        orderBy: { predictionPoints: 'desc' },
        skip, take: limit,
      }),
      prisma.user.count({ where: { predictionPoints: { gt: 0 } } }),
    ]);

    const result = {
      items: items.map((u, i) => ({ ...u, rank: skip + i + 1 })),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
    await cache.set(cacheKey, result, 120);
    return result;
  }

  static async myStats(userId: string) {
    const [user, predictions] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { predictionPoints: true, totalPredictions: true, correctPredictions: true, level: true, xp: true },
      }),
      prisma.prediction.groupBy({
        by: ['status'],
        where: { userId },
        _count: true,
      }),
    ]);

    const rank = await prisma.user.count({
      where: { predictionPoints: { gt: user?.predictionPoints ?? 0 } },
    });

    const byStatus = predictions.reduce((acc, p) => ({ ...acc, [p.status]: p._count }), {} as Record<string, number>);

    return {
      ...user,
      rank: rank + 1,
      won: byStatus['WON'] ?? 0,
      lost: byStatus['LOST'] ?? 0,
      pending: byStatus['PENDING'] ?? 0,
      accuracy: user?.totalPredictions
        ? Math.round(((user.correctPredictions ?? 0) / user.totalPredictions) * 100)
        : 0,
    };
  }

  static async deleteAccount(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw ApiError.notFound('User');
    await prisma.user.delete({ where: { id: userId } });
  }
}
