import { Request, Response } from 'express';
import { SimulatorService } from '../services/simulator.service';
import { ApiError } from '../utils/ApiError';

export class SimulatorController {
  static async run(req: Request, res: Response): Promise<void> {
    const { tournamentId, results } = req.body;
    if (!tournamentId) throw ApiError.badRequest('tournamentId required');
    const session = await SimulatorService.run(tournamentId, results, req.user?.id, false);
    res.json({ success: true, data: session });
  }

  static async runWithAI(req: Request, res: Response): Promise<void> {
    const { tournamentId, partialResults } = req.body;
    if (!tournamentId) throw ApiError.badRequest('tournamentId required');
    const session = await SimulatorService.run(tournamentId, partialResults ?? {}, req.user!.id, true);
    res.json({ success: true, data: session });
  }

  static async getByShareCode(req: Request, res: Response): Promise<void> {
    const session = await SimulatorService.getByShareCode(req.params.code);
    if (!session) throw ApiError.notFound('Simulation');
    res.json({ success: true, data: session });
  }

  static async mySessions(req: Request, res: Response): Promise<void> {
    const sessions = await SimulatorService.mySessions(req.user!.id);
    res.json({ success: true, data: sessions });
  }

  static async delete(req: Request, res: Response): Promise<void> {
    await SimulatorService.delete(req.params.id, req.user!.id);
    res.json({ success: true });
  }
}
