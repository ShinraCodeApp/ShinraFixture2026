import { Prisma, PlayerPosition } from '@prisma/client';
import { prisma } from '../config/database';
import { CacheService } from '../config/redis';

const cache = new CacheService(600);

const playerSelect = {
  id: true, name: true, shortName: true, position: true,
  number: true, photoUrl: true, club: true, clubCountry: true,
  birthDate: true, nationality: true, height: true, weight: true,
  isActive: true,
  team: { select: { id: true, name: true, code: true, flagUrl: true } },
} satisfies Prisma.PlayerSelect;

interface ListParams {
  teamId?: string;
  position?: string;
  search?: string;
  page: number;
  limit: number;
}

export class PlayerService {
  static async list(params: ListParams) {
    const where: Prisma.PlayerWhereInput = { isActive: true };
    if (params.teamId) where.teamId = params.teamId;
    if (params.position) where.position = params.position as PlayerPosition;
    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { club: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const skip = (params.page - 1) * params.limit;
    const [items, total] = await Promise.all([
      prisma.player.findMany({
        where,
        select: playerSelect,
        orderBy: [{ position: 'asc' }, { name: 'asc' }],
        skip,
        take: params.limit,
      }),
      prisma.player.count({ where }),
    ]);

    return { items, pagination: { page: params.page, limit: params.limit, total, pages: Math.ceil(total / params.limit) } };
  }

  static async getTopScorers(tournamentId?: string, limit = 20) {
    const cacheKey = `topscorers:${tournamentId ?? 'all'}:${limit}`;
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    const where: Prisma.PlayerTournamentStatsWhereInput = {};
    if (tournamentId) where.tournamentId = tournamentId;

    const stats = await prisma.playerTournamentStats.findMany({
      where,
      include: {
        player: {
          select: {
            id: true, name: true, shortName: true, photoUrl: true, position: true,
            team: { select: { id: true, name: true, code: true, flagUrl: true } },
          },
        },
      },
      orderBy: [{ goals: 'desc' }, { assists: 'desc' }, { matchesPlayed: 'asc' }],
      take: limit,
    });

    await cache.set(cacheKey, stats, 300);
    return stats;
  }

  static async getTopAssists(tournamentId?: string, limit = 20) {
    const cacheKey = `topassists:${tournamentId ?? 'all'}:${limit}`;
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    const where: Prisma.PlayerTournamentStatsWhereInput = {};
    if (tournamentId) where.tournamentId = tournamentId;

    const stats = await prisma.playerTournamentStats.findMany({
      where,
      include: {
        player: {
          select: {
            id: true, name: true, shortName: true, photoUrl: true,
            team: { select: { id: true, name: true, code: true, flagUrl: true } },
          },
        },
      },
      orderBy: [{ assists: 'desc' }, { goals: 'desc' }],
      take: limit,
    });

    await cache.set(cacheKey, stats, 300);
    return stats;
  }

  static async getTopRated(tournamentId?: string, limit = 20) {
    const where: Prisma.PlayerTournamentStatsWhereInput = { avgRating: { not: null } };
    if (tournamentId) where.tournamentId = tournamentId;

    return prisma.playerTournamentStats.findMany({
      where,
      include: {
        player: {
          select: {
            id: true, name: true, shortName: true, photoUrl: true,
            team: { select: { id: true, name: true, code: true, flagUrl: true } },
          },
        },
      },
      orderBy: { avgRating: 'desc' },
      take: limit,
    });
  }

  static async getById(id: string) {
    const cacheKey = `player:${id}`;
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    const player = await prisma.player.findUnique({
      where: { id },
      include: {
        team: { select: { id: true, name: true, code: true, flagUrl: true, shieldUrl: true } },
        stats: {
          orderBy: { tournamentId: 'desc' },
          take: 3,
        },
      },
    });

    if (player) await cache.set(cacheKey, player, 600);
    return player;
  }

  static async getStats(playerId: string, tournamentId?: string) {
    const where: Prisma.PlayerTournamentStatsWhereInput = { playerId };
    if (tournamentId) where.tournamentId = tournamentId;
    return prisma.playerTournamentStats.findFirst({ where, orderBy: { matchesPlayed: 'desc' } });
  }

  static async getMatches(playerId: string) {
    return prisma.playerMatchStats.findMany({
      where: { playerId },
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
      take: 20,
    });
  }
}
