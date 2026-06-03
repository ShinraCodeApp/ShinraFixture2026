import { Request, Response } from 'express';
import { NotificationService } from '../services/notifications.service';

export class NotificationController {
  static async list(req: Request, res: Response): Promise<void> {
    const { page = '1', limit = '20' } = req.query;
    const data = await NotificationService.getUserNotifications(
      req.user!.id,
      parseInt(page as string),
      parseInt(limit as string)
    );
    res.json({ success: true, data });
  }

  static async unreadCount(req: Request, res: Response): Promise<void> {
    const data = await NotificationService.getUserNotifications(req.user!.id, 1, 1);
    res.json({ success: true, data: { count: data.unread } });
  }

  static async markRead(req: Request, res: Response): Promise<void> {
    await NotificationService.markRead(req.params.id, req.user!.id);
    res.json({ success: true });
  }

  static async markAllRead(req: Request, res: Response): Promise<void> {
    await NotificationService.markAllRead(req.user!.id);
    res.json({ success: true });
  }

  static async delete(req: Request, res: Response): Promise<void> {
    await NotificationService.delete(req.params.id, req.user!.id);
    res.json({ success: true });
  }

  static async registerDevice(req: Request, res: Response): Promise<void> {
    const { fcmToken, deviceType } = req.body;
    await NotificationService.registerDevice(req.user!.id, fcmToken, deviceType);
    res.json({ success: true });
  }

  static async removeDevice(req: Request, res: Response): Promise<void> {
    await NotificationService.removeDevice(req.user!.id, req.params.fcmToken);
    res.json({ success: true });
  }
}
