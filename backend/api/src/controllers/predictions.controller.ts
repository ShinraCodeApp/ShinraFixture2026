import { Request, Response } from 'express';
import { PredictionService } from '../services/predictions.service';

export class PredictionController {
  static async getUserPredictions(req: Request, res: Response): Promise<void> {
    const { page = '1', limit = '20' } = req.query;
    const predictions = await PredictionService.getUserPredictions(
      req.user!.id,
      parseInt(page as string),
      parseInt(limit as string),
    );
    res.json({ success: true, data: predictions });
  }

  static async getForMatch(req: Request, res: Response): Promise<void> {
    const prediction = await PredictionService.getForMatch(req.user!.id, req.params.matchId);
    res.json({ success: true, data: prediction });
  }

  static async createOrUpdate(req: Request, res: Response): Promise<void> {
    const prediction = await PredictionService.createOrUpdate(req.user!.id, req.body);
    res.json({ success: true, data: prediction });
  }

  static async batchCreate(req: Request, res: Response): Promise<void> {
    const predictions = await PredictionService.batchCreate(req.user!.id, req.body.predictions);
    res.json({ success: true, data: predictions });
  }

  static async getGlobalRanking(req: Request, res: Response): Promise<void> {
    const { page = '1', limit = '20', tournamentId } = req.query;
    const ranking = await PredictionService.getGlobalRanking(
      tournamentId as string | undefined,
      parseInt(page as string),
      parseInt(limit as string),
    );
    res.json({ success: true, data: ranking });
  }

  static async getMyRanking(req: Request, res: Response): Promise<void> {
    const ranking = await PredictionService.getMyRanking(req.user!.id);
    res.json({ success: true, data: ranking });
  }

  static async delete(req: Request, res: Response): Promise<void> {
    await PredictionService.delete(req.user!.id, req.params.matchId);
    res.json({ success: true });
  }
}
