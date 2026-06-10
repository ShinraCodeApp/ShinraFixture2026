import { Router } from 'express';
import passport from 'passport';
import { AuthController } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';
import { authRateLimiter } from '../middleware/rateLimiter';
import { validateBody } from '../middleware/validate';
import { z } from 'zod';
import { prisma } from '../config/database';

const registerSchema = z.object({
  email: z.string().email(),
  // Allow optional @@ gifted prefix before the username
  username: z.string().min(3).max(32).regex(/^(@@)?[a-zA-Z0-9_]+$/),
  displayName: z.string().min(2).max(50),
  password: z.string().min(8),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const refreshSchema = z.object({
  refreshToken: z.string(),
});

export const authRoutes = Router();

// Local auth
authRoutes.post('/register', authRateLimiter, validateBody(registerSchema), AuthController.register);
authRoutes.post('/login', authRateLimiter, validateBody(loginSchema), AuthController.login);
authRoutes.post('/logout', authenticate, AuthController.logout);
authRoutes.post('/refresh', validateBody(refreshSchema), AuthController.refresh);

// GET aliases for LTE/carrier networks that block POST (query params, HTTPS-encrypted)
function queryToBody(req: any, _res: any, next: any) { req.body = req.query; next(); }
authRoutes.get('/g-register', authRateLimiter, queryToBody, validateBody(registerSchema), AuthController.register);
authRoutes.get('/g-login', authRateLimiter, queryToBody, validateBody(loginSchema), AuthController.login);
authRoutes.get('/g-refresh', queryToBody, validateBody(refreshSchema), AuthController.refresh);
authRoutes.post('/forgot-password', authRateLimiter, AuthController.forgotPassword);
authRoutes.post('/reset-password', authRateLimiter, AuthController.resetPassword);
authRoutes.post('/verify-email', AuthController.verifyEmail);

// Temporary maintenance: delete user by email (requires secret)
authRoutes.get('/g-delete-user', async (req: any, res: any) => {
  if (req.query.secret !== 'shinra-admin-2026') {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }
  const email = String(req.query.email ?? '').toLowerCase();
  if (!email) return res.status(400).json({ success: false, message: 'Email required' });
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  await prisma.user.delete({ where: { email } });
  res.json({ success: true, message: `Deleted user: ${email}` });
});
authRoutes.get('/me', authenticate, AuthController.me);

// Google OAuth
authRoutes.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
authRoutes.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/login' }),
  AuthController.oauthCallback
);

// Facebook OAuth
authRoutes.get('/facebook', passport.authenticate('facebook', { scope: ['email'] }));
authRoutes.get(
  '/facebook/callback',
  passport.authenticate('facebook', { session: false, failureRedirect: '/login' }),
  AuthController.oauthCallback
);

// Apple OAuth
authRoutes.post('/apple', authRateLimiter, AuthController.appleSignIn);
