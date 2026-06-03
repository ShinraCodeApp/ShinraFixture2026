import { Router } from 'express';
import { StatsController } from '../controllers/stats.controller';
import { optionalAuth } from '../middleware/auth';

export const statsRoutes = Router();

statsRoutes.get('/top-scorers', StatsController.topScorers);
statsRoutes.get('/top-assists', StatsController.topAssists);
statsRoutes.get('/top-cards', StatsController.topCards);
statsRoutes.get('/team-stats', StatsController.teamStats);
statsRoutes.get('/match-stats', StatsController.matchStats);
statsRoutes.get('/tournament-summary', StatsController.tournamentSummary);
