import { Router } from 'express';
import { PaymentController } from '../controllers/payments.controller';
import { authenticate } from '../middleware/auth';
import express from 'express';

export const paymentRoutes = Router();

// Stripe webhook needs raw body
paymentRoutes.post('/webhook',
  express.raw({ type: 'application/json' }),
  PaymentController.webhook
);

paymentRoutes.use(authenticate);
paymentRoutes.get('/subscription', PaymentController.getSubscription);
paymentRoutes.post('/subscribe', PaymentController.createSubscription);
paymentRoutes.post('/cancel', PaymentController.cancelSubscription);
paymentRoutes.get('/portal', PaymentController.getBillingPortal);
paymentRoutes.get('/plans', PaymentController.getPlans);
