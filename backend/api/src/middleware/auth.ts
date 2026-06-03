import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { prisma } from '../config/database';
import { ApiError } from '../utils/ApiError';
import { logger } from '../utils/logger';

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  role: string;
  isPremium: boolean;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      token?: string;
    }
  }
}

export function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  return null;
}

export async function authenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const token = extractToken(req);
  if (!token) throw new ApiError(401, 'Authentication required');

  try {
    const decoded = jwt.verify(token, config.jwt.secret) as { userId: string };
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        isPremium: true,
        isBanned: true,
      },
    });

    if (!user) throw new ApiError(401, 'User not found');
    if (user.isBanned) throw new ApiError(403, 'Account suspended');

    req.user = user;
    req.token = token;
    next();
  } catch (err) {
    if (err instanceof ApiError) return next(err);
    if (err instanceof jwt.TokenExpiredError) return next(new ApiError(401, 'Token expired'));
    if (err instanceof jwt.JsonWebTokenError) return next(new ApiError(401, 'Invalid token'));
    next(err);
  }
}

export async function optionalAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const token = extractToken(req);
  if (!token) return next();

  try {
    const decoded = jwt.verify(token, config.jwt.secret) as { userId: string };
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, username: true, role: true, isPremium: true, isBanned: true },
    });

    if (user && !user.isBanned) req.user = user;
    next();
  } catch {
    next();
  }
}

export function requireRole(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) throw new ApiError(401, 'Authentication required');
    if (!roles.includes(req.user.role)) throw new ApiError(403, 'Insufficient permissions');
    next();
  };
}

export function requirePremium(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) throw new ApiError(401, 'Authentication required');
  if (!req.user.isPremium && req.user.role !== 'ADMIN') {
    throw new ApiError(402, 'Premium subscription required');
  }
  next();
}
