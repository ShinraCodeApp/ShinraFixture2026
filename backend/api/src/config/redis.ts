import { createClient, RedisClientType } from 'redis';
import { logger } from '../utils/logger';
import { config } from './index';

let redisClient: RedisClientType;

export function getRedisClient(): RedisClientType {
  return redisClient;
}

export async function connectRedis(): Promise<void> {
  redisClient = createClient({
    url: config.redis.url,
    socket: {
      reconnectStrategy: (retries) => {
        if (retries > 10) {
          logger.error('Too many Redis reconnect attempts');
          return new Error('Too many retries');
        }
        return Math.min(retries * 100, 3000);
      },
    },
  }) as RedisClientType;

  redisClient.on('error', (err) => logger.error('Redis error:', err));
  redisClient.on('connect', () => logger.info('Redis connected'));
  redisClient.on('reconnecting', () => logger.warn('Redis reconnecting...'));

  await redisClient.connect();
}

export class CacheService {
  private client: RedisClientType;
  private defaultTtl: number;

  constructor(ttl?: number) {
    this.client = getRedisClient();
    this.defaultTtl = ttl ?? config.redis.ttl;
  }

  async get<T>(key: string): Promise<T | null> {
    const value = await this.client.get(key);
    if (!value) return null;
    return JSON.parse(value) as T;
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    await this.client.setEx(key, ttl ?? this.defaultTtl, JSON.stringify(value));
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async delPattern(pattern: string): Promise<void> {
    const keys = await this.client.keys(pattern);
    if (keys.length > 0) {
      await this.client.del(keys);
    }
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.client.exists(key);
    return result === 1;
  }

  async ttl(key: string): Promise<number> {
    return this.client.ttl(key);
  }

  async incr(key: string): Promise<number> {
    return this.client.incr(key);
  }

  async hSet(key: string, field: string, value: string): Promise<void> {
    await this.client.hSet(key, field, value);
  }

  async hGet(key: string, field: string): Promise<string | null> {
    return this.client.hGet(key, field);
  }

  async hGetAll(key: string): Promise<Record<string, string>> {
    return this.client.hGetAll(key);
  }

  async publish(channel: string, message: string): Promise<void> {
    await this.client.publish(channel, message);
  }
}
