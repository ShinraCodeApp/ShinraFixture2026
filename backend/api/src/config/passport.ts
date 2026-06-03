import passport from 'passport';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as FacebookStrategy } from 'passport-facebook';
import { config } from './index';
import { prisma } from './database';
import { logger } from '../utils/logger';

export function setupPassport(): void {
  // ── JWT Strategy ──────────────────────────────────
  passport.use(
    new JwtStrategy(
      {
        jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
        secretOrKey: config.jwt.secret,
        issuer: config.appName,
        audience: 'shinra-client',
      },
      async (payload, done) => {
        try {
          const user = await prisma.user.findUnique({
            where: { id: payload.userId },
            select: { id: true, email: true, username: true, role: true, isPremium: true, isBanned: true },
          });
          if (!user || user.isBanned) return done(null, false);
          return done(null, user);
        } catch (err) {
          return done(err, false);
        }
      }
    )
  );

  // ── Google Strategy ───────────────────────────────
  if (config.oauth.google.clientId) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: config.oauth.google.clientId,
          clientSecret: config.oauth.google.clientSecret,
          callbackURL: config.oauth.google.callbackUrl,
          scope: ['profile', 'email'],
        },
        async (_accessToken, _refreshToken, profile, done) => {
          try {
            const email = profile.emails?.[0]?.value;
            if (!email) return done(new Error('No email from Google'), false);

            done(null, {
              provider: 'google',
              providerId: profile.id,
              email,
              displayName: profile.displayName,
              avatar: profile.photos?.[0]?.value,
            } as any);
          } catch (err) {
            done(err as Error, false);
          }
        }
      )
    );
  }

  // ── Facebook Strategy ─────────────────────────────
  if (config.oauth.facebook.appId) {
    passport.use(
      new FacebookStrategy(
        {
          clientID: config.oauth.facebook.appId,
          clientSecret: config.oauth.facebook.appSecret,
          callbackURL: `${config.clientUrl}/api/v1/auth/facebook/callback`,
          profileFields: ['id', 'emails', 'name', 'picture'],
        },
        async (_accessToken, _refreshToken, profile, done) => {
          try {
            const email = profile.emails?.[0]?.value ?? `fb_${profile.id}@shinra.app`;
            done(null, {
              provider: 'facebook',
              providerId: profile.id,
              email,
              displayName: `${profile.name?.givenName ?? ''} ${profile.name?.familyName ?? ''}`.trim(),
              avatar: profile.photos?.[0]?.value,
            } as any);
          } catch (err) {
            done(err as Error, false);
          }
        }
      )
    );
  }

  logger.info('Passport strategies configured');
}
