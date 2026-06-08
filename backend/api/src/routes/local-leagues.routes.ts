import { Router } from 'express';
import { localLeagueController } from '../controllers/local-leagues.controller';
import { authenticate } from '../middleware/auth';

export const localLeagueRoutes = Router();

localLeagueRoutes.use(authenticate);

localLeagueRoutes.get('/', localLeagueController.list);
localLeagueRoutes.post('/', localLeagueController.create);
localLeagueRoutes.get('/:id', localLeagueController.getById);
localLeagueRoutes.put('/:id', localLeagueController.update);
localLeagueRoutes.delete('/:id', localLeagueController.remove);

localLeagueRoutes.post('/:id/teams', localLeagueController.addTeam);
localLeagueRoutes.put('/:id/teams/:teamId', localLeagueController.updateTeam);
localLeagueRoutes.delete('/:id/teams/:teamId', localLeagueController.removeTeam);

localLeagueRoutes.post('/:id/generate-fixture', localLeagueController.generateFixture);
localLeagueRoutes.put('/:id/matches/:matchId', localLeagueController.updateMatchResult);
