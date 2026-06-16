import { Request, Response } from 'express';
import { MatchStatus, NotificationType } from '@prisma/client';
import { prisma } from '../config/database';
import { ApiError } from '../utils/ApiError';
import { NotificationService } from '../services/notifications.service';
import { PredictionService } from '../services/predictions.service';
import { CacheService } from '../config/redis';

const cache = new CacheService();

export class AdminController {
  static async dashboard(req: Request, res: Response): Promise<void> {
    const [totalUsers, activeUsers, liveMatches, todayPredictions, totalPredictions] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { updatedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } } }),
      prisma.match.count({ where: { status: MatchStatus.LIVE } }),
      prisma.prediction.count({ where: { createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } } }),
      prisma.prediction.count(),
    ]);

    res.json({
      success: true,
      data: { totalUsers, activeUsers, liveMatches, todayPredictions, totalPredictions },
    });
  }

  static async stats(req: Request, res: Response): Promise<void> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const [premiumUsers, revenue, newUsersToday] = await Promise.all([
      prisma.user.count({ where: { isPremium: true } }),
      prisma.subscription.count({ where: { status: 'active' } }),
      prisma.user.count({ where: { createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } } }),
    ]);

    res.json({ success: true, data: { premiumUsers, activeSubscriptions: revenue, newUsersToday } });
  }

  static async listUsers(req: Request, res: Response): Promise<void> {
    const { page = '1', limit = '20', search, role, isPremium } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const where: any = {};
    if (search) where.OR = [
      { email: { contains: search, mode: 'insensitive' } },
      { username: { contains: search, mode: 'insensitive' } },
    ];
    if (role) where.role = role;
    if (isPremium !== undefined) where.isPremium = isPremium === 'true';

    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true, email: true, username: true, displayName: true, avatar: true,
          role: true, isPremium: true, isBanned: true, isVerified: true,
          predictionPoints: true, totalPredictions: true, createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit as string),
      }),
      prisma.user.count({ where }),
    ]);
    res.json({ success: true, data: { items, pagination: { page: parseInt(page as string), limit: parseInt(limit as string), total } } });
  }

  static async getUser(req: Request, res: Response): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: {
        _count: { select: { predictions: true, comments: true } },
        subscriptions: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
    if (!user) throw ApiError.notFound('User');
    res.json({ success: true, data: user });
  }

  static async updateUser(req: Request, res: Response): Promise<void> {
    const { role, isPremium } = req.body;
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { role, isPremium },
      select: { id: true, email: true, username: true, role: true, isPremium: true },
    });
    res.json({ success: true, data: user });
  }

  static async banUser(req: Request, res: Response): Promise<void> {
    await prisma.user.update({
      where: { id: req.params.id },
      data: { isBanned: true, bannedReason: req.body.reason, tokenVersion: { increment: 1 } },
    });
    res.json({ success: true });
  }

  static async unbanUser(req: Request, res: Response): Promise<void> {
    await prisma.user.update({ where: { id: req.params.id }, data: { isBanned: false, bannedReason: null } });
    res.json({ success: true });
  }

  static async grantPremium(req: Request, res: Response): Promise<void> {
    const until = req.body.until ? new Date(req.body.until) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await prisma.user.update({
      where: { id: req.params.id },
      data: { isPremium: true, premiumUntil: until, role: 'PREMIUM' },
    });
    res.json({ success: true });
  }

  static async listMatches(req: Request, res: Response): Promise<void> {
    const { status, page = '1', limit = '20' } = req.query;
    const where: any = {};
    if (status) where.status = status;

    const [items, total] = await Promise.all([
      prisma.match.findMany({
        where,
        include: {
          homeTeam: { select: { id: true, name: true, code: true, flagUrl: true } },
          awayTeam: { select: { id: true, name: true, code: true, flagUrl: true } },
        },
        orderBy: { matchDate: 'desc' },
        skip: (parseInt(page as string) - 1) * parseInt(limit as string),
        take: parseInt(limit as string),
      }),
      prisma.match.count({ where }),
    ]);

    res.json({ success: true, data: { items, total } });
  }

  static async updateMatch(req: Request, res: Response): Promise<void> {
    const match = await prisma.match.update({
      where: { id: req.params.id },
      data: req.body,
    });
    await cache.delPattern(`match:${req.params.id}*`);
    res.json({ success: true, data: match });
  }

  static async fixMatchTime(req: Request, res: Response): Promise<void> {
    const { homeCode, awayCode, correctDateUTC } = req.body as {
      homeCode: string;
      awayCode: string;
      correctDateUTC: string; // ISO string in UTC, e.g. "2026-06-17T01:00:00Z"
    };

    const match = await prisma.match.findFirst({
      where: {
        homeTeam: { code: homeCode.toUpperCase() },
        awayTeam: { code: awayCode.toUpperCase() },
      },
      select: { id: true, matchDate: true },
    });

    if (!match) throw ApiError.notFound(`Match ${homeCode} vs ${awayCode}`);

    const updated = await prisma.match.update({
      where: { id: match.id },
      data: { matchDate: new Date(correctDateUTC) },
      select: { id: true, matchDate: true },
    });

    await cache.delPattern(`match:${match.id}*`);
    res.json({ success: true, data: updated });
  }

  static async addMatchEvent(req: Request, res: Response): Promise<void> {
    const event = await prisma.matchEvent.create({
      data: { matchId: req.params.id, ...req.body },
    });

    // Emit to socket
    const io = req.app.get('io');
    if (io) {
      io.to(`match:${req.params.id}`).emit('match:event', event);
    }

    // Send goal notification
    if (req.body.type === 'GOAL') {
      await NotificationService.notifyGoal(req.params.id, req.body.teamId, req.body.minute, req.body.scorerName);
    }

    await cache.del(`match:${req.params.id}`);
    res.status(201).json({ success: true, data: event });
  }

  static async removeMatchEvent(req: Request, res: Response): Promise<void> {
    await prisma.matchEvent.delete({ where: { id: req.params.eventId } });
    await cache.del(`match:${req.params.id}`);
    res.json({ success: true });
  }

  static async startMatch(req: Request, res: Response): Promise<void> {
    const match = await prisma.match.update({
      where: { id: req.params.id },
      data: { status: MatchStatus.LIVE, minute: 1 },
    });
    const io = req.app.get('io');
    if (io) io.to(`match:${req.params.id}`).emit('match:status', { status: 'LIVE' });
    await NotificationService.notifyMatchStart(req.params.id);
    await cache.del(`match:${req.params.id}`);
    res.json({ success: true, data: match });
  }

  static async finishMatch(req: Request, res: Response): Promise<void> {
    const { homeScore, awayScore } = req.body;
    const match = await prisma.match.update({
      where: { id: req.params.id },
      data: { status: MatchStatus.FINISHED, homeScore, awayScore },
    });

    const io = req.app.get('io');
    if (io) io.to(`match:${req.params.id}`).emit('match:status', { status: 'FINISHED' });

    await NotificationService.notifyMatchEnd(req.params.id);
    await PredictionService.resolveMatchPredictions(req.params.id);
    await cache.delPattern(`match:${req.params.id}*`);
    await cache.delPattern('matches:*');

    res.json({ success: true, data: match });
  }

  static async updateScore(req: Request, res: Response): Promise<void> {
    const { homeScore, awayScore, minute } = req.body;
    const match = await prisma.match.update({
      where: { id: req.params.id },
      data: { homeScore, awayScore, minute },
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`match:${req.params.id}`).emit('match:score', { homeScore, awayScore, minute });
      io.emit('global:score-update', { matchId: req.params.id, homeScore, awayScore });
    }

    await cache.del(`match:${req.params.id}`);
    res.json({ success: true, data: match });
  }

  static async broadcast(req: Request, res: Response): Promise<void> {
    const { title, body, type, filters } = req.body;
    await NotificationService.sendBroadcast(title, body, type as NotificationType, filters);
    res.json({ success: true, message: 'Broadcast sent' });
  }

  static async triggerMatchStart(req: Request, res: Response): Promise<void> {
    await NotificationService.notifyMatchStart(req.params.matchId);
    res.json({ success: true });
  }

  static async flaggedComments(req: Request, res: Response): Promise<void> {
    const comments = await prisma.comment.findMany({
      where: { isFlagged: true, isDeleted: false },
      include: { user: { select: { id: true, username: true } }, match: { select: { id: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json({ success: true, data: comments });
  }

  static async approveComment(req: Request, res: Response): Promise<void> {
    await prisma.comment.update({ where: { id: req.params.id }, data: { isFlagged: false } });
    res.json({ success: true });
  }

  static async deleteComment(req: Request, res: Response): Promise<void> {
    await prisma.comment.update({ where: { id: req.params.id }, data: { isDeleted: true, content: '[deleted by moderator]' } });
    res.json({ success: true });
  }

  static async listAds(req: Request, res: Response): Promise<void> {
    const ads = await prisma.advertisement.findMany({ orderBy: { createdAt: 'desc' } });
    res.json({ success: true, data: ads });
  }

  static async createAd(req: Request, res: Response): Promise<void> {
    const ad = await prisma.advertisement.create({ data: req.body });
    res.status(201).json({ success: true, data: ad });
  }

  static async updateAd(req: Request, res: Response): Promise<void> {
    const ad = await prisma.advertisement.update({ where: { id: req.params.id }, data: req.body });
    res.json({ success: true, data: ad });
  }

  static async deleteAd(req: Request, res: Response): Promise<void> {
    await prisma.advertisement.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  }
}
