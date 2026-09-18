import { betterAuth } from 'better-auth';
import { anonymous } from 'better-auth/plugins';
import { polar, checkout, portal, webhooks } from '@polar-sh/better-auth';
import { Polar } from '@polar-sh/sdk';
import { eq, sql } from 'drizzle-orm';
import type { Bindings } from '../types/env';
import { buildAllowedOrigins } from '../middleware/cors';
import { getPool, getDb, user as userTable } from './db';
import { logger } from './logger';

/**
 * In-memory cache for the Better Auth instance per worker isolate.
 */
let cachedAuth: ReturnType<typeof createBetterAuthInstance> | null = null;
let cachedDbUrl: string | null = null;
let cachedPolarToken: string | null = null;
let cachedPolarSecret: string | null = null;

function parseList(value?: string): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

/**
 * Builds Better Auth trusted origins from worker bindings.
 *
 * Mirrors the CORS allowlist because Better Auth performs its own Origin/CSRF
 * validation against this list whenever cookies are present.
 */
function buildTrustedOrigins(env: Partial<Bindings> = {}): string[] {
  const isProduction = env?.NODE_ENV === 'production';

  const origins = new Set<string>(buildAllowedOrigins(env));

  if (!isProduction) {
    // Permissive dev fallback until extension IDs are pinned via ALLOWED_EXTENSION_IDS.
    origins.add('chrome-extension://*');
  }

  return [...origins];
}

/**
 * Resolves user identifier from a Polar webhook payload and upgrades their plan to 'pro'.
 */
async function handlePolarUpgrade(databaseUrl: string, payload: any, eventType: string) {
  try {
    const db = getDb(databaseUrl);
    const customer = payload?.data?.customer;
    const externalId =
      customer?.external_id ||
      customer?.externalId ||
      payload?.data?.metadata?.userId ||
      payload?.data?.metadata?.referenceId ||
      payload?.data?.custom_field_data?.userId;

    const email =
      customer?.email ||
      payload?.data?.customer_email ||
      payload?.data?.email;

    if (externalId) {
      await db
        .update(userTable)
        .set({ plan: 'pro', updatedAt: new Date() })
        .where(eq(userTable.id, String(externalId)));
      logger.info(`User upgraded to Pro via Polar ${eventType} (by externalId)`, {
        userId: externalId,
      });
    } else if (email) {
      await db
        .update(userTable)
        .set({ plan: 'pro', updatedAt: new Date() })
        .where(eq(sql`LOWER(${userTable.email})`, String(email).toLowerCase().trim()));
      logger.info(`User upgraded to Pro via Polar ${eventType} (by email)`, {
        email,
      });
    } else {
      logger.warn(`Polar ${eventType} webhook received without identifiable user or email`, {
        dataId: payload?.data?.id,
      });
    }
  } catch (err) {
    logger.error(`Failed to handle Polar ${eventType} webhook`, err);
  }
}

/**
 * Resolves user identifier from a Polar webhook payload and downgrades their plan to 'free'.
 */
async function handlePolarDowngrade(databaseUrl: string, payload: any, eventType: string) {
  try {
    const db = getDb(databaseUrl);
    const customer = payload?.data?.customer;
    const externalId =
      customer?.external_id ||
      customer?.externalId ||
      payload?.data?.metadata?.userId ||
      payload?.data?.metadata?.referenceId ||
      payload?.data?.custom_field_data?.userId;

    const email =
      customer?.email ||
      payload?.data?.customer_email ||
      payload?.data?.email;

    if (externalId) {
      await db
        .update(userTable)
        .set({ plan: 'free', updatedAt: new Date() })
        .where(eq(userTable.id, String(externalId)));
      logger.info(`User downgraded to Free via Polar ${eventType} (by externalId)`, {
        userId: externalId,
      });
    } else if (email) {
      await db
        .update(userTable)
        .set({ plan: 'free', updatedAt: new Date() })
        .where(eq(sql`LOWER(${userTable.email})`, String(email).toLowerCase().trim()));
      logger.info(`User downgraded to Free via Polar ${eventType} (by email)`, {
        email,
      });
    }
  } catch (err) {
    logger.error(`Failed to handle Polar ${eventType} webhook`, err);
  }
}

export function createBetterAuthInstance(env?: Partial<Bindings>) {
  const pool = getPool(
    env?.DATABASE_URL || process.env.DATABASE_URL || 'postgresql://localhost:5432/gremlin',
  );

  const polarPlugins = env?.POLAR_ACCESS_TOKEN
    ? [
        polar({
          client: new Polar({
            accessToken: env.POLAR_ACCESS_TOKEN,
            server: (env.POLAR_ENV || 'production') === 'sandbox' ? 'sandbox' : 'production',
          }),
          createCustomerOnSignUp: true,
          use: [
            checkout({
              products: [
                {
                  productId: env.POLAR_PRO_PRODUCT_ID || '',
                  slug: 'pro',
                },
              ],
              successUrl: `${env.FRONTEND_URL || 'https://gremlin.fasihi.xyz'}/pricing?success=true`,
              authenticatedUsersOnly: true,
            }),
            portal(),
            webhooks({
              secret: env.POLAR_WEBHOOK_SECRET || '',
              onSubscriptionCreated: async (payload: any) => {
                const status = payload?.data?.status;
                if (status === 'active' || status === 'trialing') {
                  await handlePolarUpgrade(env.DATABASE_URL!, payload, 'subscription.created');
                }
              },
              onSubscriptionActive: async (payload: any) => {
                await handlePolarUpgrade(env.DATABASE_URL!, payload, 'subscription.active');
              },
              onOrderPaid: async (payload: any) => {
                await handlePolarUpgrade(env.DATABASE_URL!, payload, 'order.paid');
              },
              onSubscriptionCanceled: async (payload: any) => {
                await handlePolarDowngrade(env.DATABASE_URL!, payload, 'subscription.canceled');
              },
              onSubscriptionRevoked: async (payload: any) => {
                await handlePolarDowngrade(env.DATABASE_URL!, payload, 'subscription.revoked');
              },
            }),
          ],
        }),
      ]
    : [];

  return betterAuth({
    database: pool,
    secret: env?.BETTER_AUTH_SECRET || process.env.BETTER_AUTH_SECRET || 'development_secret_key_minimum_32_characters_long',
    baseURL: env?.BETTER_AUTH_URL || process.env.BETTER_AUTH_URL || 'http://localhost:8700',
    basePath: '/api/auth',
    plugins: [
      anonymous(),
      ...polarPlugins,
    ],
    emailAndPassword: {
      enabled: true,
      autoSignIn: true,
      requireEmailVerification: false,
    },
    user: {
      additionalFields: {
        /**
         * Billing tier. Server-managed only (`input: false`) so it can never be
         * set through client sign-up/update payloads; mutated exclusively by
         * billing webhooks and admin flows.
         */
        plan: {
          type: 'string',
          defaultValue: 'free',
          input: false,
        },
      },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
      /**
       * Caches the signed session payload in a cookie for 5 minutes so MV3
       * service-worker wake-ups don't hit Postgres on every getSession call.
       */
      cookieCache: {
        enabled: true,
        maxAge: 5 * 60,
      },
    },
    advanced: {
      ipAddress: {
        // Cloudflare terminates TLS; real client IP arrives in this header.
        ipAddressHeaders: ['cf-connecting-ip'],
      },
    },
    rateLimit: {
      enabled: false,
    },
    trustedOrigins: buildTrustedOrigins(env),
  });
}

/**
 * Static auth export for Better Auth CLI introspection and schema generation.
 */
export const auth = createBetterAuthInstance();

/**
 * Initializes or retrieves the memoized Better Auth instance using Neon Serverless.
 *
 * @param env - Cloudflare Worker environment bindings containing database credentials.
 * @returns Configured Better Auth instance.
 */
export function getAuth(env: Bindings) {
  if (
    cachedAuth &&
    cachedDbUrl === env.DATABASE_URL &&
    cachedPolarToken === (env.POLAR_ACCESS_TOKEN || null) &&
    cachedPolarSecret === (env.POLAR_WEBHOOK_SECRET || null)
  ) {
    return cachedAuth;
  }

  const authInstance = createBetterAuthInstance(env);
  cachedAuth = authInstance;
  cachedDbUrl = env.DATABASE_URL;
  cachedPolarToken = env.POLAR_ACCESS_TOKEN || null;
  cachedPolarSecret = env.POLAR_WEBHOOK_SECRET || null;
  return authInstance;
}

export type AuthInstance = ReturnType<typeof getAuth>;

export interface Session {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  ipAddress?: string;
  userAgent?: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  image?: string;
  plan: 'free' | 'pro' | string;
  createdAt: Date;
  updatedAt: Date;
}
