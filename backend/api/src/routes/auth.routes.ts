import { Router } from 'express';
import passport from 'passport';
import { AuthController } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';
import { authRateLimiter } from '../middleware/rateLimiter';
import { validateBody } from '../middleware/validate';
import { z } from 'zod';

const registerSchema = z.object({
  email: z.string().email(),
  // Allow @@ gifted-premium prefix
  username: z.string().min(3).max(38).regex(/^(@@)?[a-zA-Z0-9_]+$/),
  displayName: z.string().min(2).max(50),
  password: z.string().min(8),
});

const giftCodeSchema = z.object({
  // @@@ = grant, @@@@@ = revoke; optionally followed by target username
  code: z.string().regex(/^(@@@@@|@@@)[a-zA-Z0-9_]*$/),
});

const loginSchema = z.object({
  identifier: z.string().min(1).optional(),
  email: z.string().optional(),
  password: z.string().min(1),
  rememberMe: z.preprocess(val => val === true || val === 'true', z.boolean()).optional().default(false),
}).transform(data => ({
  ...data,
  identifier: data.identifier ?? data.email ?? '',
})).refine(data => !!data.identifier, { message: 'Email o usuario requerido' });

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
authRoutes.get('/g-logout', authenticate, AuthController.logout);
authRoutes.post('/gift-code', authenticate, validateBody(giftCodeSchema), AuthController.giftCode);
authRoutes.get('/g-gift-code', authenticate, queryToBody, validateBody(giftCodeSchema), AuthController.giftCode);
authRoutes.post('/forgot-password', authRateLimiter, AuthController.forgotPassword);
authRoutes.post('/reset-password', authRateLimiter, AuthController.resetPassword);
authRoutes.post('/verify-email', AuthController.verifyEmail);
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
