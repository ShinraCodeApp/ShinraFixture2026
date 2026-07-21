import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { MatchStatus, NotificationType } from '@prisma/client';
import { prisma } from '../config/database';
import { ApiError } from '../utils/ApiError';
import { NotificationService } from '../services/notifications.service';
import { PredictionService } from '../services/predictions.service';
import { CacheService } from '../config/redis';
import { BracketService } from '../services/bracket.service';

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
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [total, premium, newToday, newLast7, newLast30, totalPredictions, totalDuels, totalTournaments,
      predictionsWon, predictionsLost, topPredictors, eliminatedTeams] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isPremium: true } }),
      prisma.user.count({ where: { createdAt: { gte: startOfToday } } }),
      prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.prediction.count(),
      prisma.matchDuel.count(),
      prisma.friendTournament.count(),
      prisma.prediction.count({ where: { status: 'WON' } }),
      prisma.prediction.count({ where: { status: 'LOST' } }),
      prisma.user.findMany({
        where: { predictionPoints: { gt: 0 } },
        select: { id: true, username: true, displayName: true, predictionPoints: true, totalPredictions: true, country: true },
        orderBy: { predictionPoints: 'desc' },
        take: 5,
      }),
      prisma.team.count({ where: { isEliminated: true } }),
    ]);

    const predictionsPending = totalPredictions - predictionsWon - predictionsLost;

    res.json({
      success: true,
      data: { total, premium, newToday, newLast7, newLast30, totalPredictions, totalDuels, totalTournaments,
        predictionsWon, predictionsLost, predictionsPending, topPredictors, eliminatedTeams },
    });
  }

  static async listUsers(req: Request, res: Response): Promise<void> {
    const { page = '1', limit = '20', search, role, isPremium, sortBy, sortOrder } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const where: any = {};
    if (search) where.OR = [
      { email: { contains: search, mode: 'insensitive' } },
      { username: { contains: search, mode: 'insensitive' } },
    ];
    if (role) where.role = role;
    if (isPremium !== undefined) where.isPremium = isPremium === 'true';

    const ALLOWED_SORT = ['createdAt', 'predictionPoints', 'xp', 'level', 'totalPredictions'];
    const orderByField = ALLOWED_SORT.includes(sortBy as string) ? (sortBy as string) : 'createdAt';
    const orderByDir = sortOrder === 'asc' ? 'asc' : 'desc';

    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true, email: true, username: true, displayName: true, avatar: true,
          role: true, isPremium: true, isBanned: true, isVerified: true,
          predictionPoints: true, totalPredictions: true, createdAt: true,
        },
        orderBy: { [orderByField]: orderByDir },
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
    const { role, isPremium, displayName, username, country, predictionPoints, xp, level, password } = req.body;
    const data: Record<string, unknown> = {};
    if (role !== undefined) data.role = role;
    if (isPremium !== undefined) data.isPremium = isPremium;
    if (displayName !== undefined) data.displayName = displayName;
    if (username !== undefined) data.username = username;
    if (country !== undefined) data.country = country;
    if (predictionPoints !== undefined) data.predictionPoints = Number(predictionPoints);
    if (xp !== undefined) data.xp = Number(xp);
    if (level !== undefined) data.level = Number(level);
    if (password && password.length >= 6) data.passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data,
      select: { id: true, email: true, username: true, displayName: true, role: true, isPremium: true, predictionPoints: true, xp: true, level: true, country: true },
    });
    res.json({ success: true, data: user });
  }

  static async deleteUser(req: Request, res: Response): Promise<void> {
    await prisma.user.delete({ where: { id: req.params.id } });
    res.json({ success: true });
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
    const { status, stage, worldcup, page = '1', limit = '20' } = req.query;
    const where: any = {};
    if (status) where.status = status;
    if (stage === 'knockout') {
      where.stage = { in: ['ROUND_OF_32', 'ROUND_OF_16', 'QUARTER_FINAL', 'SEMI_FINAL', 'THIRD_PLACE', 'FINAL'] };
    } else if (stage) {
      where.stage = stage;
    }
    if (worldcup === 'true') where.tournament = { type: 'WORLD_CUP' };

    const [items, total] = await Promise.all([
      prisma.match.findMany({
        where,
        include: {
          homeTeam: { select: { id: true, name: true, code: true, flagUrl: true } },
          awayTeam: { select: { id: true, name: true, code: true, flagUrl: true } },
        },
        orderBy: { round: 'asc' },
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

    if (match.status === MatchStatus.FINISHED) {
      await BracketService.propagateWinner(match.id);
    }

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
    await BracketService.propagateWinner(match.id);
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

  static async activityData(_req: Request, res: Response): Promise<void> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const [allUsers, allPredictions] = await Promise.all([
      prisma.user.findMany({ where: { createdAt: { gte: thirtyDaysAgo } }, select: { createdAt: true } }),
      prisma.prediction.findMany({ where: { createdAt: { gte: thirtyDaysAgo } }, select: { createdAt: true } }),
    ]);
    const usersByDay: Record<string, number> = {};
    const predsByDay: Record<string, number> = {};
    for (const u of allUsers) {
      const key = u.createdAt.toISOString().slice(0, 10);
      usersByDay[key] = (usersByDay[key] ?? 0) + 1;
    }
    for (const p of allPredictions) {
      const key = p.createdAt.toISOString().slice(0, 10);
      predsByDay[key] = (predsByDay[key] ?? 0) + 1;
    }
    const result = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      result.push({
        date: d.toLocaleDateString('es-AR', { month: 'short', day: 'numeric' }),
        users: usersByDay[key] ?? 0,
        predictions: predsByDay[key] ?? 0,
      });
    }
    res.json({ success: true, data: result });
  }

  static async tournamentStatus(_req: Request, res: Response): Promise<void> {
    const now = new Date();
    const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000);
    const STAGE_LABELS: Record<string, string> = {
      GROUP: 'Fase de Grupos', ROUND_OF_32: '16vos de Final',
      ROUND_OF_16: 'Octavos de Final', QUARTER_FINAL: 'Cuartos de Final',
      SEMI_FINAL: 'Semifinales', FINAL: 'Final',
    };
    const [liveMatches, nextMatches, staleMatches, matchesPlayed, totalMatches, r16Matches] = await Promise.all([
      prisma.match.findMany({
        where: { status: { in: ['LIVE', 'HALF_TIME'] }, tournament: { type: 'WORLD_CUP' } },
        include: { homeTeam: { select: { name: true, code: true, flagUrl: true } }, awayTeam: { select: { name: true, code: true, flagUrl: true } } },
      }),
      prisma.match.findMany({
        where: { status: 'SCHEDULED', tournament: { type: 'WORLD_CUP' } },
        include: { homeTeam: { select: { code: true, name: true } }, awayTeam: { select: { code: true, name: true } } },
        orderBy: { matchDate: 'asc' },
        take: 5,
      }),
      prisma.match.findMany({
        where: { status: 'SCHEDULED', matchDate: { lt: threeHoursAgo }, tournament: { type: 'WORLD_CUP' } },
        select: { id: true, round: true, matchDate: true, stage: true, homeTeam: { select: { code: true } }, awayTeam: { select: { code: true } } },
      }),
      prisma.match.count({ where: { status: 'FINISHED', tournament: { type: 'WORLD_CUP' } } }),
      prisma.match.count({ where: { tournament: { type: 'WORLD_CUP' } } }),
      prisma.match.findMany({
        where: { stage: 'ROUND_OF_16', tournament: { type: 'WORLD_CUP' } },
        include: { homeTeam: { select: { code: true, name: true, flagUrl: true } }, awayTeam: { select: { code: true, name: true, flagUrl: true } } },
        orderBy: { matchDate: 'asc' },
      }),
    ]);
    const currentStage = liveMatches[0]?.stage ?? nextMatches[0]?.stage ?? 'ROUND_OF_32';
    res.json({
      success: true,
      data: {
        currentPhase: STAGE_LABELS[currentStage] ?? currentStage,
        matchesPlayed,
        totalMatches,
        liveCount: liveMatches.length,
        liveMatches,
        nextMatches,
        staleMatches,
        r16Matches,
      },
    });
  }

  static async listPredictions(req: Request, res: Response): Promise<void> {
    const limit = parseInt(req.query.limit as string) || 50;
    const page = parseInt(req.query.page as string) || 1;
    const skip = (page - 1) * limit;
    const [predictions, total] = await Promise.all([
      prisma.prediction.findMany({
        skip, take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, username: true, email: true } },
          match: { include: { homeTeam: { select: { code: true, name: true } }, awayTeam: { select: { code: true, name: true } } } },
        },
      }),
      prisma.prediction.count(),
    ]);
    res.json({ success: true, data: { predictions, total, page, limit } });
  }

  static async resolvePredictions(req: Request, res: Response): Promise<void> {
    const { matchId } = req.params;
    await PredictionService.resolveMatchPredictions(matchId);
    res.json({ success: true, message: `Predicciones del partido ${matchId} resueltas` });
  }

  static async getConfig(_req: Request, res: Response): Promise<void> {
    const configs = await prisma.appConfig.findMany({ orderBy: { key: 'asc' } });
    res.json({ success: true, data: configs });
  }

  static async updateConfig(req: Request, res: Response): Promise<void> {
    const { key } = req.params;
    const { value } = req.body;
    const config = await prisma.appConfig.upsert({
      where: { key },
      update: { value: String(value) },
      create: { key, value: String(value) },
    });
    res.json({ success: true, data: config });
  }

  static async updateTeam(req: Request, res: Response): Promise<void> {
    const { isEliminated, fifaRanking, group, name, shortName } = req.body;
    const data: Record<string, unknown> = {};
    if (isEliminated !== undefined) data.isEliminated = Boolean(isEliminated);
    if (fifaRanking !== undefined) data.fifaRanking = fifaRanking === null ? null : Number(fifaRanking);
    if (group !== undefined) data.group = group;
    if (name !== undefined) data.name = name;
    if (shortName !== undefined) data.shortName = shortName;
    const team = await prisma.team.update({ where: { id: req.params.id }, data });
    res.json({ success: true, data: team });
  }

  static async syncWCResults(req: Request, res: Response): Promise<void> {
    try {
      const port = parseInt(process.env.PORT ?? '4000', 10);
      const result = await (await import('axios')).default.post(
        `http://localhost:${port}/api/v1/matches/espn-sync`,
        { lookback: 7 },
        { timeout: 60_000 }
      );
      res.json({ success: true, data: result.data.data });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async fixR32Teams(req: Request, res: Response): Promise<void> {
    const R32_MATCHES = [
      { round: 73, homeCode: 'RSA', awayCode: 'CAN', matchDate: '2026-06-28T17:00:00Z', venue: 'SoFi Stadium', city: 'Los Angeles', country: 'United States', status: 'FINISHED', homeScore: 0, awayScore: 1 },
      { round: 74, homeCode: 'BRA', awayCode: 'JPN', matchDate: '2026-06-29T17:00:00Z', venue: 'NRG Stadium', city: 'Houston', country: 'United States', status: 'SCHEDULED', homeScore: null, awayScore: null },
      { round: 75, homeCode: 'GER', awayCode: 'PAR', matchDate: '2026-06-29T20:30:00Z', venue: 'Gillette Stadium', city: 'Boston', country: 'United States', status: 'SCHEDULED', homeScore: null, awayScore: null },
      { round: 76, homeCode: 'NED', awayCode: 'MAR', matchDate: '2026-06-30T01:00:00Z', venue: 'Estadio BBVA', city: 'Monterrey', country: 'Mexico', status: 'SCHEDULED', homeScore: null, awayScore: null },
      { round: 77, homeCode: 'CIV', awayCode: 'NOR', matchDate: '2026-06-30T17:00:00Z', venue: 'AT&T Stadium', city: 'Dallas', country: 'United States', status: 'SCHEDULED', homeScore: null, awayScore: null },
      { round: 78, homeCode: 'FRA', awayCode: 'SWE', matchDate: '2026-06-30T21:00:00Z', venue: 'MetLife Stadium', city: 'East Rutherford', country: 'United States', status: 'SCHEDULED', homeScore: null, awayScore: null },
      { round: 79, homeCode: 'MEX', awayCode: 'ECU', matchDate: '2026-07-01T01:00:00Z', venue: 'Estadio Azteca', city: 'Ciudad de México', country: 'Mexico', status: 'SCHEDULED', homeScore: null, awayScore: null },
      { round: 80, homeCode: 'ENG', awayCode: 'COD', matchDate: '2026-07-01T16:00:00Z', venue: 'Mercedes-Benz Stadium', city: 'Atlanta', country: 'United States', status: 'SCHEDULED', homeScore: null, awayScore: null },
      { round: 81, homeCode: 'BEL', awayCode: 'SEN', matchDate: '2026-07-01T20:00:00Z', venue: 'Lumen Field', city: 'Seattle', country: 'United States', status: 'SCHEDULED', homeScore: null, awayScore: null },
      { round: 82, homeCode: 'USA', awayCode: 'BIH', matchDate: '2026-07-02T00:00:00Z', venue: "Levi's Stadium", city: 'San Francisco', country: 'United States', status: 'SCHEDULED', homeScore: null, awayScore: null },
      { round: 83, homeCode: 'ESP', awayCode: 'AUT', matchDate: '2026-07-02T19:00:00Z', venue: 'SoFi Stadium', city: 'Los Angeles', country: 'United States', status: 'SCHEDULED', homeScore: null, awayScore: null },
      { round: 84, homeCode: 'POR', awayCode: 'CRO', matchDate: '2026-07-02T23:00:00Z', venue: 'BMO Field', city: 'Toronto', country: 'Canada', status: 'SCHEDULED', homeScore: null, awayScore: null },
      { round: 85, homeCode: 'SUI', awayCode: 'ALG', matchDate: '2026-07-03T03:00:00Z', venue: 'BC Place', city: 'Vancouver', country: 'Canada', status: 'SCHEDULED', homeScore: null, awayScore: null },
      { round: 86, homeCode: 'AUS', awayCode: 'EGY', matchDate: '2026-07-03T18:00:00Z', venue: 'AT&T Stadium', city: 'Dallas', country: 'United States', status: 'SCHEDULED', homeScore: null, awayScore: null },
      { round: 87, homeCode: 'ARG', awayCode: 'CPV', matchDate: '2026-07-03T22:00:00Z', venue: 'Hard Rock Stadium', city: 'Miami', country: 'United States', status: 'SCHEDULED', homeScore: null, awayScore: null },
      { round: 88, homeCode: 'COL', awayCode: 'GHA', matchDate: '2026-07-04T01:30:00Z', venue: 'Arrowhead Stadium', city: 'Kansas City', country: 'United States', status: 'SCHEDULED', homeScore: null, awayScore: null },
    ];

    const results: string[] = [];
    for (const m of R32_MATCHES) {
      const [homeTeam, awayTeam, match] = await Promise.all([
        prisma.team.findUnique({ where: { code: m.homeCode } }),
        prisma.team.findUnique({ where: { code: m.awayCode } }),
        prisma.match.findFirst({ where: { stage: 'ROUND_OF_32', round: m.round } }),
      ]);
      if (!homeTeam || !awayTeam || !match) {
        results.push(`SKIP round ${m.round}: team or match not found`);
        continue;
      }
      await prisma.match.update({
        where: { id: match.id },
        data: {
          homeTeamId: homeTeam.id,
          awayTeamId: awayTeam.id,
          homeLabel: homeTeam.code,
          awayLabel: awayTeam.code,
          matchDate: new Date(m.matchDate),
          venue: m.venue,
          city: m.city,
          country: m.country,
          status: m.status as any,
          homeScore: m.homeScore,
          awayScore: m.awayScore,
        },
      });
      results.push(`OK round ${m.round}: ${homeTeam.name} vs ${awayTeam.name}`);
    }
    res.json({ success: true, results });
  }

  // Fix knockout round team assignments when bracket propagation placed wrong teams
  // Body: { matches: [{ round, homeCode, awayCode, matchDate? }], stage? }
  static async fixKnockoutTeams(req: Request, res: Response): Promise<void> {
    const { matches, stage: matchStage = 'ROUND_OF_16' } = req.body as {
      matches: { round: number; homeCode: string; awayCode: string; matchDate?: string }[];
      stage?: string;
    };
    if (!Array.isArray(matches) || matches.length === 0) {
      res.status(400).json({ success: false, error: 'matches array required' });
      return;
    }

    const results: string[] = [];
    for (const m of matches) {
      const [homeTeam, awayTeam, match] = await Promise.all([
        prisma.team.findUnique({ where: { code: m.homeCode.toUpperCase() } }),
        prisma.team.findUnique({ where: { code: m.awayCode.toUpperCase() } }),
        prisma.match.findFirst({ where: { round: m.round } }),
      ]);
      if (!homeTeam || !awayTeam) {
        results.push(`SKIP R${m.round}: team not found (${m.homeCode}, ${m.awayCode})`);
        continue;
      }
      if (!match) {
        results.push(`SKIP R${m.round}: match not found in DB`);
        continue;
      }
      const updateData: Record<string, unknown> = {
        homeTeamId: homeTeam.id,
        awayTeamId: awayTeam.id,
        homeLabel: homeTeam.code,
        awayLabel: awayTeam.code,
        stage: matchStage,
      };
      if (m.matchDate) updateData.matchDate = new Date(m.matchDate);
      await prisma.match.update({ where: { id: match.id }, data: updateData });
      await cache.delPattern(`match:${match.id}*`);

      let deletedMsg = '';
      if (matchStage === 'ROUND_OF_16') {
        // Delete ESPN-synced duplicates with same teams but no round number
        const deleted = await prisma.match.deleteMany({
          where: {
            round: null,
            homeTeamId: homeTeam.id,
            awayTeamId: awayTeam.id,
            id: { not: match.id },
          },
        });
        if (deleted.count > 0) deletedMsg = ` (borró ${deleted.count} duplicado/s)`;
      }
      results.push(`OK R${m.round}: ${homeTeam.name} vs ${awayTeam.name}${deletedMsg}`);
    }

    // Invalidate bracket cache
    await cache.delPattern('tournament:*');
    res.json({ success: true, results });
  }

  // Bulk-update match scores by round number (for correcting ESPN sync errors)
  // Body: { matches: [{ round, homeScore, awayScore, homePenalties?, awayPenalties? }] }
  static async fixMatchScores(req: Request, res: Response): Promise<void> {
    const { matches } = req.body as {
      matches: { round: number; homeScore: number; awayScore: number; homePenalties?: number | null; awayPenalties?: number | null }[];
    };
    if (!Array.isArray(matches) || matches.length === 0) {
      res.status(400).json({ success: false, error: 'matches array required' });
      return;
    }

    const results: string[] = [];
    for (const m of matches) {
      const match = await prisma.match.findFirst({ where: { round: m.round } });
      if (!match) {
        results.push(`SKIP R${m.round}: match not found`);
        continue;
      }
      await prisma.match.update({
        where: { id: match.id },
        data: {
          homeScore: m.homeScore,
          awayScore: m.awayScore,
          homePenalties: m.homePenalties ?? null,
          awayPenalties: m.awayPenalties ?? null,
          status: 'FINISHED',
        },
      });
      await cache.delPattern(`match:${match.id}*`);
      // Propagate winner to next round (fixes QF teams after R16 scores are corrected)
      await BracketService.propagateWinner(match.id).catch(() => {});
      const penStr = m.homePenalties != null ? ` (pen ${m.homePenalties}-${m.awayPenalties})` : '';
      results.push(`OK R${m.round}: ${m.homeScore}-${m.awayScore}${penStr}`);
    }

    await cache.delPattern('tournament:*');
    res.json({ success: true, results });
  }

  // Update matchDate/venue/city. Supports lookup by team codes (any home/away order) OR by round number.
  // Body: { matches: [{homeCode?, awayCode?, round?, matchDate, venue?, city?}] }
  static async fixMatchDates(req: Request, res: Response): Promise<void> {
    const { matches } = req.body as {
      matches: { round?: number; homeCode?: string; awayCode?: string; matchDate: string; venue?: string; city?: string }[];
    };
    if (!Array.isArray(matches) || matches.length === 0) {
      res.status(400).json({ success: false, error: 'matches array required' });
      return;
    }

    const results: string[] = [];
    for (const m of matches) {
      let match = null;
      let label = '';

      if (m.homeCode && m.awayCode) {
        const [homeTeam, awayTeam] = await Promise.all([
          prisma.team.findUnique({ where: { code: m.homeCode.toUpperCase() } }),
          prisma.team.findUnique({ where: { code: m.awayCode.toUpperCase() } }),
        ]);
        if (!homeTeam || !awayTeam) {
          results.push(`SKIP: team not found (${m.homeCode}, ${m.awayCode})`);
          continue;
        }
        match = await prisma.match.findFirst({
          where: {
            OR: [
              { homeTeamId: homeTeam.id, awayTeamId: awayTeam.id },
              { homeTeamId: awayTeam.id, awayTeamId: homeTeam.id },
            ],
          },
        });
        label = `${homeTeam.code} vs ${awayTeam.code}`;
      } else if (m.round != null) {
        match = await prisma.match.findFirst({ where: { round: m.round } });
        label = `R${m.round}`;
      }

      if (!match) {
        results.push(`SKIP: match not found (${label || JSON.stringify(m)})`);
        continue;
      }

      const data: Record<string, unknown> = { matchDate: new Date(m.matchDate) };
      if (m.venue) data.venue = m.venue;
      if (m.city) data.city = m.city;
      await prisma.match.update({ where: { id: match.id }, data });
      await cache.delPattern(`match:${match.id}*`);
      results.push(`OK: ${label} → ${m.matchDate}`);
    }

    await cache.delPattern('tournament:*');
    res.json({ success: true, results });
  }

  // Crea/actualiza los torneos de ligas para la temporada 2026/27
  static async seedLeagues2026(req: Request, res: Response): Promise<void> {
    const leagues = [
      {
        name: 'Torneo Clausura 2026',
        shortName: 'Clausura 2026',
        year: 2026,
        type: 'LIGA_ARG' as const,
        startDate: new Date('2026-07-23'),
        endDate: new Date('2026-12-15'),
        hostCountries: ['Argentina'],
        isActive: true,
        isFeatured: true,
      },
      {
        name: 'La Liga 2026/27',
        shortName: 'La Liga',
        year: 2026,
        type: 'LA_LIGA' as const,
        startDate: new Date('2026-08-15'),
        endDate: new Date('2027-05-31'),
        hostCountries: ['Spain'],
        isActive: false,
        isFeatured: true,
      },
      {
        name: 'Premier League 2026/27',
        shortName: 'Premier League',
        year: 2026,
        type: 'PREMIER_LEAGUE' as const,
        startDate: new Date('2026-08-15'),
        endDate: new Date('2027-05-31'),
        hostCountries: ['England'],
        isActive: false,
        isFeatured: true,
      },
      {
        name: 'Ligue 1 2026/27',
        shortName: 'Ligue 1',
        year: 2026,
        type: 'LIGUE_1' as const,
        startDate: new Date('2026-08-15'),
        endDate: new Date('2027-05-25'),
        hostCountries: ['France'],
        isActive: false,
        isFeatured: true,
      },
      {
        name: 'Bundesliga 2026/27',
        shortName: 'Bundesliga',
        year: 2026,
        type: 'BUNDESLIGA' as const,
        startDate: new Date('2026-08-22'),
        endDate: new Date('2027-05-15'),
        hostCountries: ['Germany'],
        isActive: false,
        isFeatured: true,
      },
      {
        name: 'Serie A 2026/27',
        shortName: 'Serie A',
        year: 2026,
        type: 'SERIE_A' as const,
        startDate: new Date('2026-08-23'),
        endDate: new Date('2027-05-31'),
        hostCountries: ['Italy'],
        isActive: false,
        isFeatured: true,
      },
    ];

    const results: string[] = [];
    for (const league of leagues) {
      const { type, year, ...rest } = league;
      await prisma.tournament.upsert({
        where: { type_year: { type, year } },
        update: { isActive: rest.isActive, isFeatured: rest.isFeatured, endDate: rest.endDate },
        create: { type, year, ...rest },
      });
      results.push(`OK: ${league.name}`);
    }

    await cache.delPattern('tournament:*');
    res.json({ success: true, results });
  }
}
