import { createClient, RedisClientType } from 'redis';
import { logger } from '../utils/logger';
import { config } from './index';

let redisClient: RedisClientType | null = null;
let redisAvailable = false;

export function getRedisClient(): RedisClientType | null {
  return redisClient;
}

export async function connectRedis(): Promise<void> {
  try {
    redisClient = createClient({
      url: config.redis.url,
      socket: {
        connectTimeout: 3000,
        reconnectStrategy: (retries) => {
          if (retries > 3) return false;
          return Math.min(retries * 200, 1000);
        },
      },
    }) as RedisClientType;

    redisClient.on('error', () => {});
    redisClient.on('connect', () => {
      redisAvailable = true;
      logger.info('Redis connected');
    });

    await redisClient.connect();
    redisAvailable = true;
  } catch {
    logger.warn('Redis not available — running without cache');
    redisClient = null;
    redisAvailable = false;
  }
}

export class CacheService {
  private defaultTtl: number;

  constructor(ttl?: number) {
    this.defaultTtl = ttl ?? config.redis.ttl;
  }

  async get<T>(key: string): Promise<T | null> {
    if (!redisClient || !redisAvailable) return null;
    try {
      const value = await redisClient.get(key);
      if (!value) return null;
      return JSON.parse(value) as T;
    } catch { return null; }
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    if (!redisClient || !redisAvailable) return;
    try {
      await redisClient.setEx(key, ttl ?? this.defaultTtl, JSON.stringify(value));
    } catch {}
  }

  async del(key: string): Promise<void> {
    if (!redisClient || !redisAvailable) return;
    try { await redisClient.del(key); } catch {}
  }

  async delPattern(pattern: string): Promise<void> {
    if (!redisClient || !redisAvailable) return;
    try {
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) await redisClient.del(keys);
    } catch {}
  }

  async exists(key: string): Promise<boolean> {
    if (!redisClient || !redisAvailable) return false;
    try {
      return (await redisClient.exists(key)) === 1;
    } catch { return false; }
  }

  async ttl(key: string): Promise<number> {
    if (!redisClient || !redisAvailable) return -1;
    try { return redisClient.ttl(key); } catch { return -1; }
  }

  async incr(key: string): Promise<number> {
    if (!redisClient || !redisAvailable) return 0;
    try { return redisClient.incr(key); } catch { return 0; }
  }

  async hSet(key: string, field: string, value: string): Promise<void> {
    if (!redisClient || !redisAvailable) return;
    try { await redisClient.hSet(key, field, value); } catch {}
  }

  async hGet(key: string, field: string): Promise<string | null> {
    if (!redisClient || !redisAvailable) return null;
    try { return redisClient.hGet(key, field); } catch { return null; }
  }

  async hGetAll(key: string): Promise<Record<string, string>> {
    if (!redisClient || !redisAvailable) return {};
    try { return redisClient.hGetAll(key); } catch { return {}; }
  }

  async publish(channel: string, message: string): Promise<void> {
    if (!redisClient || !redisAvailable) return;
    try { await redisClient.publish(channel, message); } catch {}
  }
}
