import { NotificationType } from '@prisma/client';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';

export class NotificationService {
  // ── Send Push Notification ──────────────────────────
  static async sendPush(
    userIds: string[],
    payload: { title: string; body: string; type: NotificationType; data?: Record<string, string> }
  ): Promise<void> {
    if (!userIds.length) return;

    // Store in DB
    await prisma.notification.createMany({
      data: userIds.map((userId) => ({
        userId,
        type: payload.type,
        title: payload.title,
        body: payload.body,
        data: payload.data ?? {},
      })),
    });

    // Get FCM tokens
    const devices = await prisma.userDevice.findMany({
      where: { userId: { in: userIds }, isActive: true },
      select: { fcmToken: true },
    });

    if (!devices.length) return;

    const tokens = devices.map((d) => d.fcmToken);
    const expoTokens = tokens.filter((t) => t.startsWith('ExponentPushToken'));

    if (!expoTokens.length) return;

    const messages = expoTokens.map((token) => ({
      to: token,
      title: payload.title,
      body: payload.body,
      data: { type: payload.type, ...(payload.data ?? {}) },
      sound: 'default',
      channelId: 'shinra-matches',
      priority: 'high',
    }));

    try {
      const res = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'Accept-Encoding': 'gzip, deflate' },
        body: JSON.stringify(messages),
      });
      const result = await res.json() as { data?: { status: string; message?: string }[] };
      const failures = (result.data ?? []).filter((r) => r.status === 'error');
      if (failures.length) logger.warn('Expo push failures:', failures);
    } catch (err) {
      logger.warn('Failed to send Expo push notifications:', err);
    }
  }

  // ── Match Notifications ─────────────────────────────
  static async notifyMatchStart(matchId: string): Promise<void> {
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        homeTeam: { select: { name: true, code: true } },
        awayTeam: { select: { name: true, code: true } },
      },
    });
    if (!match) return;

    const interestedUsers = await this.getUsersInterestedInMatch(matchId, [match.homeTeamId, match.awayTeamId]);

    await this.sendPush(interestedUsers, {
      type: NotificationType.MATCH_START,
      title: '⚽ ¡Partido en vivo!',
      body: `${match.homeTeam.name} vs ${match.awayTeam.name} acaba de comenzar`,
      data: { matchId },
    });
  }

  static async notifyGoal(matchId: string, scoringTeamId: string, minute: number, scorerName?: string): Promise<void> {
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        homeTeam: { select: { name: true } },
        awayTeam: { select: { name: true } },
      },
    });
    if (!match) return;

    const scoringTeam = scoringTeamId === match.homeTeamId ? match.homeTeam.name : match.awayTeam.name;
    const fmtMin = minute > 90 ? `90+${minute - 90}` : String(minute);
    const score = `${match.homeScore ?? 0}-${match.awayScore ?? 0}`;

    // Broadcast to ALL users with notifications enabled
    const users = await prisma.user.findMany({
      where: { notificationsEnabled: true },
      select: { id: true },
    });
    const userIds = users.map((u) => u.id);

    await this.sendPush(userIds, {
      type: NotificationType.GOAL,
      title: `⚽ ¡GOL de ${scoringTeam}! (${fmtMin}')`,
      body: `${match.homeTeam.name} ${score} ${match.awayTeam.name}${scorerName ? ` · ${scorerName}` : ''}`,
      data: { matchId, minute: String(minute) },
    });
  }

  static async notifyCard(matchId: string, teamId: string, isRed: boolean, minute: number, playerName?: string): Promise<void> {
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        homeTeam: { select: { name: true } },
        awayTeam: { select: { name: true } },
      },
    });
    if (!match) return;

    const teamName = teamId === match.homeTeamId ? match.homeTeam.name : match.awayTeam.name;
    const interestedUsers = await this.getUsersInterestedInMatch(matchId, [match.homeTeamId, match.awayTeamId]);

    await this.sendPush(interestedUsers, {
      type: NotificationType.MATCH_START,
      title: isRed ? `🟥 Tarjeta ROJA — ${teamName} (${minute}')` : `🟨 Tarjeta amarilla — ${teamName} (${minute}')`,
      body: playerName ? `${playerName} recibió una tarjeta ${isRed ? 'roja' : 'amarilla'}` : `${match.homeTeam.name} vs ${match.awayTeam.name}`,
      data: { matchId, minute: String(minute) },
    });
  }

  static async notifyMatchEnd(matchId: string): Promise<void> {
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        homeTeam: { select: { name: true } },
        awayTeam: { select: { name: true } },
      },
    });
    if (!match) return;

    const score = `${match.homeScore ?? 0}-${match.awayScore ?? 0}`;
    const interestedUsers = await this.getUsersInterestedInMatch(matchId, [match.homeTeamId, match.awayTeamId]);

    await this.sendPush(interestedUsers, {
      type: NotificationType.MATCH_END,
      title: '🏁 Partido finalizado',
      body: `${match.homeTeam.name} ${score} ${match.awayTeam.name}`,
      data: { matchId },
    });
  }

  static async notifyPredictionResult(userId: string, matchId: string, pointsEarned: number): Promise<void> {
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        homeTeam: { select: { name: true } },
        awayTeam: { select: { name: true } },
      },
    });
    if (!match) return;

    await this.sendPush([userId], {
      type: NotificationType.PREDICTION_RESULT,
      title: pointsEarned > 0 ? `🎯 +${pointsEarned} puntos` : '😔 Sin puntos',
      body: `Resultado de tu pronóstico: ${match.homeTeam.name} vs ${match.awayTeam.name}`,
      data: { matchId, points: String(pointsEarned) },
    });
  }

  static async notifyPreMatch(minutesBefore = 15): Promise<{ notified: number; matches: string[] }> {
    const now = new Date();
    const windowStart = new Date(now.getTime() + (minutesBefore - 3) * 60_000);
    const windowEnd = new Date(now.getTime() + (minutesBefore + 3) * 60_000);

    const matches = await prisma.match.findMany({
      where: {
        status: 'SCHEDULED',
        matchDate: { gte: windowStart, lte: windowEnd },
      },
      include: {
        homeTeam: { select: { id: true, name: true, code: true } },
        awayTeam: { select: { id: true, name: true, code: true } },
      },
    });

    const notifiedMatchIds: string[] = [];

    for (const match of matches) {
      const interestedUsers = await this.getUsersInterestedInMatch(match.id, [match.homeTeamId, match.awayTeamId].filter(Boolean) as string[]);
      if (!interestedUsers.length) continue;

      await this.sendPush(interestedUsers, {
        type: NotificationType.MATCH_START,
        title: `⏰ Arranca en ${minutesBefore} min`,
        body: `${match.homeTeam.name} vs ${match.awayTeam.name} — ¡hacé tu pronóstico!`,
        data: { matchId: match.id },
      });

      notifiedMatchIds.push(match.id);
    }

    return { notified: notifiedMatchIds.length, matches: notifiedMatchIds };
  }

  static async sendBroadcast(
    title: string,
    body: string,
    type: NotificationType = NotificationType.SYSTEM,
    filters?: { isPremium?: boolean }
  ): Promise<void> {
    const where: any = { notificationsEnabled: true };
    if (filters?.isPremium !== undefined) where.isPremium = filters.isPremium;

    const users = await prisma.user.findMany({
      where,
      select: { id: true },
      take: 10000, // Batch in chunks for large user bases
    });

    const userIds = users.map((u) => u.id);
    await this.sendPush(userIds, { type, title, body });
  }

  private static async getUsersInterestedInMatch(matchId: string, teamIds: string[]): Promise<string[]> {
    // Users who have predictions for this match OR favorite the teams
    const [predictors, fans] = await Promise.all([
      prisma.prediction.findMany({ where: { matchId }, select: { userId: true } }),
      prisma.userFavoriteTeam.findMany({
        where: { teamId: { in: teamIds } },
        select: { userId: true },
      }),
    ]);

    const all = new Set([...predictors.map((p) => p.userId), ...fans.map((f) => f.userId)]);
    return Array.from(all);
  }

  // ── User Notifications ──────────────────────────────
  static async getUserNotifications(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total, unread] = await Promise.all([
      prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.notification.count({ where: { userId } }),
      prisma.notification.count({ where: { userId, isRead: false } }),
    ]);

    return { items, unread, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
  }

  static async markRead(notificationId: string, userId: string): Promise<void> {
    await prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true },
    });
  }

  static async markAllRead(userId: string): Promise<void> {
    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }

  static async delete(notificationId: string, userId: string): Promise<void> {
    await prisma.notification.deleteMany({ where: { id: notificationId, userId } });
  }

  static async registerDevice(userId: string, fcmToken: string, deviceType: string): Promise<void> {
    await prisma.userDevice.upsert({
      where: { userId_fcmToken: { userId, fcmToken } },
      update: { isActive: true, deviceType },
      create: { userId, fcmToken, deviceType },
    });
  }

  static async removeDevice(userId: string, fcmToken: string): Promise<void> {
    await prisma.userDevice.updateMany({
      where: { userId, fcmToken },
      data: { isActive: false },
    });
  }
}
