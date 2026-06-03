import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller';
import { authenticate, requireRole } from '../middleware/auth';

export const adminRoutes = Router();
adminRoutes.use(authenticate, requireRole('ADMIN', 'SUPER_ADMIN'));

// Dashboard
adminRoutes.get('/dashboard', AdminController.dashboard);
adminRoutes.get('/stats', AdminController.stats);

// Users
adminRoutes.get('/users', AdminController.listUsers);
adminRoutes.get('/users/:id', AdminController.getUser);
adminRoutes.patch('/users/:id', AdminController.updateUser);
adminRoutes.post('/users/:id/ban', AdminController.banUser);
adminRoutes.post('/users/:id/unban', AdminController.unbanUser);
adminRoutes.post('/users/:id/grant-premium', AdminController.grantPremium);

// Matches (live management)
adminRoutes.get('/matches', AdminController.listMatches);
adminRoutes.patch('/matches/:id', AdminController.updateMatch);
adminRoutes.post('/matches/:id/events', AdminController.addMatchEvent);
adminRoutes.delete('/matches/:id/events/:eventId', AdminController.removeMatchEvent);
adminRoutes.post('/matches/:id/start', AdminController.startMatch);
adminRoutes.post('/matches/:id/finish', AdminController.finishMatch);
adminRoutes.post('/matches/:id/update-score', AdminController.updateScore);

// Notifications
adminRoutes.post('/notifications/broadcast', AdminController.broadcast);
adminRoutes.post('/notifications/match-start/:matchId', AdminController.triggerMatchStart);

// Content moderation
adminRoutes.get('/comments/flagged', AdminController.flaggedComments);
adminRoutes.post('/comments/:id/approve', AdminController.approveComment);
adminRoutes.delete('/comments/:id', AdminController.deleteComment);

// Ads
adminRoutes.get('/ads', AdminController.listAds);
adminRoutes.post('/ads', AdminController.createAd);
adminRoutes.patch('/ads/:id', AdminController.updateAd);
adminRoutes.delete('/ads/:id', AdminController.deleteAd);
