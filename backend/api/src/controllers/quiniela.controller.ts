import { Request, Response } from 'express';
import { QuinielaService } from '../services/quiniela.service';
import { ApiError } from '../utils/ApiError';

export class QuinielaController {
  static async myGroups(req: Request, res: Response): Promise<void> {
    const data = await QuinielaService.myGroups(req.user!.id);
    res.json({ success: true, data });
  }

  static async create(req: Request, res: Response): Promise<void> {
    const group = await QuinielaService.create(req.user!.id, req.user!.isPremium, req.body);
    res.status(201).json({ success: true, data: group });
  }

  static async invitePreview(req: Request, res: Response): Promise<void> {
    const preview = await QuinielaService.getPreviewByCode(req.params.code);
    if (!preview) {
      res.status(404).json({ success: false, error: 'Código inválido o grupo inactivo' });
      return;
    }
    res.json({ success: true, data: preview });
  }

  static async join(req: Request, res: Response): Promise<void> {
    const group = await QuinielaService.join(req.user!.id, req.user!.isPremium, req.body.inviteCode);
    res.json({ success: true, data: group });
  }

  static async getById(req: Request, res: Response): Promise<void> {
    const group = await QuinielaService.getById(req.params.id, req.user!.id);
    if (!group) throw ApiError.notFound('Quiniela group');
    res.json({ success: true, data: group });
  }

  static async getStandings(req: Request, res: Response): Promise<void> {
    const data = await QuinielaService.getStandings(req.params.id, req.user!.id);
    res.json({ success: true, data });
  }

  static async getPredictions(req: Request, res: Response): Promise<void> {
    const data = await QuinielaService.getPredictions(req.params.id, req.user!.id);
    res.json({ success: true, data });
  }

  static async leave(req: Request, res: Response): Promise<void> {
    await QuinielaService.leave(req.params.id, req.user!.id);
    res.json({ success: true, message: 'Left group successfully' });
  }

  static async delete(req: Request, res: Response): Promise<void> {
    await QuinielaService.delete(req.params.id, req.user!.id);
    res.json({ success: true, message: 'Group deleted' });
  }

  static async update(req: Request, res: Response): Promise<void> {
    const group = await QuinielaService.update(req.params.id, req.user!.id, req.body);
    res.json({ success: true, data: group });
  }

  static async removeMember(req: Request, res: Response): Promise<void> {
    await QuinielaService.removeMember(req.params.id, req.user!.id, req.params.userId);
    res.json({ success: true, message: 'Member removed' });
  }
}
