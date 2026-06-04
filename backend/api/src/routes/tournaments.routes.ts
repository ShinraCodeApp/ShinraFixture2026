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

tournamentRoutes.get('/:id', async (req, res) => {
  const tournament = await prisma.tournament.findUniqueOrThrow({
    where: { id: req.params.id },
    include: {
      groups: {
        include: {
          teams: {
            include: { team: { select: { id: true, name: true, shortName: true, code: true, flagUrl: true } } },
            orderBy: [{ points: 'desc' }, { goalDifference: 'desc' }, { goalsFor: 'desc' }],
          },
        },
        orderBy: { letter: 'asc' },
      },
    },
  });
  res.json({ success: true, data: tournament });
});
