import { Router } from 'express';
import { MatchController } from '../controllers/matches.controller';
import { authenticate, optionalAuth } from '../middleware/auth';

export const matchRoutes = Router();

matchRoutes.get('/', optionalAuth, MatchController.list);
matchRoutes.get('/live', MatchController.getLive);
matchRoutes.get('/today', MatchController.getToday);
matchRoutes.get('/upcoming', MatchController.getUpcoming);
matchRoutes.get('/stage/:stage', MatchController.getByStage);
matchRoutes.get('/group/:group', MatchController.getByGroup);
matchRoutes.get('/:id', optionalAuth, MatchController.getById);
matchRoutes.get('/:id/events', MatchController.getEvents);
matchRoutes.get('/:id/stats', MatchController.getStats);
matchRoutes.get('/:id/lineups', MatchController.getLineups);
matchRoutes.get('/:id/h2h', MatchController.getHeadToHead);
matchRoutes.get('/:id/comments', optionalAuth, MatchController.getComments);
matchRoutes.post('/:id/comments', authenticate, MatchController.addComment);
