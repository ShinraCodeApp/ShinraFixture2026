import { Request, Response } from 'express';
import { prisma } from '../config/database';

// Round-robin fixture generator (Berger tables algorithm)
function generateRoundRobin(teamIds: string[]): Array<{ homeTeamId: string; awayTeamId: string; round: number }> {
  const teams = [...teamIds];
  if (teams.length % 2 !== 0) teams.push('BYE');
  const n = teams.length;
  const rounds: Array<{ homeTeamId: string; awayTeamId: string; round: number }> = [];

  for (let round = 0; round < n - 1; round++) {
    for (let i = 0; i < n / 2; i++) {
      const home = teams[i];
      const away = teams[n - 1 - i];
      if (home !== 'BYE' && away !== 'BYE') {
        rounds.push({ homeTeamId: home, awayTeamId: away, round: round + 1 });
      }
    }
    // Rotate: keep teams[0] fixed, rotate the rest
    const last = teams[n - 1];
    teams.splice(n - 1, 1);
    teams.splice(1, 0, last);
  }

  return rounds;
}

export const localLeagueController = {
  // ── GET /local-leagues ──────────────────────────────
  async list(req: Request, res: Response) {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'No autenticado' });

    const leagues = await prisma.localLeague.findMany({
      where: { creatorId: userId },
      include: { teams: { select: { id: true, name: true, badge: true, color: true, points: true } } },
      orderBy: { updatedAt: 'desc' },
    });

    res.json({ success: true, data: leagues });
  },

  // ── POST /local-leagues ─────────────────────────────
  async create(req: Request, res: Response) {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'No autenticado' });

    const { name, type, description } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'El nombre es requerido' });

    const league = await prisma.localLeague.create({
      data: { name, type: type ?? 'LIGA', description, creatorId: userId },
    });

    res.status(201).json({ success: true, data: league });
  },

  // ── GET /local-leagues/:id ──────────────────────────
  async getById(req: Request, res: Response) {
    const userId = (req as any).user?.id;
    const { id } = req.params;

    const league = await prisma.localLeague.findFirst({
      where: { id, creatorId: userId },
      include: {
        teams: {
          include: { players: { orderBy: [{ position: 'asc' }, { number: 'asc' }] } },
          orderBy: { points: 'desc' },
        },
        matches: {
          include: {
            homeTeam: { select: { id: true, name: true, badge: true, color: true } },
            awayTeam: { select: { id: true, name: true, badge: true, color: true } },
          },
          orderBy: [{ round: 'asc' }],
        },
      },
    });

    if (!league) return res.status(404).json({ success: false, message: 'Liga no encontrada' });
    res.json({ success: true, data: league });
  },

  // ── PUT /local-leagues/:id ──────────────────────────
  async update(req: Request, res: Response) {
    const userId = (req as any).user?.id;
    const { id } = req.params;
    const { name, type, description, isFinished } = req.body;

    const league = await prisma.localLeague.updateMany({
      where: { id, creatorId: userId },
      data: { name, type, description, isFinished },
    });

    if (!league.count) return res.status(404).json({ success: false, message: 'Liga no encontrada' });
    res.json({ success: true });
  },

  // ── DELETE /local-leagues/:id ───────────────────────
  async remove(req: Request, res: Response) {
    const userId = (req as any).user?.id;
    const { id } = req.params;

    await prisma.localLeague.deleteMany({ where: { id, creatorId: userId } });
    res.json({ success: true });
  },

  // ── POST /local-leagues/:id/teams ───────────────────
  async addTeam(req: Request, res: Response) {
    const userId = (req as any).user?.id;
    const { id } = req.params;
    const { name, badge, color } = req.body;

    const league = await prisma.localLeague.findFirst({ where: { id, creatorId: userId } });
    if (!league) return res.status(404).json({ success: false, message: 'Liga no encontrada' });
    if (!name) return res.status(400).json({ success: false, message: 'El nombre del equipo es requerido' });

    const team = await prisma.localTeam.create({
      data: { leagueId: id, name, badge, color: color ?? '#0D47A1' },
    });

    res.status(201).json({ success: true, data: team });
  },

  // ── PUT /local-leagues/:id/teams/:teamId ────────────
  async updateTeam(req: Request, res: Response) {
    const userId = (req as any).user?.id;
    const { id, teamId } = req.params;
    const { name, badge, color, players } = req.body;

    const league = await prisma.localLeague.findFirst({ where: { id, creatorId: userId } });
    if (!league) return res.status(404).json({ success: false, message: 'Liga no encontrada' });

    await prisma.localTeam.update({ where: { id: teamId }, data: { name, badge, color } });

    if (Array.isArray(players)) {
      // Replace all players: delete existing, create new
      await prisma.localPlayer.deleteMany({ where: { teamId } });
      if (players.length > 0) {
        await prisma.localPlayer.createMany({
          data: players.map((p: any) => ({
            teamId,
            name: p.name,
            number: p.number ? Number(p.number) : null,
            position: p.position ?? null,
          })),
        });
      }
    }

    const updated = await prisma.localTeam.findUnique({
      where: { id: teamId },
      include: { players: true },
    });

    res.json({ success: true, data: updated });
  },

  // ── DELETE /local-leagues/:id/teams/:teamId ─────────
  async removeTeam(req: Request, res: Response) {
    const userId = (req as any).user?.id;
    const { id, teamId } = req.params;

    const league = await prisma.localLeague.findFirst({ where: { id, creatorId: userId } });
    if (!league) return res.status(404).json({ success: false, message: 'Liga no encontrada' });

    await prisma.localTeam.delete({ where: { id: teamId } });
    res.json({ success: true });
  },

  // ── POST /local-leagues/:id/generate-fixture ────────
  async generateFixture(req: Request, res: Response) {
    const userId = (req as any).user?.id;
    const { id } = req.params;

    const league = await prisma.localLeague.findFirst({
      where: { id, creatorId: userId },
      include: { teams: { select: { id: true } } },
    });
    if (!league) return res.status(404).json({ success: false, message: 'Liga no encontrada' });
    if (league.teams.length < 2) return res.status(400).json({ success: false, message: 'Se necesitan al menos 2 equipos' });

    // Delete existing matches before regenerating
    await prisma.localMatch.deleteMany({ where: { leagueId: id } });

    const matchData = generateRoundRobin(league.teams.map((t) => t.id));

    await prisma.localMatch.createMany({
      data: matchData.map((m) => ({ ...m, leagueId: id })),
    });

    const matches = await prisma.localMatch.findMany({
      where: { leagueId: id },
      include: {
        homeTeam: { select: { id: true, name: true, badge: true, color: true } },
        awayTeam: { select: { id: true, name: true, badge: true, color: true } },
      },
      orderBy: [{ round: 'asc' }],
    });

    res.json({ success: true, data: matches });
  },

  // ── PUT /local-leagues/:id/matches/:matchId ─────────
  async updateMatchResult(req: Request, res: Response) {
    const userId = (req as any).user?.id;
    const { id, matchId } = req.params;
    const { homeScore, awayScore } = req.body;

    const league = await prisma.localLeague.findFirst({ where: { id, creatorId: userId } });
    if (!league) return res.status(404).json({ success: false, message: 'Liga no encontrada' });

    const match = await prisma.localMatch.findFirst({ where: { id: matchId, leagueId: id } });
    if (!match) return res.status(404).json({ success: false, message: 'Partido no encontrado' });

    const hs = Number(homeScore);
    const as_ = Number(awayScore);
    const wasFinished = match.isFinished;
    const prevHS = match.homeScore ?? 0;
    const prevAS = match.awayScore ?? 0;

    await prisma.localMatch.update({
      where: { id: matchId },
      data: { homeScore: hs, awayScore: as_, isFinished: true },
    });

    // Revert previous standings if match was already finished
    if (wasFinished) {
      await revertMatchStandings(match.homeTeamId, match.awayTeamId, prevHS, prevAS);
    }

    // Apply new standings
    await applyMatchStandings(match.homeTeamId, match.awayTeamId, hs, as_);

    res.json({ success: true });
  },
};

async function applyMatchStandings(homeId: string, awayId: string, hs: number, as_: number) {
  const homeWon = hs > as_;
  const awayWon = as_ > hs;
  const draw = hs === as_;

  await prisma.localTeam.update({
    where: { id: homeId },
    data: {
      played: { increment: 1 },
      won: { increment: homeWon ? 1 : 0 },
      drawn: { increment: draw ? 1 : 0 },
      lost: { increment: awayWon ? 1 : 0 },
      goalsFor: { increment: hs },
      goalsAgainst: { increment: as_ },
      goalDifference: { increment: hs - as_ },
      points: { increment: homeWon ? 3 : draw ? 1 : 0 },
    },
  });

  await prisma.localTeam.update({
    where: { id: awayId },
    data: {
      played: { increment: 1 },
      won: { increment: awayWon ? 1 : 0 },
      drawn: { increment: draw ? 1 : 0 },
      lost: { increment: homeWon ? 1 : 0 },
      goalsFor: { increment: as_ },
      goalsAgainst: { increment: hs },
      goalDifference: { increment: as_ - hs },
      points: { increment: awayWon ? 3 : draw ? 1 : 0 },
    },
  });
}

async function revertMatchStandings(homeId: string, awayId: string, hs: number, as_: number) {
  const homeWon = hs > as_;
  const awayWon = as_ > hs;
  const draw = hs === as_;

  await prisma.localTeam.update({
    where: { id: homeId },
    data: {
      played: { decrement: 1 },
      won: { decrement: homeWon ? 1 : 0 },
      drawn: { decrement: draw ? 1 : 0 },
      lost: { decrement: awayWon ? 1 : 0 },
      goalsFor: { decrement: hs },
      goalsAgainst: { decrement: as_ },
      goalDifference: { decrement: hs - as_ },
      points: { decrement: homeWon ? 3 : draw ? 1 : 0 },
    },
  });

  await prisma.localTeam.update({
    where: { id: awayId },
    data: {
      played: { decrement: 1 },
      won: { decrement: awayWon ? 1 : 0 },
      drawn: { decrement: draw ? 1 : 0 },
      lost: { decrement: homeWon ? 1 : 0 },
      goalsFor: { decrement: as_ },
      goalsAgainst: { decrement: hs },
      goalDifference: { decrement: as_ - hs },
      points: { decrement: awayWon ? 3 : draw ? 1 : 0 },
    },
  });
}
