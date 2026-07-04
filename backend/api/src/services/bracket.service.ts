import { MatchStatus } from '@prisma/client';
import { prisma } from '../config/database';
import { CacheService } from '../config/redis';

const cache = new CacheService();

// Source round → next round slot
const BRACKET_MAP: Record<number, { nextRound: number; slot: 'home' | 'away' }> = {
  73: { nextRound: 89, slot: 'home' },  74: { nextRound: 89, slot: 'away' },
  75: { nextRound: 90, slot: 'home' },  76: { nextRound: 90, slot: 'away' },
  77: { nextRound: 91, slot: 'home' },  78: { nextRound: 91, slot: 'away' },
  79: { nextRound: 92, slot: 'home' },  80: { nextRound: 92, slot: 'away' },
  81: { nextRound: 93, slot: 'home' },  82: { nextRound: 93, slot: 'away' },
  83: { nextRound: 94, slot: 'home' },  84: { nextRound: 94, slot: 'away' },
  85: { nextRound: 95, slot: 'home' },  86: { nextRound: 95, slot: 'away' },
  87: { nextRound: 96, slot: 'home' },  88: { nextRound: 96, slot: 'away' },
  89: { nextRound: 97, slot: 'home' },  90: { nextRound: 97, slot: 'away' },
  91: { nextRound: 98, slot: 'home' },  92: { nextRound: 98, slot: 'away' },
  93: { nextRound: 99, slot: 'home' },  94: { nextRound: 99, slot: 'away' },
  95: { nextRound: 100, slot: 'home' }, 96: { nextRound: 100, slot: 'away' },
  97: { nextRound: 101, slot: 'home' }, 98: { nextRound: 101, slot: 'away' },
  99: { nextRound: 102, slot: 'home' }, 100: { nextRound: 102, slot: 'away' },
  101: { nextRound: 104, slot: 'home' }, 102: { nextRound: 104, slot: 'away' },
};

export class BracketService {
  static async propagateWinner(matchId: string): Promise<void> {
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      select: {
        round: true, homeTeamId: true, awayTeamId: true,
        homeScore: true, awayScore: true,
        homePenalties: true, awayPenalties: true, status: true,
      },
    });

    if (!match || match.status !== MatchStatus.FINISHED || match.round == null) return;

    const entry = BRACKET_MAP[match.round];
    if (!entry) return;

    let winnerId: string | null = null;
    if (match.homePenalties != null && match.awayPenalties != null) {
      winnerId = match.homePenalties > match.awayPenalties ? match.homeTeamId : match.awayTeamId;
    } else if (match.homeScore != null && match.awayScore != null) {
      if (match.homeScore > match.awayScore) winnerId = match.homeTeamId;
      else if (match.awayScore > match.homeScore) winnerId = match.awayTeamId;
    }

    if (!winnerId) return;

    const nextMatch = await prisma.match.findFirst({ where: { round: entry.nextRound }, select: { id: true } });
    if (!nextMatch) return;

    const updateData = entry.slot === 'home' ? { homeTeamId: winnerId } : { awayTeamId: winnerId };
    await prisma.match.update({ where: { id: nextMatch.id }, data: updateData });
    await cache.delPattern(`match:${nextMatch.id}*`);
  }
}
