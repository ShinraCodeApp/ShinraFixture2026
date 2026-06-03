import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { config } from './index';

declare global {
  var __prisma: PrismaClient | undefined;
}

export const prisma =
  global.__prisma ||
  new PrismaClient({
    log:
      config.nodeEnv === 'development'
        ? [
            { emit: 'event', level: 'query' },
            { emit: 'event', level: 'error' },
            { emit: 'event', level: 'warn' },
          ]
        : [{ emit: 'event', level: 'error' }],
  });

if (config.nodeEnv === 'development') {
  global.__prisma = prisma;

  (prisma as any).$on('query', (e: any) => {
    if (config.logging.level === 'debug') {
      logger.debug(`Query: ${e.query} | Duration: ${e.duration}ms`);
    }
  });
}

(prisma as any).$on('error', (e: any) => {
  logger.error('Prisma error:', e);
});

export async function connectDatabase(): Promise<void> {
  try {
    await prisma.$connect();
    logger.info('PostgreSQL connected successfully');
  } catch (error) {
    logger.error('Failed to connect to PostgreSQL:', error);
    process.exit(1);
  }
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
  logger.info('PostgreSQL disconnected');
}
