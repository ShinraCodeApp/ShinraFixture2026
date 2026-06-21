import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { prisma } from '../config/database';
import { NotificationService } from '../services/notifications.service';
import { NotificationType } from '@prisma/client';

export const duelRoutes = Router();
duelRoutes.use(authenticate);

// Get my duels (pending + active)
duelRoutes.get('/', async (req: any, res) => {
  try {
    const userId = req.user.id;
    const duels = await prisma.matchDuel.findMany({
      where: {
        OR: [{ challengerId: userId }, { opponentId: userId }],
        status: { in: ['PENDING', 'ACCEPTED'] },
      },
      include: {
        match: {
          include: {
            homeTeam: { select: { name: true, code: true, flagUrl: true } },
            awayTeam: { select: { name: true, code: true, flagUrl: true } },
          },
        },
        challenger: { select: { id: true, displayName: true, username: true, avatar: true } },
        opponent:   { select: { id: true, displayName: true, username: true, avatar: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: duels });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Create a duel challenge
duelRoutes.post('/', async (req: any, res) => {
  try {
    const challengerId = req.user.id;
    const { matchId, opponentId, challengerPick, xpBet = 0 } = req.body;
    if (!matchId || !opponentId || !challengerPick)
      return res.status(400).json({ success: false, error: 'matchId, opponentId and challengerPick required' });
    if (challengerId === opponentId)
      return res.status(400).json({ success: false, error: 'Cannot duel yourself' });

    const betAmount = Math.max(0, parseInt(String(xpBet), 10) || 0);

    // Verify match is still scheduled
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: { homeTeam: { select: { name: true } }, awayTeam: { select: { name: true } } },
    });
    if (!match) return res.status(404).json({ success: false, error: 'Match not found' });
    if (match.status !== 'SCHEDULED')
      return res.status(400).json({ success: false, error: 'Match already started or finished' });

    // Check challenger has enough XP if betting
    if (betAmount > 0) {
      const challenger = await prisma.user.findUnique({ where: { id: challengerId }, select: { xp: true } });
      if (!challenger || challenger.xp < betAmount)
        return res.status(400).json({ success: false, error: `XP insuficiente. Tenés ${challenger?.xp ?? 0} XP` });

      await prisma.user.update({ where: { id: challengerId }, data: { xp: { decrement: betAmount } } });
    }

    const duel = await prisma.matchDuel.create({
      data: { matchId, challengerId, opponentId, challengerPick, xpBet: betAmount, status: 'PENDING' },
      include: {
        challenger: { select: { id: true, displayName: true, username: true, avatar: true } },
        opponent:   { select: { id: true, displayName: true, username: true, avatar: true } },
        match: { include: { homeTeam: { select: { name: true } }, awayTeam: { select: { name: true } } } },
      },
    });

    // Notify opponent
    const betMsg = betAmount > 0 ? ` · Apuesta: ${betAmount} XP` : '';
    NotificationService.sendPush([opponentId], {
      type: NotificationType.SYSTEM,
      title: `⚔️ Duelo de ${duel.challenger.displayName}`,
      body: `Te desafió en ${match.homeTeam?.name} vs ${match.awayTeam?.name}${betMsg}`,
      data: { duelId: duel.id, matchId },
    }).catch(() => {});

    res.json({ success: true, data: duel });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Accept / submit pick for opponent
duelRoutes.post('/:id/accept', async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { opponentPick } = req.body;
    if (!opponentPick) return res.status(400).json({ success: false, error: 'opponentPick required' });

    const duel = await prisma.matchDuel.findUnique({ where: { id } });
    if (!duel) return res.status(404).json({ success: false, error: 'Duel not found' });
    if (duel.opponentId !== userId) return res.status(403).json({ success: false, error: 'Not your duel' });
    if (duel.status !== 'PENDING') return res.status(400).json({ success: false, error: 'Duel already responded' });

    // Deduct XP from opponent if there's a bet
    if (duel.xpBet > 0) {
      const opponent = await prisma.user.findUnique({ where: { id: userId }, select: { xp: true } });
      if (!opponent || opponent.xp < duel.xpBet) {
        // Refund challenger and decline
        await prisma.user.update({ where: { id: duel.challengerId }, data: { xp: { increment: duel.xpBet } } });
        await prisma.matchDuel.update({ where: { id }, data: { status: 'DECLINED' } });
        return res.status(400).json({ success: false, error: `XP insuficiente para aceptar. Necesitás ${duel.xpBet} XP` });
      }
      await prisma.user.update({ where: { id: userId }, data: { xp: { decrement: duel.xpBet } } });
    }

    const updated = await prisma.matchDuel.update({
      where: { id },
      data: { opponentPick, status: 'ACCEPTED' },
      include: {
        challenger: { select: { id: true, displayName: true } },
        opponent:   { select: { id: true, displayName: true } },
        match: { include: { homeTeam: { select: { name: true } }, awayTeam: { select: { name: true } } } },
      },
    });

    // Notify challenger
    NotificationService.sendPush([duel.challengerId], {
      type: NotificationType.SYSTEM,
      title: `✅ ${updated.opponent.displayName} aceptó el duelo`,
      body: `${updated.match.homeTeam?.name} vs ${updated.match.awayTeam?.name} — ¡que gane el mejor!`,
      data: { duelId: id, matchId: duel.matchId },
    }).catch(() => {});

    res.json({ success: true, data: updated });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Decline a duel (refund challenger XP if there was a bet)
duelRoutes.post('/:id/decline', async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const duel = await prisma.matchDuel.findUnique({ where: { id } });
    if (!duel || duel.opponentId !== userId) return res.status(403).json({ success: false, error: 'Forbidden' });
    if (duel.status !== 'PENDING') return res.status(400).json({ success: false, error: 'Duel already responded' });

    // Refund challenger's XP
    if (duel.xpBet > 0) {
      await prisma.user.update({ where: { id: duel.challengerId }, data: { xp: { increment: duel.xpBet } } });
    }

    await prisma.matchDuel.update({ where: { id }, data: { status: 'DECLINED' } });
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Resolve a duel (called internally when match finishes)
export async function resolveDuelsForMatch(matchId: string): Promise<void> {
  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match || match.status !== 'FINISHED') return;

  const actualHome = match.homeScore ?? 0;
  const actualAway = match.awayScore ?? 0;
  const actualResult = `${actualHome}-${actualAway}`;

  const duels = await prisma.matchDuel.findMany({
    where: { matchId, status: 'ACCEPTED' },
    include: {
      challenger: { select: { id: true, displayName: true } },
      opponent:   { select: { id: true, displayName: true } },
    },
  });

  for (const duel of duels) {
    const cPick = duel.challengerPick ?? '';
    const oPick = duel.opponentPick ?? '';

    // Score: exact = 2, correct result = 1
    const score = (pick: string) => {
      if (pick === actualResult) return 2;
      const [ph, pa] = pick.split('-').map(Number);
      const actualDir = actualHome > actualAway ? 'H' : actualAway > actualHome ? 'A' : 'D';
      const pickDir = ph > pa ? 'H' : pa > ph ? 'A' : 'D';
      return pickDir === actualDir ? 1 : 0;
    };

    const cScore = score(cPick);
    const oScore = score(oPick);
    let winnerId: string | null = null;
    if (cScore > oScore) winnerId = duel.challengerId;
    else if (oScore > cScore) winnerId = duel.opponentId;

    await prisma.matchDuel.update({
      where: { id: duel.id },
      data: { status: 'RESOLVED', winnerId },
    });

    // Award XP
    if (duel.xpBet > 0) {
      if (winnerId) {
        // Winner gets both bets (2x)
        await prisma.user.update({ where: { id: winnerId }, data: { xp: { increment: duel.xpBet * 2 } } });
      } else {
        // Tie — refund both
        await prisma.user.update({ where: { id: duel.challengerId }, data: { xp: { increment: duel.xpBet } } });
        await prisma.user.update({ where: { id: duel.opponentId }, data: { xp: { increment: duel.xpBet } } });
      }
    }

    // Notify both
    const xpMsg = duel.xpBet > 0
      ? (winnerId ? ` · +${duel.xpBet * 2} XP` : ` · ${duel.xpBet} XP devueltos`)
      : '';
    const msg = winnerId
      ? (winnerId === duel.challengerId ? `🏆 ${duel.challenger.displayName} ganó el duelo` : `🏆 ${duel.opponent.displayName} ganó el duelo`)
      : '🤝 Duelo empatado';
    NotificationService.sendPush([duel.challengerId, duel.opponentId], {
      type: NotificationType.SYSTEM,
      title: msg + xpMsg,
      body: `Resultado: ${actualResult} · Picks: ${cPick} vs ${oPick}`,
      data: { duelId: duel.id, matchId },
    }).catch(() => {});
  }
}

// Duel history
duelRoutes.get('/history', async (req: any, res) => {
  try {
    const userId = req.user.id;
    const duels = await prisma.matchDuel.findMany({
      where: {
        OR: [{ challengerId: userId }, { opponentId: userId }],
        status: { in: ['RESOLVED', 'DECLINED', 'EXPIRED'] },
      },
      include: {
        match: { include: { homeTeam: { select: { name: true, code: true, flagUrl: true } }, awayTeam: { select: { name: true, code: true, flagUrl: true } } } },
        challenger: { select: { id: true, displayName: true, username: true, avatar: true } },
        opponent:   { select: { id: true, displayName: true, username: true, avatar: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 30,
    });
    res.json({ success: true, data: duels });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});
