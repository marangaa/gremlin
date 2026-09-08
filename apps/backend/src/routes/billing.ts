import { Hono } from 'hono';
import { requireAuth } from '../middleware/auth';
import type { AppEnv } from '../types/env';
import { getPool } from '../lib/db';
import {
  unmarshalPaddleWebhook,
  createCustomerPortalSession,
  EventName,
  type EventEntity,
} from '../lib/paddle';
import { logger } from '../lib/logger';

export const billingRoutes = new Hono<AppEnv>()
  /**
   * Paddle Webhook Ingestion Endpoint.
   * Receives signed events from Paddle notification destinations.
   * Adheres to `paddle-webhooks` and `paddle-subscription-sync` delivery contract:
   * - Validates HMAC-SHA256 signature using official `@paddle/paddle-node-sdk`.
   * - Deduplicates delivery on `eventId`.
   * - Idempotently mirrors customer and subscription state to Neon PostgreSQL.
   * - Bridges users by email without customData dependencies.
   * - Acknowledges with 200 within 5 seconds; non-2xx on failure for Paddle retry.
   */
  .post('/webhook', async (c) => {
    const signature = c.req.header('paddle-signature');
    const rawBody = await c.req.text();
    const secret = c.env.PADDLE_NOTIFICATION_WEBHOOK_SECRET;
    const apiKey = c.env.PADDLE_API_KEY;

    if (!signature || !rawBody) {
      return c.json({ error: 'Missing signature or body' }, 400);
    }

    if (!secret || !apiKey) {
      logger.error('Paddle webhook configuration missing (secret or apiKey unconfigured)');
      return c.json({ error: 'Webhook unconfigured' }, 500);
    }

    const isSandbox = (c.env.PADDLE_ENV || 'sandbox') === 'sandbox';

    let event: EventEntity | null = null;
    try {
      event = await unmarshalPaddleWebhook(
        rawBody,
        secret,
        signature,
        apiKey,
        isSandbox ? 'sandbox' : 'production',
      );
    } catch (err) {
      logger.error('Paddle webhook signature verification or unmarshal failed', err);
      // Per paddle-webhooks skill: return non-2xx so Paddle retries
      return c.json({ error: 'Invalid webhook signature or malformed payload' }, 500);
    }

    if (!event) {
      logger.error('Paddle webhook unmarshal returned null event');
      return c.json({ error: 'Null event received' }, 400);
    }

    const eventId = event.eventId;
    const eventType = event.eventType;
    const pool = getPool(c.env.DATABASE_URL);

    // 1. Idempotency check via processed_webhooks ledger
    const existing = await pool.query(
      `SELECT 1 FROM processed_webhooks WHERE "eventId" = $1`,
      [eventId],
    );

    if (existing.rowCount && existing.rowCount > 0) {
      logger.info('Paddle webhook duplicate skipped', { eventId, eventType });
      return c.json({ received: true, deduplicated: true });
    }

    try {
      // 2. Route event to specialized handlers adhering to paddle-subscription-sync
      switch (eventType) {
        case EventName.CustomerCreated:
        case EventName.CustomerUpdated: {
          const customer = event.data as any;
          const customerId: string = customer.id;
          const email: string = (customer.email || '').toLowerCase().trim();

          if (customerId && email) {
            // Resolve userId from "user" table via clean email bridge
            const userRes = await pool.query<{ id: string }>(
              `SELECT id FROM "user" WHERE LOWER(email) = $1 LIMIT 1`,
              [email],
            );
            const userId = userRes.rows[0]?.id || null;

            await pool.query(
              `INSERT INTO customers ("customerId", "userId", email, "updatedAt")
               VALUES ($1, $2, $3, NOW())
               ON CONFLICT ("customerId") DO UPDATE SET
                 "userId" = COALESCE(EXCLUDED."userId", customers."userId"),
                 email = EXCLUDED.email,
                 "updatedAt" = NOW()`,
              [customerId, userId, email],
            );
            logger.info('Customer mirrored successfully', { customerId, email, userId });
          }
          break;
        }

        case EventName.SubscriptionCreated:
        case EventName.SubscriptionUpdated:
        case EventName.SubscriptionCanceled: {
          const sub = event.data as any;
          const subscriptionId: string = sub.id;
          const customerId: string = sub.customerId;
          const status: string = sub.status; // 'active' | 'trialing' | 'past_due' | 'paused' | 'canceled'
          const priceId: string = sub.items?.[0]?.price?.id || '';
          const productId: string = sub.items?.[0]?.price?.productId || '';
          const scheduledChange = sub.scheduledChange?.effectiveAt
            ? new Date(sub.scheduledChange.effectiveAt)
            : null;
          const currentBillingPeriodEnd = sub.currentBillingPeriod?.endsAt
            ? new Date(sub.currentBillingPeriod.endsAt)
            : null;

          // Lookup customer record to link userId and email
          let userId: string | null = null;
          let customerEmail: string = '';

          if (customerId) {
            const custRes = await pool.query<{ userId: string | null; email: string }>(
              `SELECT "userId", email FROM customers WHERE "customerId" = $1 LIMIT 1`,
              [customerId],
            );
            if (custRes.rows[0]) {
              userId = custRes.rows[0].userId;
              customerEmail = custRes.rows[0].email;
            }
          }

          // If userId not yet bridged, match by email from customer table
          if (!userId && customerEmail) {
            const uRes = await pool.query<{ id: string }>(
              `SELECT id FROM "user" WHERE LOWER(email) = $1 LIMIT 1`,
              [customerEmail.toLowerCase()],
            );
            userId = uRes.rows[0]?.id || null;
          }

          if (subscriptionId && customerId) {
            await pool.query(
              `INSERT INTO subscriptions (
                 "subscriptionId", "customerId", "userId", status,
                 "priceId", "productId", "scheduledChange", "currentBillingPeriodEnd", "updatedAt"
               ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
               ON CONFLICT ("subscriptionId") DO UPDATE SET
                 "userId" = COALESCE(EXCLUDED."userId", subscriptions."userId"),
                 status = EXCLUDED.status,
                 "priceId" = EXCLUDED."priceId",
                 "productId" = EXCLUDED."productId",
                 "scheduledChange" = EXCLUDED."scheduledChange",
                 "currentBillingPeriodEnd" = EXCLUDED."currentBillingPeriodEnd",
                 "updatedAt" = NOW()`,
              [
                subscriptionId,
                customerId,
                userId,
                status,
                priceId,
                productId,
                scheduledChange,
                currentBillingPeriodEnd,
              ],
            );

            // Update user plan entitlement (strictly 'pro' vs 'free')
            if (userId) {
              if (status === 'active' || status === 'trialing') {
                await pool.query(
                  `UPDATE "user" SET plan = 'pro', "updatedAt" = NOW() WHERE id = $1`,
                  [userId],
                );
                logger.info('User upgraded to Pro', { userId, subscriptionId, status });
              } else if (status === 'canceled' || status === 'paused') {
                await pool.query(
                  `UPDATE "user" SET plan = 'free', "updatedAt" = NOW() WHERE id = $1`,
                  [userId],
                );
                logger.info('User downgraded to Free', { userId, subscriptionId, status });
              }
            }
          }
          break;
        }

        default:
          logger.debug('Unhandled Paddle webhook event received', { eventType, eventId });
          break;
      }

      // 3. Mark event processed in ledger
      await pool.query(
        `INSERT INTO processed_webhooks ("eventId", "eventType", "processedAt")
         VALUES ($1, $2, NOW())
         ON CONFLICT ("eventId") DO NOTHING`,
        [eventId, eventType],
      );

      return c.json({ received: true });
    } catch (err) {
      logger.error(`Error processing Paddle webhook event ${eventType} (${eventId})`, err);
      // Return 500 to trigger Paddle delivery retry
      return c.json({ error: 'Failed to process webhook event' }, 500);
    }
  })

  /**
   * Generates a time-limited Customer Portal session URL for subscription self-service.
   * Requires authenticated Better Auth session.
   */
  .post('/portal', requireAuth, async (c) => {
    const user = c.get('user')!;
    const apiKey = c.env.PADDLE_API_KEY;

    if (!apiKey) {
      logger.error('Paddle API key is unconfigured on server');
      return c.json({ error: 'Paddle API key is not configured on server' }, 500);
    }

    const pool = getPool(c.env.DATABASE_URL);

    // Look up user's Paddle customer record
    const custRes = await pool.query<{ customerId: string }>(
      `SELECT "customerId" FROM customers WHERE "userId" = $1 OR LOWER(email) = LOWER($2) LIMIT 1`,
      [user.id, user.email],
    );

    const customerId = custRes.rows[0]?.customerId;
    if (!customerId) {
      return c.json(
        { error: 'No Paddle customer record found for this account. Please subscribe first.' },
        404,
      );
    }

    // Look up active subscription IDs for deep-linking
    const subRes = await pool.query<{ subscriptionId: string }>(
      `SELECT "subscriptionId" FROM subscriptions
       WHERE "customerId" = $1 AND status IN ('active', 'trialing', 'past_due')`,
      [customerId],
    );

    const subscriptionIds = subRes.rows.map((r) => r.subscriptionId);
    const isSandbox = (c.env.PADDLE_ENV || 'sandbox') === 'sandbox';

    try {
      const portalSession = await createCustomerPortalSession(
        apiKey,
        customerId,
        subscriptionIds,
        isSandbox ? 'sandbox' : 'production',
      );

      logger.info('Customer portal session created', { userId: user.id, customerId });
      return c.json({ success: true, url: portalSession.url });
    } catch (err: any) {
      logger.error('Failed to create customer portal session', err, { userId: user.id });
      return c.json({ error: err?.message || 'Could not generate portal session' }, 500);
    }
  })

  /**
   * Retrieves active subscription & billing plan details for the authenticated user.
   */
  .get('/status', requireAuth, async (c) => {
    const user = c.get('user')!;
    const pool = getPool(c.env.DATABASE_URL);

    const subRes = await pool.query<{
      subscriptionId: string;
      customerId: string;
      status: string;
      priceId: string;
      productId: string;
      scheduledChange: Date | null;
      currentBillingPeriodEnd: Date | null;
    }>(
      `SELECT s."subscriptionId", s."customerId", s.status, s."priceId", s."productId",
              s."scheduledChange", s."currentBillingPeriodEnd"
       FROM subscriptions s
       WHERE s."userId" = $1
       ORDER BY s."createdAt" DESC
       LIMIT 1`,
      [user.id],
    );

    const sub = subRes.rows[0] || null;

    return c.json({
      success: true,
      plan: user.plan || 'free',
      subscription: sub
        ? {
            id: sub.subscriptionId,
            customerId: sub.customerId,
            status: sub.status,
            priceId: sub.priceId,
            productId: sub.productId,
            scheduledChange: sub.scheduledChange ? sub.scheduledChange.toISOString() : null,
            currentBillingPeriodEnd: sub.currentBillingPeriodEnd
              ? sub.currentBillingPeriodEnd.toISOString()
              : null,
          }
        : null,
    });
  });
