import { Router } from 'express';
import { UserController } from '../controllers/users.controller';
import { authenticate, optionalAuth } from '../middleware/auth';

function queryToBody(req: any, _res: any, next: any) { req.body = req.query; next(); }

export const userRoutes = Router();

userRoutes.get('/leaderboard', UserController.leaderboard);
userRoutes.get('/:id', optionalAuth, UserController.getPublicProfile);
userRoutes.get('/:id/predictions', UserController.getPublicPredictions);
userRoutes.get('/:id/achievements', UserController.getAchievements);

userRoutes.use(authenticate);
userRoutes.patch('/me', UserController.updateProfile);
userRoutes.patch('/me/avatar', UserController.updateAvatar);
userRoutes.post('/me/favorite-teams', UserController.addFavoriteTeam);
userRoutes.delete('/me/favorite-teams/:teamId', UserController.removeFavoriteTeam);
userRoutes.get('/me/stats', UserController.myStats);
userRoutes.delete('/me', UserController.deleteAccount);
// GET aliases for LTE/carrier networks
userRoutes.get('/g-update-me', queryToBody, UserController.updateProfile);
userRoutes.get('/g-delete-me', UserController.deleteAccount);
