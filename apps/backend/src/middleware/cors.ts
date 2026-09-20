import { cors } from 'hono/cors';
import { createMiddleware } from 'hono/factory';
import type { AppEnv } from '../types/env';

/**
 * Builds the origin allowlist for Hono CORS and Better Auth trustedOrigins.
 * Keeps things simple: frontend URL, backend URL, chrome extensions, and any extra origins from env.
 */
export function buildAllowedOrigins(env: Partial<AppEnv['Bindings']> = {}): string[] {
  const frontendUrl = (env.FRONTEND_URL || 'http://localhost:5173').trim();
  const backendUrl = (env.BETTER_AUTH_URL || 'http://localhost:8700').trim();

  const extensionOrigins = parseExtensionOrigins(env.ALLOWED_EXTENSION_IDS);

  const origins = new Set<string>([
    frontendUrl,
    backendUrl,
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:8700',
    'http://localhost:8787',
    ...extensionOrigins,
  ]);

  if (env.ALLOWED_ORIGINS) {
    for (const o of env.ALLOWED_ORIGINS.split(',')) {
      const trimmed = o.trim();
      if (trimmed && trimmed !== 'chrome-extension://*') origins.add(trimmed);
    }
  }

  return [...origins];
}

/**
 * Expands ALLOWED_EXTENSION_IDS into exact `chrome-extension://<id>` origins.
 * Better Auth trustedOrigins requires exact origins — a `chrome-extension://*`
 * wildcard is rejected by its CSRF check, so we never emit one here.
 */
function parseExtensionOrigins(value?: string): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((entry) => entry.trim().replace(/^chrome-extension:\/\//, ''))
    .filter(Boolean)
    .map((id) => `chrome-extension://${id}`);
}

/**
 * Lightweight CORS middleware supporting frontend, backend, and extension requests.
 */
export const dynamicCors = createMiddleware<AppEnv>(async (c, next) => {
  const allowed = buildAllowedOrigins(c.env);
  const frontendUrl = c.env.FRONTEND_URL || 'http://localhost:5173';

  const handler = cors({
    origin: (origin) => {
      if (!origin) return frontendUrl;
      if (origin.startsWith('chrome-extension://')) return origin;
      if (allowed.includes(origin)) return origin;
      if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) return origin;
      return frontendUrl;
    },
    allowHeaders: [
      'Content-Type',
      'Authorization',
      'x-requested-with',
      'Cookie',
      'x-byok-key',
      'x-byok-provider',
      'x-byok-model',
      'x-byok-endpoint',
    ],
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    exposeHeaders: ['Set-Cookie'],
    credentials: true,
    maxAge: 86400,
  });

  return handler(c, next);
});
