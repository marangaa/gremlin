import { betterAuth } from 'better-auth';
import { anonymous } from 'better-auth/plugins';
import type { Bindings } from '../types/env';
import { buildAllowedOrigins } from '../middleware/cors';
import { getPool } from './db';

/**
 * In-memory cache for the Better Auth instance per worker isolate.
 */
let cachedAuth: ReturnType<typeof createBetterAuthInstance> | null = null;
let cachedDbUrl: string | null = null;

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

export function createBetterAuthInstance(env?: Partial<Bindings>) {
  const pool = getPool(
    env?.DATABASE_URL || process.env.DATABASE_URL || 'postgresql://localhost:5432/gremlin',
  );

  return betterAuth({
    database: pool,
    secret: env?.BETTER_AUTH_SECRET || process.env.BETTER_AUTH_SECRET || 'development_secret_key_minimum_32_characters_long',
    baseURL: env?.BETTER_AUTH_URL || process.env.BETTER_AUTH_URL || 'http://localhost:8787',
    basePath: '/api/auth',
    plugins: [
      anonymous(),
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
      enabled: true,
      // In-memory counters are per-isolate and meaningless on Workers;
      // persist windows in the `rate_limit` table instead.
      storage: 'database',
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
  if (cachedAuth && cachedDbUrl === env.DATABASE_URL) {
    return cachedAuth;
  }

  const authInstance = createBetterAuthInstance(env);
  cachedAuth = authInstance;
  cachedDbUrl = env.DATABASE_URL;
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
