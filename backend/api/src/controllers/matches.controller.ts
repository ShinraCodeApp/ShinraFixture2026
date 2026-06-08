import { Request, Response } from 'express';
import { MatchService } from '../services/matches.service';
import { ApiError } from '../utils/ApiError';

export class MatchController {
  static async list(req: Request, res: Response): Promise<void> {
    const { tournamentId, group, stage, status, date, teamId, page = '1', limit = '20' } = req.query;
    const matches = await MatchService.list({
      tournamentId: tournamentId as string,
      group: group as string,
      stage: stage as string,
      status: status as string,
      date: date as string,
      teamId: teamId as string,
      page: parseInt(page as string),
      limit: Math.min(parseInt(limit as string), 500),
      userId: req.user?.id,
    });
    res.json({ success: true, data: matches });
  }

  static async getLive(req: Request, res: Response): Promise<void> {
    const matches = await MatchService.getLive();
    res.json({ success: true, data: matches });
  }

  static async getToday(req: Request, res: Response): Promise<void> {
    const matches = await MatchService.getToday();
    res.json({ success: true, data: matches });
  }

  static async getUpcoming(req: Request, res: Response): Promise<void> {
    const { days = '7' } = req.query;
    const matches = await MatchService.getUpcoming(parseInt(days as string));
    res.json({ success: true, data: matches });
  }

  static async getByStage(req: Request, res: Response): Promise<void> {
    const matches = await MatchService.getByStage(req.params.stage, req.query.tournamentId as string);
    res.json({ success: true, data: matches });
  }

  static async getByGroup(req: Request, res: Response): Promise<void> {
    const matches = await MatchService.getByGroup(req.params.group, req.query.tournamentId as string);
    res.json({ success: true, data: matches });
  }

  static async getById(req: Request, res: Response): Promise<void> {
    const match = await MatchService.getById(req.params.id, req.user?.id);
    if (!match) throw ApiError.notFound('Match');
    res.json({ success: true, data: match });
  }

  static async getEvents(req: Request, res: Response): Promise<void> {
    const events = await MatchService.getEvents(req.params.id);
    res.json({ success: true, data: events });
  }

  static async getStats(req: Request, res: Response): Promise<void> {
    const stats = await MatchService.getStats(req.params.id);
    res.json({ success: true, data: stats });
  }

  static async getLineups(req: Request, res: Response): Promise<void> {
    const lineups = await MatchService.getLineups(req.params.id);
    res.json({ success: true, data: lineups });
  }

  static async getHeadToHead(req: Request, res: Response): Promise<void> {
    const h2h = await MatchService.getHeadToHead(req.params.id);
    res.json({ success: true, data: h2h });
  }

  static async getComments(req: Request, res: Response): Promise<void> {
    const { page = '1', limit = '20' } = req.query;
    const comments = await MatchService.getComments(req.params.id, parseInt(page as string), parseInt(limit as string));
    res.json({ success: true, data: comments });
  }

  static async addComment(req: Request, res: Response): Promise<void> {
    const comment = await MatchService.addComment(req.params.id, req.user!.id, req.body.content, req.body.parentId);
    res.status(201).json({ success: true, data: comment });
  }
}
