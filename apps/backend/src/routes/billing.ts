import { Hono } from 'hono';
import { requireAuth } from '../middleware/auth';
import type { AppEnv } from '../types/env';
import { getPool } from '../lib/db';
import { verifyPaddleWebhookSignature, createCustomerPortalSession } from '../lib/paddle';

export const billingRoutes = new Hono<AppEnv>()
  /**
   * Paddle Webhook Ingestion Endpoint.
   * Receives signed events from Paddle notification destinations.
   * Adheres to `paddle-webhooks` and `paddle-subscription-sync` delivery contract:
   * - Validates HMAC-SHA256 signature using Web Crypto.
   * - Deduplicates delivery on `event_id`.
   * - Idempotently mirrors customer and subscription state to Neon PostgreSQL.
   * - Acknowledges with 200 within 5 seconds.
   */
  .post('/webhook', async (c) => {
    const signature = c.req.header('paddle-signature');
    const rawBody = await c.req.text();
    const secret = c.env.PADDLE_NOTIFICATION_WEBHOOK_SECRET;

    if (!signature || !rawBody) {
      return c.json({ error: 'Missing signature or body' }, 400);
    }

    if (!secret) {
      console.error('PADDLE_NOTIFICATION_WEBHOOK_SECRET is not configured on the worker.');
      return c.json({ error: 'Webhook secret unconfigured' }, 500);
    }

    const isValid = await verifyPaddleWebhookSignature(rawBody, signature, secret);
    if (!isValid) {
      console.warn('Paddle webhook signature verification failed.');
      // Return 500 so Paddle retries (per paddle-webhooks skill: any non-2xx allows recovery)
      return c.json({ error: 'Invalid webhook signature' }, 500);
    }

    let event: any;
    try {
      event = JSON.parse(rawBody);
    } catch {
      return c.json({ error: 'Malformed JSON payload' }, 400);
    }

    const eventId: string = event.event_id || event.eventId;
    const eventType: string = event.event_type || event.eventType;
    const data = event.data || {};

    if (!eventId || !eventType) {
      return c.json({ error: 'Missing event_id or event_type' }, 400);
    }

    const pool = getPool(c.env.DATABASE_URL);

    // 1. Idempotency check via processed_webhooks ledger
    const existing = await pool.query(
      `SELECT 1 FROM processed_webhooks WHERE "eventId" = $1`,
      [eventId],
    );

    if (existing.rowCount && existing.rowCount > 0) {
      return c.json({ received: true, deduplicated: true });
    }

    try {
      // 2. Route event to specialized handlers
      switch (eventType) {
        case 'customer.created':
        case 'customer.updated': {
          const customerId = data.id;
          const email = (data.email || '').toLowerCase().trim();
          let userId: string | null = data.custom_data?.userId || null;

          if (!userId && email) {
            const userRes = await pool.query<{ id: string }>(
              `SELECT id FROM "user" WHERE LOWER(email) = $1 LIMIT 1`,
              [email],
            );
            if (userRes.rows[0]) {
              userId = userRes.rows[0].id;
            }
          }

          if (customerId && email) {
            await pool.query(
              `INSERT INTO customers ("customerId", "userId", email, "updatedAt")
               VALUES ($1, $2, $3, NOW())
               ON CONFLICT ("customerId") DO UPDATE SET
                 "userId" = COALESCE(EXCLUDED."userId", customers."userId"),
                 email = EXCLUDED.email,
                 "updatedAt" = NOW()`,
              [customerId, userId, email],
            );
          }
          break;
        }

        case 'subscription.created':
        case 'subscription.updated':
        case 'subscription.canceled': {
          const subscriptionId = data.id;
          const customerId = data.customer_id;
          const status = data.status; // 'active' | 'trialing' | 'past_due' | 'paused' | 'canceled'
          const priceId = data.items?.[0]?.price?.id || '';
          const productId = data.items?.[0]?.price?.product_id || '';
          const scheduledChange = data.scheduled_change?.effective_at ? new Date(data.scheduled_change.effective_at) : null;
          const currentBillingPeriodEnd = data.current_billing_period?.ends_at ? new Date(data.current_billing_period.ends_at) : null;

          let userId: string | null = data.custom_data?.userId || null;

          // Bridge userId from customers table if not in custom_data
          if (!userId && customerId) {
            const custRes = await pool.query<{ userId: string | null; email: string }>(
              `SELECT "userId", email FROM customers WHERE "customerId" = $1 LIMIT 1`,
              [customerId],
            );
            if (custRes.rows[0]?.userId) {
              userId = custRes.rows[0].userId;
            } else if (custRes.rows[0]?.email) {
              const uRes = await pool.query<{ id: string }>(
                `SELECT id FROM "user" WHERE LOWER(email) = $1 LIMIT 1`,
                [custRes.rows[0].email.toLowerCase()],
              );
              userId = uRes.rows[0]?.id || null;
            }
          }

          if (subscriptionId && customerId) {
            // Ensure customer record exists
            if (data.customer?.email) {
              await pool.query(
                `INSERT INTO customers ("customerId", "userId", email, "updatedAt")
                 VALUES ($1, $2, $3, NOW())
                 ON CONFLICT ("customerId") DO UPDATE SET
                   "userId" = COALESCE(EXCLUDED."userId", customers."userId"),
                   email = EXCLUDED.email,
                   "updatedAt" = NOW()`,
                [customerId, userId, data.customer.email.toLowerCase().trim()],
              );
            }

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
              [subscriptionId, customerId, userId, status, priceId, productId, scheduledChange, currentBillingPeriodEnd],
            );

            // Update user plan entitlement
            if (userId) {
              if (status === 'active' || status === 'trialing') {
                await pool.query(
                  `UPDATE "user" SET plan = 'pro', "updatedAt" = NOW() WHERE id = $1`,
                  [userId],
                );
              } else if (status === 'canceled' || status === 'paused') {
                // Downgrade only if currently 'pro' (preserving 'founder' lifetime passes)
                await pool.query(
                  `UPDATE "user" SET plan = 'free', "updatedAt" = NOW()
                   WHERE id = $1 AND plan = 'pro'`,
                  [userId],
                );
              }
            }
          }
          break;
        }

        case 'transaction.completed': {
          const transactionId = data.id;
          const customerId = data.customer_id || null;
          const status = data.status; // 'completed'
          const priceId = data.items?.[0]?.price?.id || '';
          const productId = data.items?.[0]?.price?.product_id || '';
          const amount = data.details?.totals?.total || '0';
          const currencyCode = data.currency_code || 'USD';

          let userId: string | null = data.custom_data?.userId || null;

          if (!userId && customerId) {
            const custRes = await pool.query<{ userId: string | null }>(
              `SELECT "userId" FROM customers WHERE "customerId" = $1 LIMIT 1`,
              [customerId],
            );
            userId = custRes.rows[0]?.userId || null;
          }

          if (transactionId) {
            await pool.query(
              `INSERT INTO transactions (
                 "transactionId", "customerId", "userId", status,
                 "priceId", "productId", amount, "currencyCode", "createdAt"
               ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
               ON CONFLICT ("transactionId") DO UPDATE SET
                 status = EXCLUDED.status,
                 "userId" = COALESCE(EXCLUDED."userId", transactions."userId")`,
              [transactionId, customerId, userId, status, priceId, productId, amount, currencyCode],
            );

            // If one-time transaction is for the Founder Pass:
            const isFounderPurchase =
              (c.env.PADDLE_FOUNDER_PRICE_ID && priceId === c.env.PADDLE_FOUNDER_PRICE_ID) ||
              data.custom_data?.tier === 'founder';

            if (userId && isFounderPurchase) {
              await pool.query(
                `UPDATE "user" SET plan = 'founder', "updatedAt" = NOW() WHERE id = $1`,
                [userId],
              );
            }
          }
          break;
        }

        default:
          // Ignore unhandled events safely
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
      console.error(`Error processing Paddle webhook event ${eventType} (${eventId}):`, err);
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
        isSandbox,
      );

      return c.json({ success: true, url: portalSession.url });
    } catch (err: any) {
      console.error('Failed to create customer portal session:', err);
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
