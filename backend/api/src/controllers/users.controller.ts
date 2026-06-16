import { Request, Response } from 'express';
import { UsersService } from '../services/users.service';

export class UserController {
  static async getPublicProfile(req: Request, res: Response): Promise<void> {
    const data = await UsersService.getPublicProfile(req.params.id);
    res.json({ success: true, data });
  }

  static async getPublicPredictions(req: Request, res: Response): Promise<void> {
    const { page = '1', limit = '20' } = req.query;
    const data = await UsersService.getPublicPredictions(req.params.id, parseInt(page as string), parseInt(limit as string));
    res.json({ success: true, data });
  }

  static async getAchievements(req: Request, res: Response): Promise<void> {
    const data = await UsersService.getAchievements(req.params.id);
    res.json({ success: true, data });
  }

  static async updateProfile(req: Request, res: Response): Promise<void> {
    const data = await UsersService.updateProfile(req.user!.id, req.body);
    res.json({ success: true, data });
  }

  static async updateAvatar(req: Request, res: Response): Promise<void> {
    const data = await UsersService.updateAvatar(req.user!.id, req.body.avatarUrl);
    res.json({ success: true, data });
  }

  static async getFavoriteTeams(req: Request, res: Response): Promise<void> {
    const data = await UsersService.getFavoriteTeams(req.user!.id);
    res.json({ success: true, data });
  }

  static async addFavoriteTeam(req: Request, res: Response): Promise<void> {
    await UsersService.addFavoriteTeam(req.user!.id, req.body.teamId);
    res.json({ success: true });
  }

  static async removeFavoriteTeam(req: Request, res: Response): Promise<void> {
    await UsersService.removeFavoriteTeam(req.user!.id, req.params.teamId);
    res.json({ success: true });
  }

  static async leaderboard(req: Request, res: Response): Promise<void> {
    const { page = '1', limit = '20' } = req.query;
    const data = await UsersService.leaderboard(parseInt(page as string), parseInt(limit as string));
    res.json({ success: true, data });
  }

  static async myStats(req: Request, res: Response): Promise<void> {
    const data = await UsersService.myStats(req.user!.id);
    res.json({ success: true, data });
  }

  static async deleteAccount(req: Request, res: Response): Promise<void> {
    await UsersService.deleteAccount(req.user!.id);
    res.json({ success: true, message: 'Account deleted' });
  }

  static async registerDevice(req: Request, res: Response): Promise<void> {
    const { pushToken, deviceType = 'android', deviceModel, appVersion } = req.body;
    if (!pushToken) { res.status(400).json({ success: false, error: 'pushToken required' }); return; }
    const { prisma } = await import('../config/database');
    await prisma.userDevice.upsert({
      where: { userId_fcmToken: { userId: req.user!.id, fcmToken: pushToken } },
      create: { userId: req.user!.id, fcmToken: pushToken, deviceType, deviceModel, appVersion, isActive: true },
      update: { isActive: true, deviceModel, appVersion },
    });
    res.json({ success: true });
  }
}
