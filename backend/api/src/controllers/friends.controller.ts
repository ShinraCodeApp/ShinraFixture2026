import { Request, Response } from 'express';
import { FriendsService } from '../services/friends.service';

export class FriendsController {
  static async sendRequest(req: Request, res: Response): Promise<void> {
    try {
      const data = await FriendsService.sendRequest(req.user!.id, req.params.userId);
      res.status(201).json({ success: true, data });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message ?? 'No se pudo enviar la solicitud' });
    }
  }

  static async acceptRequest(req: Request, res: Response): Promise<void> {
    try {
      const data = await FriendsService.acceptRequest(req.user!.id, req.params.id);
      res.json({ success: true, data });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message ?? 'No se pudo aceptar la solicitud' });
    }
  }

  static async rejectOrRemove(req: Request, res: Response): Promise<void> {
    try {
      await FriendsService.rejectOrRemove(req.user!.id, req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message ?? 'No se pudo eliminar' });
    }
  }

  static async listFriends(req: Request, res: Response): Promise<void> {
    try {
      const data = await FriendsService.listFriends(req.user!.id);
      res.json({ success: true, data });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  static async listRequests(req: Request, res: Response): Promise<void> {
    try {
      const data = await FriendsService.listRequests(req.user!.id);
      res.json({ success: true, data });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  static async searchUsers(req: Request, res: Response): Promise<void> {
    try {
      const q = (req.query.q as string) ?? '';
      if (q.trim().length < 2) {
        res.json({ success: true, data: [] });
        return;
      }
      const data = await FriendsService.searchUsers(req.user!.id, q.trim());
      res.json({ success: true, data });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
}
