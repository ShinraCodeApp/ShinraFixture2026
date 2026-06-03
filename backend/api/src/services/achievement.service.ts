import { AchievementType } from '@prisma/client';
import { prisma } from '../config/database';
import { NotificationService } from './notifications.service';
import { NotificationType } from '@prisma/client';
import { logger } from '../utils/logger';

export class AchievementService {
  static async tryUnlock(userId: string, type: AchievementType): Promise<boolean> {
    try {
      const achievement = await prisma.achievement.findUnique({ where: { type } });
      if (!achievement) return false;

      const existing = await prisma.userAchievement.findUnique({
        where: { userId_achievementId: { userId, achievementId: achievement.id } },
      });
      if (existing) return false;

      await prisma.userAchievement.create({
        data: { userId, achievementId: achievement.id },
      });

      await prisma.user.update({
        where: { id: userId },
        data: { xp: { increment: achievement.xpReward } },
      });

      await NotificationService.sendPush([userId], {
        type: NotificationType.SYSTEM,
        title: `🏅 ¡Logro desbloqueado!`,
        body: `${achievement.name}: ${achievement.description}`,
        data: { achievementType: type, xpReward: String(achievement.xpReward) },
      });

      return true;
    } catch (err) {
      logger.warn(`Failed to unlock achievement ${type} for user ${userId}:`, err);
      return false;
    }
  }

  static async checkStreakAchievements(userId: string): Promise<void> {
    const recentPredictions = await prisma.prediction.findMany({
      where: { userId, status: { not: 'PENDING' } },
      orderBy: { updatedAt: 'desc' },
      take: 20,
      select: { status: true },
    });

    let streak = 0;
    for (const pred of recentPredictions) {
      if (pred.status === 'WON') streak++;
      else break;
    }

    if (streak >= 20) await this.tryUnlock(userId, 'STREAK_20');
    else if (streak >= 10) await this.tryUnlock(userId, 'STREAK_10');
    else if (streak >= 5) await this.tryUnlock(userId, 'STREAK_5');
  }

  static async checkTopPredictor(userId: string): Promise<void> {
    const rank = await prisma.user.count({
      where: { predictionPoints: { gt: (await prisma.user.findUnique({ where: { id: userId }, select: { predictionPoints: true } }))?.predictionPoints ?? 0 } },
    });

    if (rank < 100) await this.tryUnlock(userId, 'TOP_PREDICTOR');
  }
}
