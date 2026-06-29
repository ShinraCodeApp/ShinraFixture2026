import sgMail from '@sendgrid/mail';
import { config } from '../config';
import { logger } from '../utils/logger';

sgMail.setApiKey(config.sendgrid.apiKey);

export class EmailService {
  private static async send(to: string, subject: string, html: string): Promise<void> {
    if (!config.sendgrid.apiKey) {
      logger.warn('SendGrid not configured, skipping email to:', to);
      return;
    }
    try {
      await sgMail.send({
        to,
        from: { email: config.sendgrid.fromEmail, name: config.sendgrid.fromName },
        subject,
        html,
      });
    } catch (err) {
      logger.error('SendGrid error:', err);
    }
  }

  static async sendWelcome(email: string, name: string): Promise<void> {
    await this.send(
      email,
      '¡Bienvenido a ShinraFixture 2026! ⚽',
      `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #001489, #1565C0); padding: 40px; text-align: center;">
          <h1 style="color: white; margin: 0;">ShinraFixture 2026</h1>
          <p style="color: rgba(255,255,255,0.8);">FIFA World Cup 2026™</p>
        </div>
        <div style="padding: 40px; background: #f9f9f9;">
          <h2>¡Hola, ${name}! 👋</h2>
          <p>Bienvenido a la plataforma definitiva para seguir el Mundial 2026.</p>
          <ul>
            <li>📅 Sigue el fixture completo de los 80 partidos</li>
            <li>⚡ Haz predicciones y gana puntos</li>
            <li>🤖 Predicciones con IA</li>
            <li>🏆 Crea quinielas con amigos</li>
          </ul>
          <a href="${config.clientUrl}" style="display: inline-block; background: #00C851; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
            Ir a la plataforma
          </a>
        </div>
        <p style="text-align: center; color: #999; font-size: 12px; padding: 20px;">
          © 2026 ShinraFixture. Si no te registraste, ignora este email.
        </p>
      </div>
      `
    );
  }

  static async sendPasswordReset(email: string, code: string): Promise<void> {
    await this.send(
      email,
      'Restablecer contraseña — ShinraFixture',
      `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px; background: #f9f9f9;">
        <div style="background: linear-gradient(135deg, #001489, #1565C0); padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">ShinraFixture 2026</h1>
        </div>
        <div style="background: white; padding: 40px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
          <h2 style="color: #1a1a2e; margin-top: 0;">Restablecer contraseña</h2>
          <p style="color: #555;">Usá este código en la app para restablecer tu contraseña. Expira en <strong>15 minutos</strong>.</p>
          <div style="background: #f0f4ff; border: 2px dashed #1565C0; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
            <p style="margin: 0 0 8px 0; color: #666; font-size: 14px;">Tu código de verificación</p>
            <span style="font-size: 48px; font-weight: 900; letter-spacing: 12px; color: #1565C0;">${code}</span>
          </div>
          <p style="color: #999; font-size: 13px;">Si no solicitaste esto, ignorá este email. Tu contraseña no cambiará.</p>
        </div>
      </div>
      `
    );
  }

  static async sendPredictionSummary(email: string, name: string, points: number, correct: number, total: number): Promise<void> {
    await this.send(
      email,
      `Resumen de predicciones — +${points} puntos`,
      `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px;">
        <h2>¡Resumen de tus predicciones, ${name}!</h2>
        <div style="background: #f0fdf4; border-radius: 12px; padding: 20px; text-align: center; margin: 20px 0;">
          <div style="font-size: 48px; font-weight: 900; color: #00C851;">+${points}</div>
          <div style="color: #666;">puntos ganados</div>
        </div>
        <p>${correct} de ${total} predicciones correctas</p>
        <a href="${config.clientUrl}/predictions" style="display: inline-block; background: #00C851; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none;">
          Ver mis predicciones
        </a>
      </div>
      `
    );
  }
}
