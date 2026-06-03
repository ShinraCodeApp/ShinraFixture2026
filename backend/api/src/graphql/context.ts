import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/database';
import { config } from '../config';

export interface GraphQLContext {
  userId?: string;
  user?: { id: string; email: string; role: string; isPremium: boolean } | null;
  prisma: typeof prisma;
}

export async function createContext({ req }: { req: Request; res: Response }): Promise<GraphQLContext> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return { prisma };
  }

  const token = authHeader.slice(7);
  try {
    const decoded = jwt.verify(token, config.jwt.secret) as { userId: string };
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, role: true, isPremium: true, isBanned: true },
    });

    if (!user || user.isBanned) return { prisma };
    return { userId: user.id, user, prisma };
  } catch {
    return { prisma };
  }
}
