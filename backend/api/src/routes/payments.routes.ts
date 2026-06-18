import { Router } from 'express';
import { PaymentController } from '../controllers/payments.controller';
import { authenticate } from '../middleware/auth';
import express from 'express';

export const paymentRoutes = Router();

// Webhooks — no auth, public
paymentRoutes.post('/webhook',
  express.raw({ type: 'application/json' }),
  PaymentController.webhook
);
paymentRoutes.post('/webhook/mp', PaymentController.webhookMp);

paymentRoutes.use(authenticate);
paymentRoutes.get('/plans', PaymentController.getPlans);
paymentRoutes.get('/subscription', PaymentController.getSubscription);
paymentRoutes.post('/subscribe', PaymentController.createSubscription);      // Stripe (legacy)
paymentRoutes.post('/subscribe/mp', PaymentController.subscribeMp);          // MercadoPago
paymentRoutes.post('/cancel', PaymentController.cancelSubscription);
paymentRoutes.get('/portal', PaymentController.getBillingPortal);
