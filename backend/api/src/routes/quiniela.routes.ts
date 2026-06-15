import { Router } from 'express';
import { QuinielaController } from '../controllers/quiniela.controller';
import { authenticate } from '../middleware/auth';

export const quinielaRoutes = Router();

// Public — no auth required (used by deep link invite preview)
quinielaRoutes.get('/invite-info/:code', QuinielaController.invitePreview);

quinielaRoutes.use(authenticate);

quinielaRoutes.get('/', QuinielaController.myGroups);
quinielaRoutes.post('/', QuinielaController.create);
quinielaRoutes.post('/join', QuinielaController.join);
quinielaRoutes.get('/:id', QuinielaController.getById);
quinielaRoutes.get('/:id/standings', QuinielaController.getStandings);
quinielaRoutes.get('/:id/predictions', QuinielaController.getPredictions);
quinielaRoutes.delete('/:id/leave', QuinielaController.leave);
quinielaRoutes.delete('/:id', QuinielaController.delete);
quinielaRoutes.patch('/:id', QuinielaController.update);
quinielaRoutes.delete('/:id/members/:userId', QuinielaController.removeMember);
