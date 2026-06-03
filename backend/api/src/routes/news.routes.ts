import { Router } from 'express';
import { NewsController } from '../controllers/news.controller';
import { optionalAuth, authenticate, requireRole } from '../middleware/auth';

export const newsRoutes = Router();

newsRoutes.get('/', optionalAuth, NewsController.list);
newsRoutes.get('/featured', NewsController.getFeatured);
newsRoutes.get('/categories', NewsController.getCategories);
newsRoutes.get('/:slug', optionalAuth, NewsController.getBySlug);

// Admin only
newsRoutes.post('/', authenticate, requireRole('ADMIN', 'SUPER_ADMIN'), NewsController.create);
newsRoutes.patch('/:id', authenticate, requireRole('ADMIN', 'SUPER_ADMIN'), NewsController.update);
newsRoutes.delete('/:id', authenticate, requireRole('ADMIN', 'SUPER_ADMIN'), NewsController.delete);
newsRoutes.patch('/:id/publish', authenticate, requireRole('ADMIN', 'SUPER_ADMIN'), NewsController.publish);
