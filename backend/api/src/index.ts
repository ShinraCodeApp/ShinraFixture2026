import 'express-async-errors';
import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { ApolloServer } from 'apollo-server-express';
import { Server as SocketServer } from 'socket.io';

import { config } from './config';
import { logger } from './utils/logger';
import { connectDatabase } from './config/database';
import { connectRedis } from './config/redis';
import { initFirebase } from './utils/firebase';
import { typeDefs } from './graphql/schema';
import { resolvers } from './graphql/resolvers';
import { createContext } from './graphql/context';
import { router } from './routes';
import { errorHandler } from './middleware/errorHandler';
import { rateLimiter } from './middleware/rateLimiter';
import { setupSocketHandlers } from './socket/handlers';
import { startCronJobs } from './jobs/cron';
import * as Sentry from '@sentry/node';

async function bootstrap() {
  // ── Sentry ─────────────────────────────────────────
  if (config.sentry.dsn) {
    Sentry.init({ dsn: config.sentry.dsn, environment: config.nodeEnv });
  }

  // ── Express App ────────────────────────────────────
  const app = express();
  const httpServer = http.createServer(app);

  // ── Socket.IO ──────────────────────────────────────
  const io = new SocketServer(httpServer, {
    cors: { origin: config.clientUrl, credentials: true },
    transports: ['websocket', 'polling'],
  });
  app.set('io', io);

  // ── Core Middleware ────────────────────────────────
  app.use(Sentry.Handlers.requestHandler());
  app.use(helmet({ contentSecurityPolicy: config.nodeEnv === 'production' }));
  app.use(
    cors({
      origin: [config.clientUrl, config.adminUrl],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );
  app.use(compression());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(morgan('combined', { stream: { write: (msg) => logger.http(msg.trim()) } }));

  // ── Rate Limiting ──────────────────────────────────
  app.use(rateLimiter);

  // ── Health Check ───────────────────────────────────
  app.get('/health', (_req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: config.appVersion,
      uptime: process.uptime(),
      environment: config.nodeEnv,
    });
  });

  // ── REST API Routes ────────────────────────────────
  app.use(config.apiPrefix, router);

  // ── GraphQL ────────────────────────────────────────
  const apolloServer = new ApolloServer({
    typeDefs,
    resolvers,
    context: createContext,
    formatError: (err) => {
      logger.error('GraphQL Error', err);
      return config.nodeEnv === 'production'
        ? { message: 'Internal server error', extensions: { code: err.extensions?.code } }
        : err;
    },
    introspection: config.nodeEnv !== 'production',
    playground: config.nodeEnv !== 'production',
  });

  await apolloServer.start();
  apolloServer.applyMiddleware({ app, path: '/graphql', cors: false });

  // ── Socket Handlers ────────────────────────────────
  setupSocketHandlers(io);

  // ── Error Handler ──────────────────────────────────
  app.use(Sentry.Handlers.errorHandler());
  app.use(errorHandler);

  // ── 404 Handler ────────────────────────────────────
  app.use('*', (_req, res) => {
    res.status(404).json({ success: false, message: 'Route not found' });
  });

  // ── Connect Services ───────────────────────────────
  await connectDatabase();
  await connectRedis();
  initFirebase();

  // ── Start Cron Jobs ────────────────────────────────
  startCronJobs();

  // ── Start Server ───────────────────────────────────
  httpServer.listen(config.port, () => {
    logger.info(`
╔═══════════════════════════════════════════════════════╗
║          ShinraFixture 2026 - API Server              ║
╠═══════════════════════════════════════════════════════╣
║  Environment : ${config.nodeEnv.padEnd(38)}║
║  Port        : ${String(config.port).padEnd(38)}║
║  API         : ${(config.apiPrefix).padEnd(38)}║
║  GraphQL     : /graphql${' '.repeat(31)}║
║  Health      : /health${' '.repeat(32)}║
╚═══════════════════════════════════════════════════════╝
    `);
  });

  // ── Graceful Shutdown ──────────────────────────────
  const signals = ['SIGTERM', 'SIGINT'] as const;
  signals.forEach((signal) => {
    process.on(signal, async () => {
      logger.info(`${signal} received. Shutting down gracefully...`);
      httpServer.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
      });
    });
  });
}

bootstrap().catch((err) => {
  logger.error('Failed to start server:', err);
  process.exit(1);
});
