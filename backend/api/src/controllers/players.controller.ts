import { Request, Response } from 'express';
import { PlayerService } from '../services/players.service';
import { ApiError } from '../utils/ApiError';

export class PlayerController {
  static async list(req: Request, res: Response): Promise<void> {
    const { teamId, position, search, page = '1', limit = '30' } = req.query;
    const data = await PlayerService.list({
      teamId: teamId as string,
      position: position as string,
      search: search as string,
      page: parseInt(page as string),
      limit: Math.min(parseInt(limit as string), 100),
    });
    res.json({ success: true, data });
  }

  static async getTopScorers(req: Request, res: Response): Promise<void> {
    const { tournamentId, limit = '20' } = req.query;
    const data = await PlayerService.getTopScorers(tournamentId as string, parseInt(limit as string));
    res.json({ success: true, data });
  }

  static async getTopAssists(req: Request, res: Response): Promise<void> {
    const { tournamentId, limit = '20' } = req.query;
    const data = await PlayerService.getTopAssists(tournamentId as string, parseInt(limit as string));
    res.json({ success: true, data });
  }

  static async getTopRated(req: Request, res: Response): Promise<void> {
    const { tournamentId, limit = '20' } = req.query;
    const data = await PlayerService.getTopRated(tournamentId as string, parseInt(limit as string));
    res.json({ success: true, data });
  }

  static async getById(req: Request, res: Response): Promise<void> {
    const player = await PlayerService.getById(req.params.id);
    if (!player) throw ApiError.notFound('Player');
    res.json({ success: true, data: player });
  }

  static async getStats(req: Request, res: Response): Promise<void> {
    const stats = await PlayerService.getStats(req.params.id, req.query.tournamentId as string);
    res.json({ success: true, data: stats });
  }

  static async getMatches(req: Request, res: Response): Promise<void> {
    const data = await PlayerService.getMatches(req.params.id);
    res.json({ success: true, data });
  }
}
