import { Server as SocketServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { prisma } from '../config/database';
import { CacheService } from '../config/redis';
import { logger } from '../utils/logger';

const cache = new CacheService();

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

export function setupSocketHandlers(io: SocketServer): void {
  // ── Authentication Middleware ─────────────────────────
  io.use(async (socket: AuthenticatedSocket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');

    if (token) {
      try {
        const payload = jwt.verify(token, config.jwt.secret) as { userId: string };
        socket.userId = payload.userId;
      } catch {
        // Non-authenticated connections are allowed (read-only)
      }
    }
    next();
  });

  // ── Connection ────────────────────────────────────────
  io.on('connection', (socket: AuthenticatedSocket) => {
    const clientId = socket.id;
    const userId = socket.userId;

    logger.debug(`Socket connected: ${clientId} (user: ${userId ?? 'anonymous'})`);

    // ── Join Match Room ─────────────────────────────────
    socket.on('join-match', async (matchId: string) => {
      if (!matchId || typeof matchId !== 'string') return;

      const room = `match:${matchId}`;
      await socket.join(room);

      // Send current match state
      try {
        const match = await prisma.match.findUnique({
          where: { id: matchId },
          include: {
            homeTeam: { select: { id: true, name: true, code: true, flagUrl: true } },
            awayTeam: { select: { id: true, name: true, code: true, flagUrl: true } },
            events: { orderBy: { minute: 'asc' }, take: 20 },
            stats: true,
          },
        });

        if (match) {
          socket.emit('match:current', match);
          await cache.hSet('live-viewers', matchId, String((io.sockets.adapter.rooms.get(room)?.size ?? 0)));
        }
      } catch (err) {
        logger.warn('Error fetching match for socket:', err);
      }
    });

    // ── Leave Match Room ────────────────────────────────
    socket.on('leave-match', (matchId: string) => {
      socket.leave(`match:${matchId}`);
    });

    // ── Join Global Live Room ────────────────────────────
    socket.on('join-global', () => {
      socket.join('global:live');
    });

    // ── Join User Room (personal notifications) ──────────
    if (userId) {
      socket.join(`user:${userId}`);
    }

    // ── Subscribe to Favorite Teams ───────────────────────
    socket.on('subscribe-team', (teamId: string) => {
      socket.join(`team:${teamId}`);
    });

    // ── Watch Party: join with viewer count ──────────────
    socket.on('join-match', async (matchId: string) => {
      // Already handled above, but emit count after join
      const room = `match:${matchId}`;
      const count = io.sockets.adapter.rooms.get(room)?.size ?? 0;
      io.to(room).emit('match:viewers', { count });
    });

    // ── Watch Party: emoji reactions ──────────────────────
    socket.on('watch:reaction', (data: { matchId: string; emoji: string }) => {
      if (!data.matchId || !data.emoji) return;
      const allowed = ['⚽', '👏', '😱', '❤️', '🔥', '😤', '🎉', '💪', '🟨', '🟥'];
      if (!allowed.includes(data.emoji)) return;
      socket.to(`match:${data.matchId}`).emit('match:reaction', {
        emoji: data.emoji,
        userId: userId ?? null,
      });
    });

    // ── Typing in comments ────────────────────────────────
    socket.on('comment:typing', (data: { matchId: string }) => {
      if (!userId) return;
      socket.to(`match:${data.matchId}`).emit('comment:user-typing', { userId });
    });

    // ── Ping/Pong for keep-alive ──────────────────────────
    socket.on('ping', () => socket.emit('pong'));

    // ── Disconnect: update viewer counts ─────────────────
    socket.on('disconnect', (reason) => {
      logger.debug(`Socket disconnected: ${clientId} — ${reason}`);
      // Emit updated viewer count to all match rooms this socket was in
      socket.rooms.forEach((room) => {
        if (room.startsWith('match:')) {
          const count = Math.max(0, (io.sockets.adapter.rooms.get(room)?.size ?? 1) - 1);
          io.to(room).emit('match:viewers', { count });
        }
      });
    });
  });

  // ── Server-side Emitters (exported for use in controllers) ──
  setupEmitters(io);
}

function setupEmitters(io: SocketServer): void {
  // Attach io to global for easy access in controllers
  (global as any).io = io;
}

// ── Utility functions for emitting events ──────────────
export function emitMatchEvent(io: SocketServer, matchId: string, event: any): void {
  io.to(`match:${matchId}`).emit('match:event', event);
}

export function emitScoreUpdate(io: SocketServer, matchId: string, data: {
  homeScore: number; awayScore: number; minute: number;
}): void {
  io.to(`match:${matchId}`).emit('match:score', data);
  io.to('global:live').emit('global:score-update', { matchId, ...data });
}

export function emitMatchStatusChange(io: SocketServer, matchId: string, status: string): void {
  io.to(`match:${matchId}`).emit('match:status', { status });
  io.to('global:live').emit('global:match-status', { matchId, status });
}

export function emitUserNotification(io: SocketServer, userId: string, notification: any): void {
  io.to(`user:${userId}`).emit('notification', notification);
}

export function emitLiveViewerCount(io: SocketServer, matchId: string, count: number): void {
  io.to(`match:${matchId}`).emit('match:viewers', { count });
}
