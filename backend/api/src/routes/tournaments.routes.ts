import { Router } from 'express';
import { prisma } from '../config/database';
import { PlayoffSyncService } from '../services/playoff-sync.service';

export const tournamentRoutes = Router();

tournamentRoutes.get('/', async (_req, res) => {
  const tournaments = await prisma.tournament.findMany({
    orderBy: [{ isActive: 'desc' }, { year: 'desc' }],
    select: {
      id: true, name: true, shortName: true, year: true,
      type: true, startDate: true, endDate: true,
      hostCountries: true, logo: true, isActive: true, isFeatured: true,
    },
  });
  res.json({ success: true, data: tournaments });
});

// Playoff status — called by the app on startup to check for updates
tournamentRoutes.get('/wc2026/playoffs', async (_req, res) => {
  const status = await PlayoffSyncService.getPlayoffStatus();
  res.json({ success: true, data: status });
});

// Auto-sync playoffs from internet (called by app when online)
tournamentRoutes.post('/wc2026/playoffs/sync', async (_req, res) => {
  const result = await PlayoffSyncService.syncWC2026Playoffs();
  res.json({ success: true, data: result });
});

// Manually resolve a playoff slot (admin)
tournamentRoutes.put('/wc2026/playoffs/:code', async (req, res) => {
  const { code } = req.params;
  const { name, shortName, isoCode } = req.body;
  await PlayoffSyncService.resolvePlayoff(code.toUpperCase(), { name, shortName, isoCode });
  res.json({ success: true, message: `${code} resolved to ${name}` });
});

// Returns the group standings for a specific team in the active WC tournament
tournamentRoutes.get('/team-group/:teamId', async (req, res) => {
  const { teamId } = req.params;

  // Find the team in TournamentGroupTeam, preferring active WC tournament
  const entry = await prisma.tournamentGroupTeam.findFirst({
    where: { teamId },
    include: {
      group: {
        include: {
          tournament: { select: { id: true, name: true, type: true } },
          teams: {
            include: {
              team: {
                select: { id: true, name: true, shortName: true, code: true, flagUrl: true },
              },
            },
            orderBy: [{ points: 'desc' }, { goalDifference: 'desc' }, { goalsFor: 'desc' }],
          },
        },
      },
    },
    orderBy: { group: { tournament: { isActive: 'desc' } } },
  });

  if (!entry) return res.status(404).json({ success: false, message: 'Equipo no está en ningún grupo de torneo' });

  res.json({
    success: true,
    data: {
      group: entry.group.letter,
      tournamentName: entry.group.tournament.name,
      tournamentType: entry.group.tournament.type,
      standings: entry.group.teams,
    },
  });
});

tournamentRoutes.get('/:id', async (req, res) => {
  const tournament = await prisma.tournament.findUniqueOrThrow({
    where: { id: req.params.id },
    include: {
      groups: {
        include: {
          teams: {
            include: { team: { select: { id: true, name: true, shortName: true, code: true, flagUrl: true } } },
            orderBy: [{ points: 'desc' }, { goalDifference: 'desc' }, { goalsFor: 'desc' }, { position: 'asc' }],
          },
        },
        orderBy: { letter: 'asc' },
      },
    },
  });
  res.json({ success: true, data: tournament });
});
