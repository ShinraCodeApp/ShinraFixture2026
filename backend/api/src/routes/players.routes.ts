import { Router } from 'express';
import { PlayerController } from '../controllers/players.controller';

export const playerRoutes = Router();

playerRoutes.get('/', PlayerController.list);
playerRoutes.get('/top-scorers', PlayerController.getTopScorers);
playerRoutes.get('/top-assists', PlayerController.getTopAssists);
playerRoutes.get('/top-rated', PlayerController.getTopRated);
playerRoutes.get('/:id', PlayerController.getById);
playerRoutes.get('/:id/stats', PlayerController.getStats);
playerRoutes.get('/:id/matches', PlayerController.getMatches);
