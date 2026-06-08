import { Request, Response } from 'express';
import { FriendsService } from '../services/friends.service';

export class FriendsController {
  static async sendRequest(req: Request, res: Response): Promise<void> {
    const data = await FriendsService.sendRequest(req.user!.id, req.params.userId);
    res.status(201).json({ success: true, data });
  }

  static async acceptRequest(req: Request, res: Response): Promise<void> {
    const data = await FriendsService.acceptRequest(req.user!.id, req.params.id);
    res.json({ success: true, data });
  }

  static async rejectOrRemove(req: Request, res: Response): Promise<void> {
    await FriendsService.rejectOrRemove(req.user!.id, req.params.id);
    res.json({ success: true });
  }

  static async listFriends(req: Request, res: Response): Promise<void> {
    const data = await FriendsService.listFriends(req.user!.id);
    res.json({ success: true, data });
  }

  static async listRequests(req: Request, res: Response): Promise<void> {
    const data = await FriendsService.listRequests(req.user!.id);
    res.json({ success: true, data });
  }

  static async searchUsers(req: Request, res: Response): Promise<void> {
    const q = (req.query.q as string) ?? '';
    if (q.trim().length < 2) {
      res.json({ success: true, data: [] });
      return;
    }
    const data = await FriendsService.searchUsers(req.user!.id, q.trim());
    res.json({ success: true, data });
  }
}
