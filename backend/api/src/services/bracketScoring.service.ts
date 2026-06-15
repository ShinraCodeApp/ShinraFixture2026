import { prisma } from '../config/database';
import { logger } from '../utils/logger';

// Points awarded per correct pick
const POINTS = { quarters: 2, semis: 3, finalists: 5, champion: 10 };

// Map DB stage → bracket pick key
const STAGE_TO_KEY: Record<string, 'quarters' | 'semis' | 'finalists' | 'champion'> = {
  QUARTER_FINAL: 'quarters',
  SEMI_FINAL:    'semis',
  FINAL:         'finalists', // Both finalists come from the final match
};

export class BracketScoringService {
  static async scoreTournament(tournamentId: string): Promise<{ scored: number }> {
    // Get all resolved knockout matches for this tournament
    const knockoutMatches = await prisma.match.findMany({
      where: {
        tournamentId,
        stage: { in: ['QUARTER_FINAL', 'SEMI_FINAL', 'FINAL'] },
        status: 'FINISHED',
      },
      include: {
        homeTeam: { select: { code: true } },
        awayTeam: { select: { code: true } },
      },
    });

    if (!knockoutMatches.length) return { scored: 0 };

    // Build sets of teams that actually appeared in each round
    const actualQF = new Set<string>();
    const actualSF = new Set<string>();
    const actualFinalists = new Set<string>();
    let actualChampion: string | null = null;

    for (const m of knockoutMatches) {
      const home = m.homeTeam?.code;
      const away = m.awayTeam?.code;
      if (!home || !away) continue;

      if (m.stage === 'QUARTER_FINAL') {
        actualQF.add(home);
        actualQF.add(away);
      } else if (m.stage === 'SEMI_FINAL') {
        actualSF.add(home);
        actualSF.add(away);
      } else if (m.stage === 'FINAL') {
        actualFinalists.add(home);
        actualFinalists.add(away);
        // Determine champion
        if (m.homeScore !== null && m.awayScore !== null) {
          if (m.homeScore > m.awayScore) actualChampion = home;
          else if (m.awayScore > m.homeScore) actualChampion = away;
          // Penalties: check homePenalties / awayPenalties
        }
        // Handle penalties
        if (!actualChampion && m.homePenalties !== null && m.awayPenalties !== null) {
          actualChampion = (m.homePenalties ?? 0) > (m.awayPenalties ?? 0) ? home : away;
        }
      }
    }

    // Get all unresolved bracket picks for this tournament
    const picks = await prisma.bracketPick.findMany({
      where: { tournamentId, isResolved: false },
    });

    if (!picks.length) return { scored: 0 };

    let scored = 0;

    for (const pick of picks) {
      const p = pick.picks as any;
      if (!p || typeof p !== 'object') continue;

      let pts = 0;

      // Score quarters (teams that appeared in QF)
      if (actualQF.size === 8 && Array.isArray(p.quarters)) {
        for (const code of p.quarters) {
          if (actualQF.has(code)) pts += POINTS.quarters;
        }
      }

      // Score semis
      if (actualSF.size === 4 && Array.isArray(p.semis)) {
        for (const code of p.semis) {
          if (actualSF.has(code)) pts += POINTS.semis;
        }
      }

      // Score finalists
      if (actualFinalists.size === 2 && Array.isArray(p.finalists)) {
        for (const code of p.finalists) {
          if (actualFinalists.has(code)) pts += POINTS.finalists;
        }
      }

      // Score champion
      if (actualChampion && p.champion === actualChampion) {
        pts += POINTS.champion;
      }

      // Only resolve if all applicable rounds are done
      const allDone = actualChampion !== null; // Final finished = everything done
      const partialDone = actualQF.size === 8 || actualSF.size === 4 || actualFinalists.size === 2;

      if (pts > 0 || allDone || partialDone) {
        await prisma.bracketPick.update({
          where: { id: pick.id },
          data: { points: pts, isResolved: allDone },
        });

        // Increment user points only once: when resolving AND pick hadn't been resolved yet
        if (allDone && !pick.isResolved && pts > 0) {
          await prisma.user.update({
            where: { id: pick.userId },
            data: { predictionPoints: { increment: pts } },
          });
        }

        scored++;
      }
    }

    logger.info(`Bracket scoring: ${scored} picks updated for tournament ${tournamentId}`);
    return { scored };
  }

  static async scoreAllActiveTournaments(): Promise<void> {
    const tournaments = await prisma.tournament.findMany({
      where: { isActive: true },
      select: { id: true },
    });

    for (const t of tournaments) {
      try {
        await this.scoreTournament(t.id);
      } catch (err) {
        logger.warn(`Bracket scoring failed for tournament ${t.id}:`, err);
      }
    }
  }
}
