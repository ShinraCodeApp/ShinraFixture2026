import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../config/database';
import { CacheService } from '../config/redis';
import { generateTokenPair, verifyRefreshToken } from '../utils/jwt';
import { ApiError } from '../utils/ApiError';
import { EmailService } from './email.service';
import { logger } from '../utils/logger';

const cache = new CacheService();

interface RegisterDto {
  email: string;
  username: string;
  displayName: string;
  password: string;
}

interface OAuthUserDto {
  provider: 'google' | 'facebook' | 'apple';
  providerId: string;
  email: string;
  displayName: string;
  avatar?: string;
}

export class AuthService {
  static readonly MAX_GIFT_SLOTS = parseInt(process.env.MAX_GIFT_SLOTS ?? '10', 10);

  private static async countGiftedUsers(): Promise<number> {
    return prisma.user.count({ where: { isGifted: true } });
  }

  static async register(dto: RegisterDto) {
    const isGifted = dto.username.startsWith('@@');
    const cleanUsernameCheck = isGifted
      ? dto.username.slice(2).toLowerCase()
      : dto.username.toLowerCase();
    const existing = await prisma.user.findFirst({
      where: { OR: [{ email: dto.email }, { username: cleanUsernameCheck }] },
    });

    if (existing) {
      if (existing.email === dto.email) throw ApiError.conflict('Email already registered');
      throw ApiError.conflict('Username already taken');
    }

    if (isGifted) {
      const used = await this.countGiftedUsers();
      if (used >= this.MAX_GIFT_SLOTS) throw ApiError.badRequest('No quedan cupos de premium regalo');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const cleanUsername = isGifted ? cleanUsernameCheck : dto.username.toLowerCase();
    const user = await prisma.user.create({
      data: {
        email: dto.email,
        username: cleanUsername,
        displayName: dto.displayName,
        passwordHash,
        ...(isGifted && { isPremium: true, isGifted: true }),
      },
      // Same fields as login so the mobile auth state is complete
      select: {
        id: true, email: true, username: true, displayName: true,
        role: true, isPremium: true, level: true, xp: true,
        predictionPoints: true, totalPredictions: true, correctPredictions: true,
        country: true, avatar: true,
      },
    });

    const tokens = this.createTokens(user.id, user.email, user.role);
    // Non-fatal: if refresh token storage fails the user can still log in with the access token
    await this.storeRefreshToken(user.id, tokens.refreshToken).catch((e) =>
      logger.warn('Failed to store refresh token on register', e)
    );

    // Send welcome email (non-blocking)
    EmailService.sendWelcome(user.email, user.displayName).catch((e) =>
      logger.warn('Failed to send welcome email', e)
    );

    return { user, ...tokens };
  }

  static async login(identifier: string, password: string, rememberMe = false) {
    const isEmail = identifier.includes('@');
    const userSelect = {
      id: true, email: true, username: true, displayName: true, passwordHash: true,
      role: true, isPremium: true, isBanned: true, tokenVersion: true,
      level: true, xp: true, predictionPoints: true, totalPredictions: true,
      correctPredictions: true, country: true, avatar: true,
    };

    const user = await prisma.user.findUnique({
      where: isEmail ? { email: identifier.toLowerCase() } : { username: identifier },
      select: userSelect,
    });

    if (!user || !user.passwordHash) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    if (user.isBanned) {
      throw new ApiError(403, 'Account suspended. Contact support.');
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) throw ApiError.unauthorized('Invalid email or password');

    const tokens = this.createTokens(user.id, user.email, user.role, user.tokenVersion);
    await this.storeRefreshToken(user.id, tokens.refreshToken, rememberMe);

    const { passwordHash, tokenVersion, isBanned, ...safeUser } = user;
    return { user: safeUser as Omit<typeof user, 'passwordHash' | 'tokenVersion' | 'isBanned'>, ...tokens };
  }

  static async logout(userId: string, token: string): Promise<void> {
    await cache.set(`blacklist:${token}`, true, 60 * 60);
    await prisma.refreshToken.deleteMany({ where: { userId } });
  }

  static async refreshTokens(refreshToken: string) {
    let payload: { userId: string; tokenVersion: number };
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      throw ApiError.unauthorized('Invalid refresh token');
    }

    const stored = await prisma.refreshToken.findUnique({ where: { token: refreshToken } });
    if (!stored) throw ApiError.unauthorized('Refresh token not found');
    if (stored.expiresAt < new Date()) {
      await prisma.refreshToken.delete({ where: { token: refreshToken } });
      throw ApiError.unauthorized('Refresh token expired');
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, role: true, tokenVersion: true },
    });

    if (!user) throw ApiError.unauthorized('User not found');
    if (user.tokenVersion !== payload.tokenVersion) throw ApiError.unauthorized('Token invalidated');

    await prisma.refreshToken.delete({ where: { token: refreshToken } });

    const tokens = this.createTokens(user.id, user.email, user.role, user.tokenVersion);
    await this.storeRefreshToken(user.id, tokens.refreshToken);

    return tokens;
  }

  static async applyGiftCode(callerId: string, callerRole: string, code: string) {
    let action: 'grant' | 'revoke';
    let targetUsername: string | null = null;

    if (code.startsWith('@@@@@')) {
      action = 'revoke';
      const rest = code.slice(5).toLowerCase().trim();
      targetUsername = rest || null;
    } else if (code.startsWith('@@@')) {
      action = 'grant';
      const rest = code.slice(3).toLowerCase().trim();
      targetUsername = rest || null;
    } else {
      throw ApiError.badRequest('Código inválido. Usá @@@ para activar o @@@@@ para revocar.');
    }

    // If targeting another user, only admins can do that
    if (targetUsername && callerRole !== 'ADMIN' && callerRole !== 'SUPER') {
      throw ApiError.forbidden('Solo admins pueden activar premium en otras cuentas');
    }

    const where = targetUsername ? { username: targetUsername } : { id: callerId };
    const target = await prisma.user.findUnique({
      where,
      select: { id: true, username: true, isPremium: true, isGifted: true },
    });
    if (!target) throw ApiError.notFound('Usuario');

    if (action === 'grant') {
      if (target.isPremium) throw ApiError.conflict('La cuenta ya es premium');
      const used = await this.countGiftedUsers();
      if (used >= this.MAX_GIFT_SLOTS) throw ApiError.badRequest('No quedan cupos de premium regalo');
      await prisma.user.update({ where: { id: target.id }, data: { isPremium: true, isGifted: true } });
      return { message: 'Premium activado', username: target.username };
    } else {
      await prisma.user.update({
        where: { id: target.id },
        data: { isPremium: false, isGifted: false },
      });
      return { message: 'Premium revocado', username: target.username };
    }
  }

  static async sendPasswordReset(email: string): Promise<void> {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return; // Don't reveal if email exists

    const token = uuidv4();
    await cache.set(`password_reset:${token}`, user.id, 60 * 60); // 1 hour

    await EmailService.sendPasswordReset(email, token);
  }

  static async resetPassword(token: string, newPassword: string): Promise<void> {
    const userId = await cache.get<string>(`password_reset:${token}`);
    if (!userId) throw ApiError.badRequest('Invalid or expired reset token');

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash, tokenVersion: { increment: 1 } },
    });

    await cache.del(`password_reset:${token}`);
    await prisma.refreshToken.deleteMany({ where: { userId } });
  }

  static async verifyEmail(token: string): Promise<void> {
    const userId = await cache.get<string>(`verify_email:${token}`);
    if (!userId) throw ApiError.badRequest('Invalid or expired verification token');

    await prisma.user.update({ where: { id: userId }, data: { isVerified: true } });
    await cache.del(`verify_email:${token}`);
  }

  static async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, email: true, username: true, displayName: true, avatar: true,
        bio: true, country: true, role: true, isPremium: true, premiumUntil: true,
        isVerified: true, level: true, xp: true, predictionPoints: true,
        totalPredictions: true, correctPredictions: true, language: true, createdAt: true,
        favoriteTeams: { include: { team: { select: { id: true, name: true, code: true, flagUrl: true } } } },
        achievements: { include: { achievement: true } },
      },
    });

    if (!user) throw ApiError.notFound('User');
    return user;
  }

  static async handleOAuthUser(oauthUser: OAuthUserDto) {
    const idField = `${oauthUser.provider}Id` as 'googleId' | 'facebookId' | 'appleId';

    let user = await prisma.user.findFirst({
      where: { [idField]: oauthUser.providerId },
      select: { id: true, email: true, role: true, tokenVersion: true },
    });

    if (!user) {
      // Check if email exists
      const existing = await prisma.user.findUnique({ where: { email: oauthUser.email } });
      if (existing) {
        user = await prisma.user.update({
          where: { id: existing.id },
          data: { [idField]: oauthUser.providerId },
          select: { id: true, email: true, role: true, tokenVersion: true },
        });
      } else {
        const username = await this.generateUsername(oauthUser.displayName);
        user = await prisma.user.create({
          data: {
            email: oauthUser.email,
            username,
            displayName: oauthUser.displayName,
            avatar: oauthUser.avatar,
            [idField]: oauthUser.providerId,
            isVerified: true,
          },
          select: { id: true, email: true, role: true, tokenVersion: true },
        });
      }
    }

    const tokens = this.createTokens(user.id, user.email, user.role, user.tokenVersion);
    await this.storeRefreshToken(user.id, tokens.refreshToken);

    return tokens;
  }

  static async appleSignIn(dto: { identityToken: string; user?: { email?: string; name?: { firstName?: string; lastName?: string } } }) {
    // Apple sign-in token verification would go here
    // For now, extract from decoded token
    throw ApiError.internal('Apple Sign-In not configured');
  }

  private static createTokens(userId: string, email: string, role: string, tokenVersion = 0) {
    return generateTokenPair({ userId, email, role, tokenVersion });
  }

  private static async storeRefreshToken(userId: string, token: string, rememberMe = false): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (rememberMe ? 30 : 7));

    await prisma.refreshToken.create({ data: { userId, token, expiresAt } });
  }

  private static async generateUsername(displayName: string): Promise<string> {
    const base = displayName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20) || 'user';
    let username = base;
    let counter = 1;

    while (await prisma.user.findUnique({ where: { username } })) {
      username = `${base}${counter++}`;
    }

    return username;
  }
}
