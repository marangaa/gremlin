import { betterAuth } from 'better-auth';
import { polar, checkout, portal, usage } from '@polar-sh/better-auth';
import { Polar } from '@polar-sh/sdk';
import { eq, sql } from 'drizzle-orm';
import type { Bindings } from '../types/env';
import { buildAllowedOrigins } from '../middleware/cors';
import { getPool, getDb, user as userTable } from './db';
import { logger } from './logger';

/**
 * Memoized Better Auth instance per worker isolate, keyed on the full
 * binding fingerprint that affects auth behaviour (see `getAuth`).
 */
let cachedAuth: ReturnType<typeof createBetterAuthInstance> | null = null;
let cachedFingerprint: string | null = null;

/** Polar bindings required before the billing suite can be safely enabled. */
interface PolarBillingConfig {
  accessToken: string;
  webhookSecret: string;
  proProductId: string;
  server: 'sandbox' | 'production';
  successUrl: string;
}

function fingerprintBindings(env: Partial<Bindings>): string {
  return JSON.stringify({
    db: env.DATABASE_URL ?? null,
    secret: env.BETTER_AUTH_SECRET ?? null,
    baseUrl: env.BETTER_AUTH_URL ?? null,
    frontend: env.FRONTEND_URL ?? null,
    extIds: env.ALLOWED_EXTENSION_IDS ?? null,
    origins: env.ALLOWED_ORIGINS ?? null,
    nodeEnv: env.NODE_ENV ?? null,
    polarToken: env.POLAR_ACCESS_TOKEN ?? null,
    polarSecret: env.POLAR_WEBHOOK_SECRET ?? null,
    polarProduct: env.POLAR_PRO_PRODUCT_ID ?? null,
    polarEnv: env.POLAR_ENV ?? null,
  });
}

/**
 * Builds Better Auth trusted origins from worker bindings.
 *
 * Mirrors the CORS allowlist because Better Auth performs its own Origin/CSRF
 * validation against this list whenever cookies are present. Only exact
 * origins are emitted — no `chrome-extension://*` wildcard, which Better Auth
 * rejects. In non-production, pinned extension IDs (if any) plus localhost
 * dev origins apply; production requires ALLOWED_EXTENSION_IDS.
 */
function buildTrustedOrigins(env: Partial<Bindings> = {}): string[] {
  const isProduction = env?.NODE_ENV === 'production';
  const origins = buildAllowedOrigins(env);

  if (!isProduction) {
    return origins;
  }

  if (!env.ALLOWED_EXTENSION_IDS?.trim()) {
    logger.warn(
      'ALLOWED_EXTENSION_IDS is empty in production — extension origins will not be trusted by Better Auth.',
    );
  }

  return origins;
}

/**
 * Resolves + validates the Polar billing bindings.
 *
 * Returns `null` (billing disabled) when no access token is configured.
 * Throws in production when a token exists but the product ID or webhook
 * secret is missing — silently registering checkout/webhooks with empty
 * strings would break purchases and signature verification.
 */
function resolvePolarConfig(env: Partial<Bindings>): PolarBillingConfig | null {
  const accessToken = env.POLAR_ACCESS_TOKEN?.trim();
  if (!accessToken) return null;

  const proProductId = env.POLAR_PRO_PRODUCT_ID?.trim();
  const webhookSecret = env.POLAR_WEBHOOK_SECRET?.trim();
  const server = (env.POLAR_ENV || 'production') === 'sandbox' ? 'sandbox' : 'production';
  const frontendUrl = (env.FRONTEND_URL || 'https://gremlin.fasihi.xyz').trim().replace(/\/$/, '');

  if (env.NODE_ENV === 'production') {
    const missing: string[] = [];
    if (!proProductId) missing.push('POLAR_PRO_PRODUCT_ID');
    if (!webhookSecret) missing.push('POLAR_WEBHOOK_SECRET');
    if (missing.length > 0) {
      throw new Error(
        `Polar billing is misconfigured in production: missing ${missing.join(', ')}. ` +
          'Set them via `wrangler secret put` / worker bindings.',
      );
    }
  }

  if (!proProductId || !webhookSecret) {
    logger.warn(
      'Polar billing is partially configured (missing product ID or webhook secret) — checkout and webhooks are disabled.',
    );
    return null;
  }

  return {
    accessToken,
    webhookSecret,
    proProductId,
    server,
    successUrl: `${frontendUrl}/pricing?checkout_id={CHECKOUT_ID}&success=true`,
  };
}

/**
 * Canonical Polar webhook payload accessors. The plugin passes
 * `validateEvent()` output, which deserializes wire JSON into camelCase
 * (`externalId`, `activeSubscriptions`). Raw REST payloads use snake_case
 * (`external_id`, `active_subscriptions`) — handle both shapes defensively.
 */
type CustomerIdentity = {
  external_id?: unknown;
  externalId?: unknown;
  email?: unknown;
  active_subscriptions?: unknown;
  activeSubscriptions?: unknown;
} | null | undefined;

function resolveCustomerUserId(customer: CustomerIdentity): string | null {
  if (!customer || typeof customer !== 'object') return null;
  const raw = customer.externalId ?? customer.external_id;
  return typeof raw === 'string' && raw.trim() ? raw : null;
}

function resolveCustomerEmail(customer: CustomerIdentity): string | null {
  if (!customer || typeof customer !== 'object') return null;
  const raw = customer.email;
  return typeof raw === 'string' && raw.trim() ? raw.trim() : null;
}

function hasActiveSubscription(customer: CustomerIdentity): boolean {
  if (!customer || typeof customer !== 'object') return false;
  const raw = customer.activeSubscriptions ?? customer.active_subscriptions;
  return Array.isArray(raw) && raw.length > 0;
}

async function setUserPlan(
  env: Partial<Bindings> | undefined,
  where: { id: string } | { email: string },
  plan: 'pro' | 'free',
): Promise<void> {
  const databaseUrl = env?.DATABASE_URL || process.env.DATABASE_URL;
  if (!databaseUrl) {
    logger.warn('Skipping plan update: DATABASE_URL is not configured.');
    return;
  }
  const db = getDb(databaseUrl);
  if ('id' in where) {
    await db.update(userTable).set({ plan, updatedAt: new Date() }).where(eq(userTable.id, where.id));
  } else {
    await db
      .update(userTable)
      .set({ plan, updatedAt: new Date() })
      .where(eq(sql`LOWER(${userTable.email})`, where.email.toLowerCase()));
  }
}

/**
 * Handles verified Polar webhook events to sync user billing tiers.
 */
export async function processPolarWebhookEvent(
  env: Partial<Bindings> | undefined,
  event: any,
): Promise<void> {
  const type = event?.type;
  if (type === 'order.paid') {
    const customer = event?.data?.customer;
    const externalId = resolveCustomerUserId(customer);
    const email = resolveCustomerEmail(customer);

    if (externalId) {
      await setUserPlan(env, { id: externalId }, 'pro');
      logger.info(`Order paid: user ${externalId} upgraded to Pro`);
    } else if (email) {
      await setUserPlan(env, { email }, 'pro');
      logger.info(`Order paid: user ${email} upgraded to Pro`);
    } else {
      logger.warn('Order paid webhook arrived without external_id or email; plan unchanged.');
    }
  } else if (type === 'customer.state_changed') {
    const customerState = event?.data;
    const userId = resolveCustomerUserId(customerState);
    const email = resolveCustomerEmail(customerState);
    const plan = hasActiveSubscription(customerState) ? 'pro' : 'free';

    if (userId) {
      await setUserPlan(env, { id: userId }, plan);
      logger.info(`Customer state synced: user ${userId} plan set to ${plan}`);
    } else if (email) {
      await setUserPlan(env, { email }, plan);
      logger.info(`Customer state synced: user ${email} plan set to ${plan}`);
    } else {
      logger.warn('Customer state webhook arrived without external_id or email; plan unchanged.');
    }
  }
}

export function createBetterAuthInstance(env?: Partial<Bindings>) {
  const pool = getPool(
    env?.DATABASE_URL || process.env.DATABASE_URL || 'postgresql://localhost:5432/gremlin',
  );

  const polarConfig = resolvePolarConfig(env ?? {});
  const polarPlugins = polarConfig
    ? [
        polar({
          client: new Polar({
            accessToken: polarConfig.accessToken,
            server: polarConfig.server,
          }),
          createCustomerOnSignUp: true,
          use: [
            checkout({
              products: [
                {
                  productId: polarConfig.proProductId,
                  slug: 'pro',
                },
              ],
              successUrl: polarConfig.successUrl,
              authenticatedUsersOnly: true,
            }),
            portal(),
            usage(),
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
       * cookieCache intentionally DISABLED for billing correctness: a cached
       * cookie snapshot freezes `plan` for up to maxAge after webhooks flip
       * it in the DB, so the badge/gate would show stale Pro/Free. MV3 wake-up
       * cost is one indexed session lookup — acceptable for a correct tier.
       */
      cookieCache: {
        enabled: false,
      },
    },
    rateLimit: {
      enabled: false,
    },
    advanced: {
      ipAddress: {
        // Cloudflare terminates TLS; real client IP arrives in this header.
        ipAddressHeaders: ['cf-connecting-ip'],
      },
      /**
       * Cross-site session cookies: the web app (5173 / fasihi.xyz) calls
       * this API cross-origin with `credentials: 'include'`, so production
       * (https) needs `SameSite=None; Secure`. Localhost stays Lax/non-secure
       * because browsers drop `Secure` cookies over plain http. Derived from
       * BETTER_AUTH_URL / FRONTEND_URL so no per-env code branch is needed.
       */
      cookies: {
        session_token: {
          attributes: {
            sameSite:
              (env?.BETTER_AUTH_URL || env?.FRONTEND_URL || '').startsWith('https://')
                ? 'none'
                : 'lax',
            secure: (env?.BETTER_AUTH_URL || env?.FRONTEND_URL || '').startsWith('https://'),
            path: '/',
          },
        },
      },
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
 * The memo is keyed on every binding that influences the instance (DB, auth
 * URLs/secrets, origins, and Polar config) so a binding rotation inside the
 * same isolate can never keep serving a stale instance.
 *
 * @param env - Cloudflare Worker environment bindings containing database credentials.
 * @returns Configured Better Auth instance.
 */
export function getAuth(env: Bindings) {
  const fingerprint = fingerprintBindings(env ?? {});
  if (cachedAuth && cachedFingerprint === fingerprint) {
    return cachedAuth;
  }

  const authInstance = createBetterAuthInstance(env);
  cachedAuth = authInstance;
  cachedFingerprint = fingerprint;
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
