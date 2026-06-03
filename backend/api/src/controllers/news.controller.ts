import { Request, Response } from 'express';
import { NewsService } from '../services/news.service';
import { ApiError } from '../utils/ApiError';

export class NewsController {
  static async list(req: Request, res: Response): Promise<void> {
    const { page = '1', limit = '12', category, search, featured } = req.query;
    const data = await NewsService.list({
      page: parseInt(page as string),
      limit: Math.min(parseInt(limit as string), 50),
      category: category as string,
      search: search as string,
      featured: featured === 'true',
      userId: req.user?.id,
    });
    res.json({ success: true, data });
  }

  static async getFeatured(req: Request, res: Response): Promise<void> {
    const data = await NewsService.getFeatured();
    res.json({ success: true, data });
  }

  static async getCategories(req: Request, res: Response): Promise<void> {
    const data = await NewsService.getCategories();
    res.json({ success: true, data });
  }

  static async getBySlug(req: Request, res: Response): Promise<void> {
    const news = await NewsService.getBySlug(req.params.slug, req.user?.id);
    if (!news) throw ApiError.notFound('News article');
    res.json({ success: true, data: news });
  }

  static async create(req: Request, res: Response): Promise<void> {
    const news = await NewsService.create(req.body);
    res.status(201).json({ success: true, data: news });
  }

  static async update(req: Request, res: Response): Promise<void> {
    const news = await NewsService.update(req.params.id, req.body);
    res.json({ success: true, data: news });
  }

  static async publish(req: Request, res: Response): Promise<void> {
    const news = await NewsService.publish(req.params.id);
    res.json({ success: true, data: news });
  }

  static async delete(req: Request, res: Response): Promise<void> {
    await NewsService.delete(req.params.id);
    res.json({ success: true });
  }
}
