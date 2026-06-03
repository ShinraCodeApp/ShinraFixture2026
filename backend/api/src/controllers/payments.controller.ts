import { Request, Response } from 'express';
import { PaymentService } from '../services/payment.service';
import { ApiError } from '../utils/ApiError';

export class PaymentController {
  static async getPlans(req: Request, res: Response): Promise<void> {
    res.json({ success: true, data: PaymentService.getPlans() });
  }

  static async getSubscription(req: Request, res: Response): Promise<void> {
    const data = await PaymentService.getSubscription(req.user!.id);
    res.json({ success: true, data });
  }

  static async createSubscription(req: Request, res: Response): Promise<void> {
    const { priceId } = req.body;
    if (!priceId) throw ApiError.badRequest('priceId required');
    const data = await PaymentService.createSubscription(req.user!.id, priceId);
    res.json({ success: true, data });
  }

  static async cancelSubscription(req: Request, res: Response): Promise<void> {
    await PaymentService.cancelSubscription(req.user!.id);
    res.json({ success: true, message: 'Subscription will cancel at period end' });
  }

  static async getBillingPortal(req: Request, res: Response): Promise<void> {
    const data = await PaymentService.getBillingPortal(req.user!.id);
    res.json({ success: true, data });
  }

  static async webhook(req: Request, res: Response): Promise<void> {
    const sig = req.headers['stripe-signature'] as string;
    if (!sig) { res.status(400).json({ error: 'No signature' }); return; }

    await PaymentService.handleWebhook(req.body, sig);
    res.json({ received: true });
  }
}
