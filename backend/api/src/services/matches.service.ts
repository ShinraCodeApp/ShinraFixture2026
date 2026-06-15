import { MatchStatus, MatchStage, Prisma } from '@prisma/client';
import dayjs from 'dayjs';
import { prisma } from '../config/database';
import { CacheService } from '../config/redis';
import { ApiError } from '../utils/ApiError';

const cache = new CacheService(300); // 5 min default

const matchSelect = {
  id: true,
  homeTeamId: true,
  awayTeamId: true,
  homeScore: true,
  awayScore: true,
  homeScoreHT: true,
  awayScoreHT: true,
  homePenalties: true,
  awayPenalties: true,
  stage: true,
  group: true,
  round: true,
  matchDate: true,
  venue: true,
  city: true,
  status: true,
  minute: true,
  homeWinProb: true,
  drawProb: true,
  awayWinProb: true,
  homeTeam: {
    select: { id: true, name: true, shortName: true, code: true, flagUrl: true, shieldUrl: true },
  },
  awayTeam: {
    select: { id: true, name: true, shortName: true, code: true, flagUrl: true, shieldUrl: true },
  },
  tournament: {
    select: { id: true, name: true, year: true, logo: true },
  },
} satisfies Prisma.MatchSelect;

interface ListParams {
  tournamentId?: string;
  group?: string;
  stage?: string;
  status?: string;
  date?: string;
  teamId?: string;
  page: number;
  limit: number;
  userId?: string;
}

export class MatchService {
  static async list(params: ListParams) {
    const { tournamentId, group, stage, status, date, teamId, page, limit, userId } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.MatchWhereInput = {};
    if (tournamentId) where.tournamentId = tournamentId;
    if (group) where.group = group;
    if (stage) where.stage = stage as MatchStage;
    if (status) where.status = status as MatchStatus;
    if (teamId) where.OR = [{ homeTeamId: teamId }, { awayTeamId: teamId }];

    if (date) {
      const d = dayjs(date);
      where.matchDate = {
        gte: d.startOf('day').toDate(),
        lte: d.endOf('day').toDate(),
      };
    }

    const [matches, total] = await Promise.all([
      prisma.match.findMany({
        where,
        select: matchSelect,
        orderBy: [{ matchDate: 'asc' }, { group: 'asc' }],
        skip,
        take: limit,
      }),
      prisma.match.count({ where }),
    ]);

    // If user is authenticated, attach their prediction
    let matchesWithPredictions = matches;
    if (userId) {
      const ids = matches.map((m) => m.id);
      const predictions = await prisma.prediction.findMany({
        where: { userId, matchId: { in: ids } },
        select: { matchId: true, homeScore: true, awayScore: true, status: true, pointsEarned: true },
      });
      const predMap = new Map(predictions.map((p) => [p.matchId, p]));
      matchesWithPredictions = matches.map((m) => ({ ...m, userPrediction: predMap.get(m.id) ?? null }));
    }

    return {
      items: matchesWithPredictions,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  static async getLive() {
    const cacheKey = 'matches:live';
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    const matches = await prisma.match.findMany({
      where: { status: MatchStatus.LIVE },
      select: {
        ...matchSelect,
        events: {
          orderBy: { minute: 'desc' },
          take: 5,
          select: { id: true, minute: true, type: true, teamId: true, description: true },
        },
      },
      orderBy: { matchDate: 'asc' },
    });

    await cache.set(cacheKey, matches, 30); // 30 seconds for live data
    return matches;
  }

  static async getToday() {
    const cacheKey = 'matches:today';
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    const today = dayjs();
    const matches = await prisma.match.findMany({
      where: {
        matchDate: {
          gte: today.startOf('day').toDate(),
          lte: today.endOf('day').toDate(),
        },
      },
      select: matchSelect,
      orderBy: { matchDate: 'asc' },
    });

    await cache.set(cacheKey, matches, 60);
    return matches;
  }

  static async getUpcoming(days = 7) {
    const cacheKey = `matches:upcoming:${days}`;
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    const now = new Date();
    const future = dayjs().add(days, 'day').endOf('day').toDate();

    const matches = await prisma.match.findMany({
      where: {
        matchDate: { gte: now, lte: future },
        status: MatchStatus.SCHEDULED,
      },
      select: matchSelect,
      orderBy: { matchDate: 'asc' },
    });

    await cache.set(cacheKey, matches, 300);
    return matches;
  }

  static async getByStage(stage: string, tournamentId?: string, tournamentType?: string) {
    const where: Prisma.MatchWhereInput = { stage: stage as MatchStage };
    if (tournamentId) where.tournamentId = tournamentId;
    if (tournamentType) where.tournament = { type: tournamentType as any };

    return prisma.match.findMany({
      where,
      select: matchSelect,
      orderBy: { matchDate: 'asc' },
    });
  }

  static async getByGroup(group: string, tournamentId?: string) {
    const where: Prisma.MatchWhereInput = { group: group.toUpperCase() };
    if (tournamentId) where.tournamentId = tournamentId;

    return prisma.match.findMany({
      where,
      select: matchSelect,
      orderBy: { matchDate: 'asc' },
    });
  }

  static async getById(id: string, userId?: string) {
    const cacheKey = `match:${id}`;
    const cached = await cache.get(cacheKey);

    const match = cached ?? await prisma.match.findUnique({
      where: { id },
      select: {
        ...matchSelect,
        homeScoreHT: true,
        awayScoreHT: true,
        homeExtraTime: true,
        awayExtraTime: true,
        referee: true,
        attendance: true,
        country: true,
        aiAnalysis: true,
        stats: true,
        events: {
          orderBy: { minute: 'asc' },
          include: {
            scorer: { select: { id: true, name: true, photoUrl: true } },
            assist: { select: { id: true, name: true, photoUrl: true } },
            cardReceiver: { select: { id: true, name: true, photoUrl: true } },
            playerIn: { select: { id: true, name: true, photoUrl: true } },
            playerOut: { select: { id: true, name: true, photoUrl: true } },
          },
        },
      },
    });

    if (!match) return null;
    if (!cached) await cache.set(cacheKey, match, 60);

    if (userId) {
      const prediction = await prisma.prediction.findUnique({
        where: { userId_matchId: { userId, matchId: id } },
        select: { homeScore: true, awayScore: true, status: true, pointsEarned: true },
      });
      return { ...match, userPrediction: prediction };
    }

    return match;
  }

  static async getEvents(matchId: string) {
    return prisma.matchEvent.findMany({
      where: { matchId },
      orderBy: { minute: 'asc' },
      include: {
        scorer: { select: { id: true, name: true, shortName: true, photoUrl: true } },
        assist: { select: { id: true, name: true, photoUrl: true } },
        cardReceiver: { select: { id: true, name: true, photoUrl: true } },
        playerIn: { select: { id: true, name: true, photoUrl: true } },
        playerOut: { select: { id: true, name: true, photoUrl: true } },
      },
    });
  }

  static async getStats(matchId: string) {
    return prisma.matchStats.findUnique({ where: { matchId } });
  }

  static async getLineups(matchId: string) {
    return prisma.playerMatchStats.findMany({
      where: { matchId },
      include: {
        match: {
          select: {
            homeTeamId: true,
            awayTeamId: true,
          },
        },
      },
    });
  }

  static async getHeadToHead(matchId: string) {
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      select: { homeTeamId: true, awayTeamId: true },
    });
    if (!match) throw ApiError.notFound('Match');

    const h2h = await prisma.match.findMany({
      where: {
        status: MatchStatus.FINISHED,
        OR: [
          { homeTeamId: match.homeTeamId, awayTeamId: match.awayTeamId },
          { homeTeamId: match.awayTeamId, awayTeamId: match.homeTeamId },
        ],
        NOT: { id: matchId },
      },
      select: {
        ...matchSelect,
        homeScore: true,
        awayScore: true,
      },
      orderBy: { matchDate: 'desc' },
      take: 10,
    });

    return h2h;
  }

  static async getComments(matchId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [comments, total] = await Promise.all([
      prisma.comment.findMany({
        where: { matchId, parentId: null, isDeleted: false },
        include: {
          user: { select: { id: true, username: true, displayName: true, avatar: true, level: true } },
          replies: {
            where: { isDeleted: false },
            include: { user: { select: { id: true, username: true, displayName: true, avatar: true } } },
            take: 3,
            orderBy: { createdAt: 'asc' },
          },
          _count: { select: { reactions: true, replies: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.comment.count({ where: { matchId, parentId: null, isDeleted: false } }),
    ]);

    return { items: comments, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
  }

  static async addComment(matchId: string, userId: string, content: string, parentId?: string) {
    if (!content?.trim()) throw ApiError.badRequest('Comment cannot be empty');
    if (content.length > 500) throw ApiError.badRequest('Comment too long');

    const match = await prisma.match.findUnique({ where: { id: matchId }, select: { id: true } });
    if (!match) throw ApiError.notFound('Match');

    return prisma.comment.create({
      data: { matchId, userId, content: content.trim(), parentId },
      include: {
        user: { select: { id: true, username: true, displayName: true, avatar: true, level: true } },
      },
    });
  }
}
