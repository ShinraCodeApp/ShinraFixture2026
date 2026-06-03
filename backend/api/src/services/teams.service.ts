import { Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import { CacheService } from '../config/redis';

const cache = new CacheService(600); // 10 min

export class TeamService {
  static async list(params: { region?: string; group?: string; tournamentId?: string; search?: string }) {
    const cacheKey = `teams:list:${JSON.stringify(params)}`;
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    const where: Prisma.TeamWhereInput = {};
    if (params.region) where.region = params.region as any;
    if (params.group) where.group = params.group.toUpperCase();
    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { shortName: { contains: params.search, mode: 'insensitive' } },
        { code: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const teams = await prisma.team.findMany({
      where,
      select: {
        id: true, name: true, shortName: true, code: true,
        flagUrl: true, shieldUrl: true, region: true,
        fifaRanking: true, group: true, isEliminated: true,
      },
      orderBy: [{ group: 'asc' }, { fifaRanking: 'asc' }],
    });

    await cache.set(cacheKey, teams, 600);
    return teams;
  }

  static async getStandings(tournamentId: string) {
    const cacheKey = `standings:${tournamentId}`;
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    const groupTeams = await prisma.tournamentGroupTeam.findMany({
      where: { group: { tournamentId } },
      include: {
        team: {
          select: { id: true, name: true, shortName: true, code: true, flagUrl: true },
        },
        group: { select: { letter: true, name: true } },
      },
      orderBy: [
        { group: { letter: 'asc' } },
        { points: 'desc' },
        { goalDifference: 'desc' },
        { goalsFor: 'desc' },
      ],
    });

    // Group by tournament group letter
    const standings = groupTeams.reduce<Record<string, typeof groupTeams>>((acc, item) => {
      const letter = item.group.letter;
      if (!acc[letter]) acc[letter] = [];
      acc[letter].push(item);
      return acc;
    }, {});

    await cache.set(cacheKey, standings, 120);
    return standings;
  }

  static async getByGroup(group: string, tournamentId?: string) {
    return prisma.team.findMany({
      where: { group: group.toUpperCase() },
      select: {
        id: true, name: true, shortName: true, code: true,
        flagUrl: true, shieldUrl: true, fifaRanking: true,
        groupParticipations: {
          where: tournamentId ? { group: { tournamentId } } : {},
          select: {
            played: true, won: true, drawn: true, lost: true,
            goalsFor: true, goalsAgainst: true, goalDifference: true,
            points: true, position: true, qualified: true,
          },
          take: 1,
        },
      },
      orderBy: { fifaRanking: 'asc' },
    });
  }

  static async getById(id: string) {
    const cacheKey = `team:${id}`;
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    const team = await prisma.team.findUnique({
      where: { id },
      include: {
        players: {
          select: {
            id: true, name: true, shortName: true, position: true,
            number: true, photoUrl: true, club: true, birthDate: true,
          },
          orderBy: [{ position: 'asc' }, { number: 'asc' }],
        },
        stats: true,
      },
    });

    if (team) await cache.set(cacheKey, team, 600);
    return team;
  }

  static async getPlayers(teamId: string) {
    return prisma.player.findMany({
      where: { teamId, isActive: true },
      select: {
        id: true, name: true, shortName: true, position: true,
        number: true, photoUrl: true, club: true, clubCountry: true,
        birthDate: true, height: true, weight: true, nationality: true,
      },
      orderBy: [{ position: 'asc' }, { number: 'asc' }],
    });
  }

  static async getMatches(teamId: string, tournamentId?: string) {
    const where: Prisma.MatchWhereInput = {
      OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }],
    };
    if (tournamentId) where.tournamentId = tournamentId;

    return prisma.match.findMany({
      where,
      select: {
        id: true, homeScore: true, awayScore: true, stage: true, group: true,
        matchDate: true, status: true, venue: true,
        homeTeam: { select: { id: true, name: true, code: true, flagUrl: true } },
        awayTeam: { select: { id: true, name: true, code: true, flagUrl: true } },
      },
      orderBy: { matchDate: 'desc' },
    });
  }

  static async getStats(teamId: string, tournamentId?: string) {
    const where: Prisma.TeamTournamentStatsWhereInput = { teamId };
    if (tournamentId) where.tournamentId = tournamentId;

    return prisma.teamTournamentStats.findFirst({ where });
  }
}
