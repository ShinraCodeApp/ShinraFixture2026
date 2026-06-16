import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';

export class AuthController {
  static async register(req: Request, res: Response): Promise<void> {
    const user = await AuthService.register(req.body);
    res.status(201).json({ success: true, message: 'Account created successfully', data: user });
  }

  static async login(req: Request, res: Response): Promise<void> {
    const { email, password } = req.body;
    const result = await AuthService.login(email, password);
    res.json({ success: true, data: result });
  }

  static async logout(req: Request, res: Response): Promise<void> {
    await AuthService.logout(req.user!.id, req.token!);
    res.json({ success: true, message: 'Logged out successfully' });
  }

  static async refresh(req: Request, res: Response): Promise<void> {
    const tokens = await AuthService.refreshTokens(req.body.refreshToken);
    res.json({ success: true, data: tokens });
  }

  static async forgotPassword(req: Request, res: Response): Promise<void> {
    await AuthService.sendPasswordReset(req.body.email);
    res.json({ success: true, message: 'Password reset email sent if account exists' });
  }

  static async resetPassword(req: Request, res: Response): Promise<void> {
    await AuthService.resetPassword(req.body.token, req.body.password);
    res.json({ success: true, message: 'Password reset successfully' });
  }

  static async verifyEmail(req: Request, res: Response): Promise<void> {
    await AuthService.verifyEmail(req.body.token);
    res.json({ success: true, message: 'Email verified successfully' });
  }

  static async me(req: Request, res: Response): Promise<void> {
    const user = await AuthService.getProfile(req.user!.id);
    res.json({ success: true, data: user });
  }

  static async oauthCallback(req: Request, res: Response): Promise<void> {
    const tokens = await AuthService.handleOAuthUser(req.user as any);
    res.redirect(`${process.env.CLIENT_URL}/auth/callback?token=${tokens.accessToken}`);
  }

  static async appleSignIn(req: Request, res: Response): Promise<void> {
    const result = await AuthService.appleSignIn(req.body);
    res.json({ success: true, data: result });
  }

  static async giftCode(req: Request, res: Response): Promise<void> {
    const result = await AuthService.applyGiftCode(req.user!.id, req.user!.role, req.body.code);
    res.json({ success: true, data: result });
  }
}
