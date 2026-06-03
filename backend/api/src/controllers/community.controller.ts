import { Request, Response } from 'express';
import { CommunityService } from '../services/community.service';
import { ApiError } from '../utils/ApiError';

export class CommunityController {
  static async listPosts(req: Request, res: Response): Promise<void> {
    const { category, search, page = '1', limit = '20' } = req.query;
    const data = await CommunityService.listPosts({
      category: category as string,
      search: search as string,
      page: parseInt(page as string),
      limit: parseInt(limit as string),
    });
    res.json({ success: true, data });
  }

  static async createPost(req: Request, res: Response): Promise<void> {
    const post = await CommunityService.createPost(req.user!.id, req.body);
    res.status(201).json({ success: true, data: post });
  }

  static async getPost(req: Request, res: Response): Promise<void> {
    const post = await CommunityService.getPost(req.params.id);
    if (!post) throw ApiError.notFound('Post');
    res.json({ success: true, data: post });
  }

  static async addReply(req: Request, res: Response): Promise<void> {
    const reply = await CommunityService.addReply(req.params.id, req.user!.id, req.body.content, req.body.parentId);
    res.status(201).json({ success: true, data: reply });
  }

  static async deletePost(req: Request, res: Response): Promise<void> {
    await CommunityService.deletePost(req.params.id, req.user!.id, req.user!.role);
    res.json({ success: true });
  }

  static async listPolls(req: Request, res: Response): Promise<void> {
    const data = await CommunityService.listPolls(req.query.matchId as string);
    res.json({ success: true, data });
  }

  static async getPoll(req: Request, res: Response): Promise<void> {
    const poll = await CommunityService.getPoll(req.params.id, req.user?.id);
    if (!poll) throw ApiError.notFound('Poll');
    res.json({ success: true, data: poll });
  }

  static async vote(req: Request, res: Response): Promise<void> {
    await CommunityService.vote(req.params.id, req.user!.id, req.body.option);
    res.json({ success: true, message: 'Vote recorded' });
  }

  static async deleteComment(req: Request, res: Response): Promise<void> {
    await CommunityService.deleteComment(req.params.id, req.user!.id, req.user!.role);
    res.json({ success: true });
  }

  static async reactToComment(req: Request, res: Response): Promise<void> {
    await CommunityService.reactToComment(req.params.id, req.user!.id, req.body.type);
    res.json({ success: true });
  }

  static async reportComment(req: Request, res: Response): Promise<void> {
    await CommunityService.reportComment(req.params.id, req.user!.id, req.body.reason);
    res.json({ success: true, message: 'Report submitted' });
  }
}
