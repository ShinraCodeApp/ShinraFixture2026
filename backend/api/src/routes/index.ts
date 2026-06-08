import { Router } from 'express';
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

export const router = Router();

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
