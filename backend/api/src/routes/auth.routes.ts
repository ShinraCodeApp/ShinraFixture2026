import { Router } from 'express';
import passport from 'passport';
import { AuthController } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';
import { authRateLimiter } from '../middleware/rateLimiter';
import { validateBody } from '../middleware/validate';
import { z } from 'zod';

const registerSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/),
  displayName: z.string().min(2).max(50),
  password: z.string().min(8).regex(/^(?=.*[A-Za-z])(?=.*\d).+$/),
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
