import { Router } from 'express';
import { optionalAuth } from '../middleware/auth';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';

export const analyticsRoutes = Router();
analyticsRoutes.use(optionalAuth);

// Batch event ingestion
analyticsRoutes.post('/events', async (req: any, res) => {
  try {
    const userId = req.user?.id ?? null;
    const { events = [], platform } = req.body;

    if (!Array.isArray(events) || events.length === 0) {
      return res.json({ success: true, saved: 0 });
    }

    await prisma.appEvent.createMany({
      data: events.slice(0, 50).map((e: any) => ({
        userId,
        event: String(e.event ?? 'unknown'),
        properties: e.properties ?? {},
        platform: platform ?? 'unknown',
        occurredAt: e.ts ? new Date(e.ts) : new Date(),
      })),
      skipDuplicates: false,
    });

    res.json({ success: true, saved: events.length });
  } catch (e: any) {
    logger.warn('Analytics ingest error:', e.message);
    res.json({ success: true, saved: 0 }); // Always 200 — analytics must never break clients
  }
});

// Basic stats for admin
analyticsRoutes.get('/summary', async (req: any, res) => {
  try {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [total, byEvent, byPlatform] = await Promise.all([
      prisma.appEvent.count({ where: { occurredAt: { gte: since } } }),
      prisma.appEvent.groupBy({ by: ['event'], _count: true, where: { occurredAt: { gte: since } }, orderBy: { _count: { event: 'desc' } }, take: 20 }),
      prisma.appEvent.groupBy({ by: ['platform'], _count: true, where: { occurredAt: { gte: since } } }),
    ]);
    res.json({ success: true, data: { total, byEvent, byPlatform, since } });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});
