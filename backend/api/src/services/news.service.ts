import { Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import { CacheService } from '../config/redis';
import { ApiError } from '../utils/ApiError';

const cache = new CacheService(300);

export class NewsService {
  static async list(params: {
    page: number; limit: number; category?: string;
    premium?: boolean; featured?: boolean; search?: string;
    userId?: string;
  }) {
    const where: Prisma.NewsWhereInput = { isPublished: true };
    if (params.category) where.category = params.category;
    if (params.featured) where.isFeatured = true;
    if (params.search) {
      where.OR = [
        { title: { contains: params.search, mode: 'insensitive' } },
        { excerpt: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    // Non-premium users can't access premium content
    if (!params.userId) where.isPremium = false;

    const skip = (params.page - 1) * params.limit;
    const [items, total] = await Promise.all([
      prisma.news.findMany({
        where,
        select: {
          id: true, title: true, slug: true, excerpt: true, imageUrl: true,
          author: true, category: true, tags: true, isPremium: true,
          isFeatured: true, viewsCount: true, publishedAt: true,
        },
        orderBy: [{ isFeatured: 'desc' }, { publishedAt: 'desc' }],
        skip,
        take: params.limit,
      }),
      prisma.news.count({ where }),
    ]);

    return { items, pagination: { page: params.page, limit: params.limit, total, pages: Math.ceil(total / params.limit) } };
  }

  static async getFeatured() {
    const cacheKey = 'news:featured';
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    const items = await prisma.news.findMany({
      where: { isPublished: true, isFeatured: true, isPremium: false },
      select: {
        id: true, title: true, slug: true, excerpt: true, imageUrl: true,
        author: true, category: true, publishedAt: true,
      },
      orderBy: { publishedAt: 'desc' },
      take: 6,
    });

    await cache.set(cacheKey, items, 300);
    return items;
  }

  static async getCategories() {
    const cats = await prisma.news.groupBy({
      by: ['category'],
      where: { isPublished: true, category: { not: null } },
      _count: true,
      orderBy: { _count: { category: 'desc' } },
    });

    return cats.map((c) => ({ name: c.category, count: c._count }));
  }

  static async getBySlug(slug: string, userId?: string) {
    const news = await prisma.news.findUnique({ where: { slug } });
    if (!news || !news.isPublished) return null;

    if (news.isPremium && !userId) throw new ApiError(402, 'Premium content');

    await prisma.news.update({ where: { id: news.id }, data: { viewsCount: { increment: 1 } } });
    return news;
  }

  static async create(dto: any) {
    const slug = dto.title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .slice(0, 100) + `-${Date.now()}`;

    return prisma.news.create({ data: { ...dto, slug } });
  }

  static async update(id: string, dto: any) {
    return prisma.news.update({ where: { id }, data: dto });
  }

  static async publish(id: string) {
    return prisma.news.update({
      where: { id },
      data: { isPublished: true, publishedAt: new Date() },
    });
  }

  static async delete(id: string): Promise<void> {
    await prisma.news.delete({ where: { id } });
    await cache.delPattern('news:*');
  }
}
