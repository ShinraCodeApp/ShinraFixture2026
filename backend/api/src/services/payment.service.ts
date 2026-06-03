import Stripe from 'stripe';
import { prisma } from '../config/database';
import { config } from '../config';
import { ApiError } from '../utils/ApiError';
import { logger } from '../utils/logger';

const stripe = new Stripe(config.stripe.secretKey, { apiVersion: '2023-10-16' });

export class PaymentService {
  static getPlans() {
    return [
      {
        id: 'monthly',
        name: 'Premium Mensual',
        price: 4.99,
        currency: 'USD',
        interval: 'month',
        priceId: config.stripe.premiumMonthlyPriceId,
        features: [
          'Sin publicidad',
          'Estadísticas avanzadas (xG, heatmaps)',
          'Análisis IA profundo',
          'Quinielas ilimitadas',
          'Notificaciones personalizadas',
          'Insignias exclusivas',
        ],
      },
      {
        id: 'annual',
        name: 'Premium Anual',
        price: 39.99,
        currency: 'USD',
        interval: 'year',
        priceId: config.stripe.premiumAnnualPriceId,
        savings: '33% de descuento',
        features: [
          'Todo lo de mensual',
          '2 meses gratis',
          'Acceso anticipado a features',
          'Soporte prioritario',
        ],
      },
    ];
  }

  static async getSubscription(userId: string) {
    return prisma.subscription.findFirst({
      where: { userId, status: { in: ['active', 'trialing'] } },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async createSubscription(userId: string, priceId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, displayName: true },
    });
    if (!user) throw ApiError.notFound('User');

    const existingSub = await this.getSubscription(userId);
    if (existingSub) throw ApiError.conflict('Active subscription already exists');

    // Create or retrieve Stripe customer
    let customerId: string;
    const existingCustomers = await stripe.customers.list({ email: user.email, limit: 1 });

    if (existingCustomers.data.length > 0) {
      customerId = existingCustomers.data[0].id;
    } else {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.displayName,
        metadata: { userId },
      });
      customerId = customer.id;
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${config.clientUrl}/premium/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${config.clientUrl}/premium?canceled=true`,
      metadata: { userId },
      subscription_data: {
        metadata: { userId },
      },
    });

    return { checkoutUrl: session.url, sessionId: session.id };
  }

  static async cancelSubscription(userId: string): Promise<void> {
    const sub = await this.getSubscription(userId);
    if (!sub || !sub.stripeSubId) throw ApiError.notFound('Active subscription');

    await stripe.subscriptions.update(sub.stripeSubId, { cancel_at_period_end: true });
    await prisma.subscription.update({
      where: { id: sub.id },
      data: { cancelAtPeriodEnd: true },
    });
  }

  static async getBillingPortal(userId: string) {
    const sub = await this.getSubscription(userId);
    if (!sub) throw ApiError.notFound('Subscription');

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
    if (!user) throw ApiError.notFound('User');

    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    if (!customers.data.length) throw ApiError.notFound('Customer');

    const session = await stripe.billingPortal.sessions.create({
      customer: customers.data[0].id,
      return_url: `${config.clientUrl}/profile`,
    });

    return { portalUrl: session.url };
  }

  static async handleWebhook(payload: Buffer, signature: string): Promise<void> {
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(payload, signature, config.stripe.webhookSecret);
    } catch (err) {
      throw ApiError.badRequest('Invalid webhook signature');
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.CheckoutSession;
        const userId = session.metadata?.userId;
        if (!userId || !session.subscription) break;

        const stripeSub = await stripe.subscriptions.retrieve(session.subscription as string);
        await prisma.subscription.create({
          data: {
            userId,
            stripeSubId: stripeSub.id,
            stripePriceId: stripeSub.items.data[0].price.id,
            status: stripeSub.status,
            planType: stripeSub.items.data[0].price.recurring?.interval === 'month' ? 'monthly' : 'annual',
            currentPeriodStart: new Date(stripeSub.current_period_start * 1000),
            currentPeriodEnd: new Date(stripeSub.current_period_end * 1000),
          },
        });

        await prisma.user.update({
          where: { id: userId },
          data: { isPremium: true, premiumUntil: new Date(stripeSub.current_period_end * 1000), role: 'PREMIUM' },
        });
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.userId;
        if (!userId) break;

        await prisma.subscription.updateMany({
          where: { stripeSubId: sub.id },
          data: {
            status: sub.status,
            cancelAtPeriodEnd: sub.cancel_at_period_end,
            currentPeriodEnd: new Date(sub.current_period_end * 1000),
          },
        });
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.userId;
        if (!userId) break;

        await prisma.subscription.updateMany({
          where: { stripeSubId: sub.id },
          data: { status: 'canceled' },
        });

        await prisma.user.update({
          where: { id: userId },
          data: { isPremium: false, premiumUntil: null, role: 'USER' },
        });
        break;
      }
    }
  }
}
