import { Request, Response } from 'express';
import { TeamService } from '../services/teams.service';
import { ApiError } from '../utils/ApiError';

export class TeamController {
  static async list(req: Request, res: Response): Promise<void> {
    const { region, group, tournamentId, search } = req.query;
    const teams = await TeamService.list({ region: region as string, group: group as string, tournamentId: tournamentId as string, search: search as string });
    res.json({ success: true, data: teams });
  }

  static async getStandings(req: Request, res: Response): Promise<void> {
    const standings = await TeamService.getStandings(req.params.tournamentId);
    res.json({ success: true, data: standings });
  }

  static async getByGroup(req: Request, res: Response): Promise<void> {
    const { tournamentId } = req.query;
    const teams = await TeamService.getByGroup(req.params.group, tournamentId as string);
    res.json({ success: true, data: teams });
  }

  static async getById(req: Request, res: Response): Promise<void> {
    const team = await TeamService.getById(req.params.id);
    if (!team) throw ApiError.notFound('Team');
    res.json({ success: true, data: team });
  }

  static async getPlayers(req: Request, res: Response): Promise<void> {
    const players = await TeamService.getPlayers(req.params.id);
    res.json({ success: true, data: players });
  }

  static async getMatches(req: Request, res: Response): Promise<void> {
    const matches = await TeamService.getMatches(req.params.id, req.query.tournamentId as string);
    res.json({ success: true, data: matches });
  }

  static async getStats(req: Request, res: Response): Promise<void> {
    const stats = await TeamService.getStats(req.params.id, req.query.tournamentId as string);
    res.json({ success: true, data: stats });
  }
}
