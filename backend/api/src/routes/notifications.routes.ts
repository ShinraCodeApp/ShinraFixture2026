import { Router } from 'express';
import { NotificationController } from '../controllers/notifications.controller';
import { authenticate } from '../middleware/auth';

export const notificationRoutes = Router();
notificationRoutes.use(authenticate);

notificationRoutes.get('/', NotificationController.list);
notificationRoutes.get('/unread-count', NotificationController.unreadCount);
notificationRoutes.patch('/read-all', NotificationController.markAllRead);
notificationRoutes.patch('/:id/read', NotificationController.markRead);
notificationRoutes.delete('/:id', NotificationController.delete);
notificationRoutes.post('/register-device', NotificationController.registerDevice);
notificationRoutes.delete('/devices/:fcmToken', NotificationController.removeDevice);
