import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { prisma } from '../config/database';
import { NotificationService } from '../services/notifications.service';
import { NotificationType } from '@prisma/client';

export const friendTournamentRoutes = Router();
friendTournamentRoutes.use(authenticate);

// Get my tournaments (created or participating)
friendTournamentRoutes.get('/', async (req: any, res) => {
  try {
    const userId = req.user.id;
    const tournaments = await prisma.friendTournament.findMany({
      where: {
        OR: [
          { creatorId: userId },
          { participants: { some: { userId, status: { in: ['JOINED', 'INVITED'] } } } },
        ],
      },
      include: {
        creator: { select: { id: true, displayName: true, username: true, avatar: true } },
        participants: {
          include: { user: { select: { id: true, displayName: true, username: true, avatar: true } } },
          orderBy: { points: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: tournaments });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Get tournament detail + leaderboard
friendTournamentRoutes.get('/:id', async (req: any, res) => {
  try {
    const { id } = req.params;
    const tournament = await prisma.friendTournament.findUnique({
      where: { id },
      include: {
        creator: { select: { id: true, displayName: true, username: true, avatar: true } },
        participants: {
          include: { user: { select: { id: true, displayName: true, username: true, avatar: true, xp: true } } },
          orderBy: { points: 'desc' },
        },
      },
    });
    if (!tournament) return res.status(404).json({ success: false, error: 'Tournament not found' });

    // Fetch match details for the matchIds stored in the tournament
    const matchIds = (tournament.matchIds as string[]) ?? [];
    const matches = matchIds.length > 0
      ? await prisma.match.findMany({
          where: { id: { in: matchIds } },
          include: {
            homeTeam: { select: { name: true, code: true, flagUrl: true } },
            awayTeam: { select: { name: true, code: true, flagUrl: true } },
          },
          orderBy: { date: 'asc' },
        })
      : [];

    res.json({ success: true, data: { ...tournament, matches } });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Create a friend tournament
friendTournamentRoutes.post('/', async (req: any, res) => {
  try {
    const creatorId = req.user.id;
    const { name, matchIds = [], friendIds = [] } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length < 3)
      return res.status(400).json({ success: false, error: 'Nombre del torneo requerido (mín. 3 caracteres)' });
    const validMatchIds = (matchIds as any[]).filter((id: any) => typeof id === 'string' && id.trim().length > 0);
    if (validMatchIds.length < 1)
      return res.status(400).json({ success: false, error: 'Seleccioná al menos 1 partido' });

    const tournament = await prisma.friendTournament.create({
      data: {
        name: name.trim(),
        creatorId,
        matchIds,
        participants: {
          create: [
            { userId: creatorId, status: 'JOINED' },
            ...((friendIds as string[]).map((uid: string) => ({ userId: uid, status: 'INVITED' }))),
          ],
        },
      },
      include: {
        creator: { select: { id: true, displayName: true, username: true } },
        participants: {
          include: { user: { select: { id: true, displayName: true, username: true } } },
        },
      },
    });

    // Notify invited friends
    if (friendIds.length > 0) {
      NotificationService.sendPush(friendIds, {
        type: NotificationType.SYSTEM,
        title: `🏆 ${tournament.creator.displayName} te invitó a un torneo`,
        body: `"${tournament.name}" — aceptá la invitación para competir`,
        data: { tournamentId: tournament.id },
      }).catch(() => {});
    }

    res.json({ success: true, data: tournament });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Accept or decline invitation
friendTournamentRoutes.post('/:id/respond', async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { accept } = req.body;

    const participant = await prisma.tournamentParticipant.findUnique({
      where: { tournamentId_userId: { tournamentId: id, userId } },
    });
    if (!participant) return res.status(404).json({ success: false, error: 'Invitación no encontrada' });
    if (participant.status !== 'INVITED') return res.status(400).json({ success: false, error: 'Ya respondiste esta invitación' });

    await prisma.tournamentParticipant.update({
      where: { tournamentId_userId: { tournamentId: id, userId } },
      data: { status: accept ? 'JOINED' : 'DECLINED' },
    });

    res.json({ success: true, joined: !!accept });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Update tournament points when a match finishes (called internally)
export async function updateTournamentPointsForMatch(matchId: string): Promise<void> {
  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match || match.status !== 'FINISHED') return;

  // Find tournaments that include this match
  const tournaments = await prisma.friendTournament.findMany({
    where: {
      matchIds: { path: '$', array_contains: matchId },
      status: { in: ['OPEN', 'IN_PROGRESS'] },
    },
    include: { participants: { where: { status: 'JOINED' } } },
  });

  if (tournaments.length === 0) return;

  const actualHome = match.homeScore ?? 0;
  const actualAway = match.awayScore ?? 0;
  const actualResult = `${actualHome}-${actualAway}`;
  const actualDir = actualHome > actualAway ? 'H' : actualAway > actualHome ? 'A' : 'D';

  for (const tournament of tournaments) {
    for (const participant of tournament.participants) {
      const prediction = await prisma.prediction.findUnique({
        where: { userId_matchId: { userId: participant.userId, matchId } },
      });
      if (!prediction) continue;

      let pts = 0;
      const predResult = `${prediction.homeScore}-${prediction.awayScore}`;
      if (predResult === actualResult) {
        pts = 3; // exact score
      } else {
        const predDir = prediction.homeScore > prediction.awayScore ? 'H'
          : prediction.awayScore > prediction.homeScore ? 'A' : 'D';
        if (predDir === actualDir) pts = 1; // correct result
      }

      if (pts > 0) {
        await prisma.tournamentParticipant.update({
          where: { tournamentId_userId: { tournamentId: tournament.id, userId: participant.userId } },
          data: { points: { increment: pts } },
        });
      }
    }

    // Check if all matches are finished → close tournament
    const matchIds = (tournament.matchIds as string[]) ?? [];
    const pendingMatches = await prisma.match.count({
      where: { id: { in: matchIds }, status: { not: 'FINISHED' } },
    });
    if (pendingMatches === 0) {
      await prisma.friendTournament.update({
        where: { id: tournament.id },
        data: { status: 'FINISHED' },
      });
    } else if (tournament.status === 'OPEN') {
      await prisma.friendTournament.update({
        where: { id: tournament.id },
        data: { status: 'IN_PROGRESS' },
      });
    }
  }
}
