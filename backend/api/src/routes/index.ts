import { Router, Request, Response, NextFunction } from 'express';
import { syncStaleLeaguesInBackground } from '../services/leagueFixtures.service';
import { LEAGUES } from '../config/leagues';
import { prisma } from '../config/database';
import { authRoutes } from './auth.routes';
import { matchRoutes } from './matches.routes';
import { teamRoutes } from './teams.routes';
import { playerRoutes } from './players.routes';
import { predictionRoutes } from './predictions.routes';
import { quinielaRoutes } from './quiniela.routes';
import { userRoutes } from './users.routes';
import { communityRoutes } from './community.routes';
import { notificationRoutes } from './notifications.routes';
import { newsRoutes } from './news.routes';
import { simulatorRoutes } from './simulator.routes';
import { statsRoutes } from './stats.routes';
import { adminRoutes } from './admin.routes';
import { paymentRoutes } from './payments.routes';
import { tournamentRoutes } from './tournaments.routes';
import { friendRoutes } from './friends.routes';
import { localLeagueRoutes } from './local-leagues.routes';
import { duelRoutes } from './duels.routes';
import { friendTournamentRoutes } from './friend-tournaments.routes';
import { analyticsRoutes } from './analytics.routes';

export const router = Router();

// Cuando alguien consulta partidos o torneos, las ligas con datos de hace más
// de 3 h se actualizan en segundo plano (la respuesta no espera).
function refreshLeagues(req: Request, _res: Response, next: NextFunction) {
  if (req.method === 'GET') syncStaleLeaguesInBackground();
  next();
}
router.use(['/matches', '/tournaments'], refreshLeagues);

/**
 * Patrocinadores activos (se cargan desde el panel admin en la config
 * "sponsors" como lista JSON). Cada uno: { id, name, text?, imageUrl?, url?,
 * leagues?: ['LIGA_ARG', ...] (vacío = todas), active?, until?: fecha ISO }.
 * ?league=LIGA_ARG filtra los que patrocinan esa liga.
 */
router.get('/sponsors', async (req, res) => {
  const row = await prisma.appConfig.findUnique({ where: { key: 'sponsors' } });
  const all: any[] = Array.isArray(row?.value) ? (row!.value as any[]) : [];
  const league = typeof req.query.league === 'string' ? req.query.league : null;
  const now = Date.now();
  const data = all
    .filter((s) => s && s.name && s.active !== false)
    .filter((s) => !s.until || new Date(s.until).getTime() > now)
    .filter((s) => !league || !Array.isArray(s.leagues) || s.leagues.length === 0 || s.leagues.includes(league))
    .map(({ id, name, text, imageUrl, url, leagues }) => ({ id: id ?? name, name, text, imageUrl, url, leagues }));
  res.set('Cache-Control', 'public, max-age=600');
  res.json({ success: true, data });
});

/** Ligas que sigue la app (para el selector de la app). */
router.get('/leagues', async (_req, res) => {
  const tournaments = await prisma.tournament.findMany({
    where: { type: { in: LEAGUES.map((l) => l.type) as any[] }, isActive: true },
    orderBy: { year: 'desc' },
    select: { id: true, type: true, name: true, year: true, logo: true },
  });
  const data = LEAGUES.map((l) => {
    const t = tournaments.find((x) => x.type === l.type); // la temporada más reciente
    return { ...l, tournamentId: t?.id ?? null, seasonName: t?.name ?? null, logo: t?.logo ?? null };
  });
  res.json({ success: true, data });
});

router.use('/auth', authRoutes);
router.use('/matches', matchRoutes);
router.use('/teams', teamRoutes);
router.use('/players', playerRoutes);
router.use('/predictions', predictionRoutes);
router.use('/quiniela', quinielaRoutes);
router.use('/users', userRoutes);
router.use('/community', communityRoutes);
router.use('/notifications', notificationRoutes);
router.use('/news', newsRoutes);
router.use('/simulator', simulatorRoutes);
router.use('/stats', statsRoutes);
router.use('/admin', adminRoutes);
router.use('/payments', paymentRoutes);
router.use('/tournaments', tournamentRoutes);
router.use('/friends', friendRoutes);
router.use('/local-leagues', localLeagueRoutes);
router.use('/duels', duelRoutes);
router.use('/friend-tournaments', friendTournamentRoutes);
router.use('/analytics', analyticsRoutes);

router.get('/', (_req, res) => {
  res.json({
    success: true,
    message: 'ShinraFixture 2026 API',
    version: '1.0.0',
    endpoints: [
      '/auth', '/matches', '/teams', '/players', '/predictions',
      '/quiniela', '/users', '/community', '/notifications',
      '/news', '/simulator', '/stats', '/admin', '/payments', '/tournaments',
    ],
  });
});
