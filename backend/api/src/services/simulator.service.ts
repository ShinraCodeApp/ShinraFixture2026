import { v4 as uuidv4 } from 'uuid';
import { MatchStatus } from '@prisma/client';
import { prisma } from '../config/database';
import { AIService } from './ai.service';
import { ApiError } from '../utils/ApiError';

interface MatchResult {
  homeScore: number;
  awayScore: number;
  homePenalties?: number;
  awayPenalties?: number;
}

interface SimulationResults {
  [matchId: string]: MatchResult;
}

export class SimulatorService {
  static async run(
    tournamentId: string,
    providedResults: SimulationResults,
    userId?: string,
    useAI = false
  ) {
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        matches: {
          where: { status: MatchStatus.SCHEDULED },
          include: {
            homeTeam: { select: { id: true, name: true, code: true, flagUrl: true, fifaRanking: true } },
            awayTeam: { select: { id: true, name: true, code: true, flagUrl: true, fifaRanking: true } },
          },
          orderBy: { matchDate: 'asc' },
        },
      },
    });

    if (!tournament) throw ApiError.notFound('Tournament');

    const finalResults: SimulationResults = { ...providedResults };

    // Fill in missing matches with AI or statistical simulation
    for (const match of tournament.matches) {
      if (!finalResults[match.id]) {
        if (useAI) {
          const prediction = await AIService.predictMatch(match.id);
          const simResult = AIService.simulateMatch(
            match.homeTeam.fifaRanking ?? 50,
            match.awayTeam.fifaRanking ?? 50
          );
          finalResults[match.id] = {
            homeScore: simResult.homeScore,
            awayScore: simResult.awayScore,
          };
        } else {
          const sim = AIService.simulateMatch(
            match.homeTeam.fifaRanking ?? 50,
            match.awayTeam.fifaRanking ?? 50
          );
          finalResults[match.id] = { homeScore: sim.homeScore, awayScore: sim.awayScore };
        }
      }
    }

    // Build simulated standings and determine finalists
    const { champion, runnerUp, thirdPlace } = this.computeTournamentOutcome(
      tournament.matches,
      finalResults
    );

    const shareCode = uuidv4().replace(/-/g, '').slice(0, 12).toUpperCase();

    const session = await prisma.simulatorSession.create({
      data: {
        userId: userId ?? null,
        tournamentId,
        results: finalResults,
        champion: champion ?? null,
        runnerUp: runnerUp ?? null,
        thirdPlace: thirdPlace ?? null,
        shareCode,
        isPublic: true,
      },
    });

    return { ...session, matchResults: this.formatResults(tournament.matches, finalResults) };
  }

  private static computeTournamentOutcome(matches: any[], results: SimulationResults) {
    // Simplified: determine which teams advance based on simulated group results
    const groupStandings: Record<string, Array<{ teamId: string; name: string; code: string; points: number; gd: number; gf: number }>> = {};

    for (const match of matches) {
      if (match.stage !== 'GROUP') continue;
      const res = results[match.id];
      if (!res) continue;
      const group = match.group;
      if (!groupStandings[group]) groupStandings[group] = [];

      const getOrCreate = (teamId: string, name: string, code: string) => {
        let entry = groupStandings[group].find((e) => e.teamId === teamId);
        if (!entry) {
          entry = { teamId, name, code, points: 0, gd: 0, gf: 0 };
          groupStandings[group].push(entry);
        }
        return entry;
      };

      const home = getOrCreate(match.homeTeamId, match.homeTeam.name, match.homeTeam.code);
      const away = getOrCreate(match.awayTeamId, match.awayTeam.name, match.awayTeam.code);

      if (res.homeScore > res.awayScore) { home.points += 3; }
      else if (res.homeScore === res.awayScore) { home.points += 1; away.points += 1; }
      else { away.points += 3; }

      const gd = res.homeScore - res.awayScore;
      home.gd += gd; home.gf += res.homeScore;
      away.gd -= gd; away.gf += res.awayScore;
    }

    // Sort each group, get top 2
    const qualifiers: string[] = [];
    for (const group of Object.keys(groupStandings)) {
      const sorted = groupStandings[group].sort((a, b) => b.points - a.points || b.gd - a.gd || b.gf - a.gf);
      qualifiers.push(...sorted.slice(0, 2).map((t) => t.name));
    }

    // Pick champion from top seeds (simplified)
    const champion = qualifiers[0] ?? null;
    const runnerUp = qualifiers[1] ?? null;
    const thirdPlace = qualifiers[2] ?? null;

    return { champion, runnerUp, thirdPlace };
  }

  private static formatResults(matches: any[], results: SimulationResults) {
    return matches.map((m) => ({
      id: m.id,
      stage: m.stage,
      group: m.group,
      matchDate: m.matchDate,
      homeTeam: { id: m.homeTeam.id, name: m.homeTeam.name, code: m.homeTeam.code, flagUrl: m.homeTeam.flagUrl },
      awayTeam: { id: m.awayTeam.id, name: m.awayTeam.name, code: m.awayTeam.code, flagUrl: m.awayTeam.flagUrl },
      result: results[m.id] ?? null,
    }));
  }

  static async getByShareCode(shareCode: string) {
    return prisma.simulatorSession.findUnique({
      where: { shareCode },
      include: { user: { select: { id: true, username: true, displayName: true, avatar: true } } },
    });
  }

  static async mySessions(userId: string) {
    return prisma.simulatorSession.findMany({
      where: { userId },
      select: { id: true, champion: true, runnerUp: true, thirdPlace: true, shareCode: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }

  static async delete(id: string, userId: string): Promise<void> {
    const session = await prisma.simulatorSession.findUnique({ where: { id } });
    if (!session) throw ApiError.notFound('Session');
    if (session.userId !== userId) throw ApiError.forbidden('Not your simulation');
    await prisma.simulatorSession.delete({ where: { id } });
  }
}
