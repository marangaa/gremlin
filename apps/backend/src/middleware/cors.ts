import { cors } from 'hono/cors';
import { createMiddleware } from 'hono/factory';
import type { AppEnv } from '../types/env';

const INTERNAL_SCHEME = 'chrome-extension://';
const DEFAULT_DEV_ORIGIN = 'http://localhost:5173';

/**
 * Parses a comma-separated environment variable into trimmed, non-empty entries.
 */
function parseList(value?: string): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

/**
 * Builds the exact origin allowlist from worker bindings.
 *
 * - Extension IDs from ALLOWED_EXTENSION_IDS become `chrome-extension://<id>` entries.
 * - Extra web origins come from ALLOWED_ORIGINS verbatim.
 * - Localhost dev origins and the permissive chrome-extension:// wildcard are only
 *   included outside production so local development keeps working unconfigured.
 */
export function buildAllowedOrigins(env: Partial<AppEnv['Bindings']> = {}): string[] {
  const isProduction = env.NODE_ENV === 'production';

  const origins = new Set<string>();

  for (const id of parseList(env.ALLOWED_EXTENSION_IDS)) {
    origins.add(`${INTERNAL_SCHEME}${id}`);
  }

  for (const origin of parseList(env.ALLOWED_ORIGINS)) {
    origins.add(origin);
  }

  if (!isProduction) {
    origins.add(DEFAULT_DEV_ORIGIN);
    origins.add('http://localhost:*');
    origins.add('http://127.0.0.1:*');
    // Permissive dev fallback: any installed extension until IDs are pinned.
    origins.add(`${INTERNAL_SCHEME}*`);
  }

  return [...origins];
}

/**
 * Validates whether an incoming HTTP Origin is an authorized client.
 *
 * Supports exact matches, `*` wildcards, and host wildcards.
 *
 * @param origin - The Origin header from the incoming request.
 * @param env - Worker bindings providing configured allowlists.
 * @returns Whether the origin is allowed.
 */
export function isAllowedOrigin(
  origin: string,
  env: Partial<AppEnv['Bindings']> = {},
): boolean {
  if (!origin) return false;

  for (const pattern of buildAllowedOrigins(env)) {
    if (pattern === origin) return true;

    const wildcardIndex = pattern.indexOf('*');
    if (wildcardIndex === -1) continue;

    const prefix = pattern.slice(0, wildcardIndex);
    const suffix = pattern.slice(wildcardIndex + 1);
    if (
      origin.startsWith(prefix) &&
      origin.endsWith(suffix) &&
      origin.length >= prefix.length + suffix.length
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Secure dynamic CORS middleware supporting Chrome Extension origins and credentials.
 * Allowlist is resolved per-request from worker bindings.
 */
export const dynamicCors = createMiddleware<AppEnv>(async (c, next) => {
  const handler = cors({
    origin: (origin) => {
      if (!origin) return DEFAULT_DEV_ORIGIN;
      if (isAllowedOrigin(origin, c.env)) {
        return origin;
      }
      return DEFAULT_DEV_ORIGIN;
    },
    allowHeaders: ['Content-Type', 'Authorization', 'x-requested-with', 'Cookie'],
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    exposeHeaders: ['Set-Cookie'],
    credentials: true,
    maxAge: 86400,
  });

  return handler(c, next);
});
