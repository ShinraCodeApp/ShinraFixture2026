import { MatchStatus } from '@prisma/client';
import { prisma } from '../config/database';
import { CacheService } from '../config/redis';

const cache = new CacheService();

// Source round → next round slot
// Home/away assigned to match the visual OUTER_R32 circular order:
// OUTER_R32 = [76,75, 77,78, 79,80, 85,86, 88,87, 84,83, 82,81, 74,73]
// Each pair (2k, 2k+1) feeds one R16 match; 2k = home side, 2k+1 = away side.
const BRACKET_MAP: Record<number, { nextRound: number; slot: 'home' | 'away' }> = {
  // Pair 0: R76(home) + R75(away) → R90
  76: { nextRound: 90, slot: 'home' },  75: { nextRound: 90, slot: 'away' },
  // Pair 1: R77(home) + R78(away) → R91
  77: { nextRound: 91, slot: 'home' },  78: { nextRound: 91, slot: 'away' },
  // Pair 2: R79(home) + R80(away) → R92
  79: { nextRound: 92, slot: 'home' },  80: { nextRound: 92, slot: 'away' },
  // Pair 3: R85(home) + R86(away) → R95
  85: { nextRound: 95, slot: 'home' },  86: { nextRound: 95, slot: 'away' },
  // Pair 4: R88(home) + R87(away) → R96
  88: { nextRound: 96, slot: 'home' },  87: { nextRound: 96, slot: 'away' },
  // Pair 5: R84(home) + R83(away) → R94
  84: { nextRound: 94, slot: 'home' },  83: { nextRound: 94, slot: 'away' },
  // Pair 6: R82(home) + R81(away) → R93
  82: { nextRound: 93, slot: 'home' },  81: { nextRound: 93, slot: 'away' },
  // Pair 7: R74(home) + R73(away) → R89
  74: { nextRound: 89, slot: 'home' },  73: { nextRound: 89, slot: 'away' },
  // R16 → QF
  89: { nextRound: 97, slot: 'home' },  90: { nextRound: 97, slot: 'away' },
  91: { nextRound: 98, slot: 'home' },  92: { nextRound: 98, slot: 'away' },
  93: { nextRound: 99, slot: 'home' },  94: { nextRound: 99, slot: 'away' },
  95: { nextRound: 100, slot: 'home' }, 96: { nextRound: 100, slot: 'away' },
  // QF → SF
  97: { nextRound: 101, slot: 'home' }, 98: { nextRound: 101, slot: 'away' },
  99: { nextRound: 102, slot: 'home' }, 100: { nextRound: 102, slot: 'away' },
  // SF → Final
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
