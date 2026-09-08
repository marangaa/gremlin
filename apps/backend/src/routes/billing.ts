import { Hono } from 'hono';
import { eq, and, or, inArray, desc, sql } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth';
import type { AppEnv } from '../types/env';
import {
  getDb,
  customers,
  subscriptions,
  processedWebhooks,
  user as userTable,
} from '../lib/db';
import {
  unmarshalPaddleWebhook,
  getPaddleInstance,
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
   * - Deduplicates delivery on `eventId` using Drizzle type-safe ledger.
   * - Idempotently mirrors customer and subscription state to Neon PostgreSQL via Drizzle.
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
    const db = getDb(c.env.DATABASE_URL);

    // 1. Idempotency check via processed_webhooks ledger with Drizzle
    const existing = await db
      .select({ eventId: processedWebhooks.eventId })
      .from(processedWebhooks)
      .where(eq(processedWebhooks.eventId, eventId))
      .limit(1);

    if (existing.length > 0) {
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
            const existingUser = await db
              .select({ id: userTable.id })
              .from(userTable)
              .where(eq(sql`LOWER(${userTable.email})`, email))
              .limit(1);

            const matchedUserId = existingUser[0]?.id || null;

            await db
              .insert(customers)
              .values({
                customerId,
                userId: matchedUserId,
                email,
                updatedAt: new Date(),
              })
              .onConflictDoUpdate({
                target: customers.customerId,
                set: {
                  userId: sql`COALESCE(EXCLUDED."userId", ${customers.userId})`,
                  email: sql`EXCLUDED.email`,
                  updatedAt: new Date(),
                },
              });

            logger.info('Customer mirrored successfully', { customerId, email, userId: matchedUserId });
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
          let matchedUserId: string | null = null;
          let customerEmail: string = '';

          if (customerId) {
            const custRes = await db
              .select({ userId: customers.userId, email: customers.email })
              .from(customers)
              .where(eq(customers.customerId, customerId))
              .limit(1);

            if (custRes[0]) {
              matchedUserId = custRes[0].userId;
              customerEmail = custRes[0].email;
            } else {
              // Fetch customer from Paddle API if not yet in local cache
              try {
                const paddle = getPaddleInstance(apiKey, isSandbox ? 'sandbox' : 'production');
                const fetchedCustomer = await paddle.customers.get(customerId);
                if (fetchedCustomer) {
                  customerEmail = fetchedCustomer.email;
                  const uRes = await db
                    .select({ id: userTable.id })
                    .from(userTable)
                    .where(eq(sql`LOWER(${userTable.email})`, customerEmail.toLowerCase()))
                    .limit(1);
                  matchedUserId = uRes[0]?.id || null;

                  await db
                    .insert(customers)
                    .values({
                      customerId,
                      userId: matchedUserId,
                      email: customerEmail,
                      updatedAt: new Date(),
                    })
                    .onConflictDoUpdate({
                      target: customers.customerId,
                      set: {
                        userId: matchedUserId,
                        email: customerEmail,
                        updatedAt: new Date(),
                      },
                    });
                }
              } catch (custErr: any) {
                logger.warn('Failed to fetch customer from Paddle API', { customerId, error: custErr?.message });
              }
            }
          }

          // Check if customData or custom_data passed userId
          if (!matchedUserId && (sub.customData?.userId || sub.custom_data?.userId)) {
            matchedUserId = String(sub.customData?.userId || sub.custom_data?.userId);
          }

          // If userId not yet bridged, match by email from user table
          if (!matchedUserId && customerEmail) {
            const uRes = await db
              .select({ id: userTable.id })
              .from(userTable)
              .where(eq(sql`LOWER(${userTable.email})`, customerEmail.toLowerCase()))
              .limit(1);

            matchedUserId = uRes[0]?.id || null;
          }

          if (subscriptionId && customerId) {
            await db
              .insert(subscriptions)
              .values({
                subscriptionId,
                customerId,
                userId: matchedUserId,
                status,
                priceId,
                productId,
                scheduledChange,
                currentBillingPeriodEnd,
                updatedAt: new Date(),
              })
              .onConflictDoUpdate({
                target: subscriptions.subscriptionId,
                set: {
                  userId: sql`COALESCE(EXCLUDED."userId", ${subscriptions.userId})`,
                  status: sql`EXCLUDED.status`,
                  priceId: sql`EXCLUDED."priceId"`,
                  productId: sql`EXCLUDED."productId"`,
                  scheduledChange: sql`EXCLUDED."scheduledChange"`,
                  currentBillingPeriodEnd: sql`EXCLUDED."currentBillingPeriodEnd"`,
                  updatedAt: new Date(),
                },
              });

            // Update user plan entitlement (strictly 'pro' vs 'free')
            if (matchedUserId) {
              if (status === 'active' || status === 'trialing') {
                await db
                  .update(userTable)
                  .set({ plan: 'pro', updatedAt: new Date() })
                  .where(eq(userTable.id, matchedUserId));
                logger.info('User upgraded to Pro', { userId: matchedUserId, subscriptionId, status });
              } else if (status === 'canceled' || status === 'paused') {
                await db
                  .update(userTable)
                  .set({ plan: 'free', updatedAt: new Date() })
                  .where(eq(userTable.id, matchedUserId));
                logger.info('User downgraded to Free', { userId: matchedUserId, subscriptionId, status });
              }
            }
          }
          break;
        }

        default:
          logger.debug('Unhandled Paddle webhook event received', { eventType, eventId });
          break;
      }

      // 3. Mark event processed in ledger with Drizzle
      await db
        .insert(processedWebhooks)
        .values({
          eventId,
          eventType,
          processedAt: new Date(),
        })
        .onConflictDoNothing();

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

    const db = getDb(c.env.DATABASE_URL);

    // Look up user's Paddle customer record
    const custRes = await db
      .select({ customerId: customers.customerId })
      .from(customers)
      .where(
        or(
          eq(customers.userId, user.id),
          eq(sql`LOWER(${customers.email})`, user.email.toLowerCase()),
        ),
      )
      .limit(1);

    const customerId = custRes[0]?.customerId;
    if (!customerId) {
      return c.json(
        { error: 'No Paddle customer record found for this account. Please subscribe first.' },
        404,
      );
    }

    // Look up active subscription IDs for deep-linking
    const subRes = await db
      .select({ subscriptionId: subscriptions.subscriptionId })
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.customerId, customerId),
          inArray(subscriptions.status, ['active', 'trialing', 'past_due']),
        ),
      );

    const subscriptionIds = subRes.map((r) => r.subscriptionId);
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
    const db = getDb(c.env.DATABASE_URL);

    const subRes = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, user.id))
      .orderBy(desc(subscriptions.createdAt))
      .limit(1);

    const sub = subRes[0] || null;

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
