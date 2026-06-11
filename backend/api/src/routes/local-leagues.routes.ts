import { Router, Request, Response, NextFunction } from 'express';
import { localLeagueController } from '../controllers/local-leagues.controller';
import { authenticate } from '../middleware/auth';

export const localLeagueRoutes = Router();

localLeagueRoutes.use(authenticate);

// GET aliases for LTE/carrier networks that block POST/PUT/DELETE
// Must be declared BEFORE /:id routes to avoid param capture
function queryToBody(req: Request, _res: Response, next: NextFunction) {
  const body: any = { ...req.query };
  for (const key of Object.keys(body)) {
    const val = body[key];
    if (typeof val === 'string' && (val.startsWith('[') || val.startsWith('{'))) {
      try { body[key] = JSON.parse(val); } catch {}
    }
  }
  req.body = body;
  next();
}

localLeagueRoutes.get('/g-create', queryToBody, localLeagueController.create);

// Standard REST routes
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

localLeagueRoutes.get('/:id/g-delete', localLeagueController.remove);
localLeagueRoutes.get('/:id/g-add-team', queryToBody, localLeagueController.addTeam);
localLeagueRoutes.get('/:id/teams/:teamId/g-update', queryToBody, localLeagueController.updateTeam);
localLeagueRoutes.get('/:id/teams/:teamId/g-delete', localLeagueController.removeTeam);
localLeagueRoutes.get('/:id/g-generate-fixture', localLeagueController.generateFixture);
localLeagueRoutes.get('/:id/matches/:matchId/g-update-result', queryToBody, localLeagueController.updateMatchResult);
