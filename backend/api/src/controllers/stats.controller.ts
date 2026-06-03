import { Request, Response } from 'express';
import { PlayerService } from '../services/players.service';
import { prisma } from '../config/database';
import { CacheService } from '../config/redis';

const cache = new CacheService(300);

export class StatsController {
  static async topScorers(req: Request, res: Response): Promise<void> {
    const data = await PlayerService.getTopScorers(req.query.tournamentId as string, parseInt(req.query.limit as string ?? '20'));
    res.json({ success: true, data });
  }

  static async topAssists(req: Request, res: Response): Promise<void> {
    const data = await PlayerService.getTopAssists(req.query.tournamentId as string, parseInt(req.query.limit as string ?? '20'));
    res.json({ success: true, data });
  }

  static async topCards(req: Request, res: Response): Promise<void> {
    const { tournamentId, limit = '20' } = req.query;
    const where: any = {};
    if (tournamentId) where.tournamentId = tournamentId;

    const data = await prisma.playerTournamentStats.findMany({
      where,
      include: {
        player: {
          select: {
            id: true, name: true, photoUrl: true,
            team: { select: { id: true, name: true, code: true, flagUrl: true } },
          },
        },
      },
      orderBy: [{ yellowCards: 'desc' }, { redCards: 'desc' }],
      take: parseInt(limit as string),
    });
    res.json({ success: true, data });
  }

  static async teamStats(req: Request, res: Response): Promise<void> {
    const { tournamentId } = req.query;
    const cacheKey = `stats:teams:${tournamentId ?? 'all'}`;
    const cached = await cache.get(cacheKey);
    if (cached) { res.json({ success: true, data: cached }); return; }

    const where: any = {};
    if (tournamentId) where.tournamentId = tournamentId;

    const data = await prisma.teamTournamentStats.findMany({
      where,
      include: {
        team: { select: { id: true, name: true, shortName: true, code: true, flagUrl: true } },
      },
      orderBy: { goalsScored: 'desc' },
    });

    await cache.set(cacheKey, data, 300);
    res.json({ success: true, data });
  }

  static async matchStats(req: Request, res: Response): Promise<void> {
    const { matchId } = req.query;
    if (!matchId) { res.status(400).json({ success: false, message: 'matchId required' }); return; }

    const data = await prisma.matchStats.findUnique({ where: { matchId: matchId as string } });
    res.json({ success: true, data });
  }

  static async tournamentSummary(req: Request, res: Response): Promise<void> {
    const { tournamentId } = req.query;
    const cacheKey = `stats:summary:${tournamentId ?? 'all'}`;
    const cached = await cache.get(cacheKey);
    if (cached) { res.json({ success: true, data: cached }); return; }

    const where: any = {};
    if (tournamentId) where.tournamentId = tournamentId;

    const [totalGoals, totalMatches, avgGoals, totalCards] = await Promise.all([
      prisma.playerTournamentStats.aggregate({ where, _sum: { goals: true } }),
      prisma.match.count(tournamentId ? { where: { tournamentId: tournamentId as string } } : {}),
      prisma.matchStats.aggregate({ _avg: { homePossession: true } }),
      prisma.playerTournamentStats.aggregate({ where, _sum: { yellowCards: true, redCards: true } }),
    ]);

    const summary = {
      totalGoals: totalGoals._sum.goals ?? 0,
      totalMatches,
      goalsPerMatch: totalMatches ? ((totalGoals._sum.goals ?? 0) / totalMatches).toFixed(2) : 0,
      yellowCards: totalCards._sum.yellowCards ?? 0,
      redCards: totalCards._sum.redCards ?? 0,
    };

    await cache.set(cacheKey, summary, 300);
    res.json({ success: true, data: summary });
  }
}
