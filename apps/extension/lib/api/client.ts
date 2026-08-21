import { hc } from 'hono/client';
import type { AppType } from '@gremlin/backend';

/**
 * Resolves the backend API base URL from WXT environment variables,
 * defaulting to the local development server if not set.
 */
export const API_BASE_URL =
  import.meta.env.WXT_API_URL || 'http://localhost:8787';

/**
 * Type-safe RPC Client for the Gremlin Hono Backend.
 * Automatically transmits browser extension cookies and authentication headers.
 */
export const api = hc<AppType>(API_BASE_URL, {
  headers: {
    'x-requested-with': 'Gremlin-Browser-Extension',
  },
  fetch: (input: RequestInfo | URL, init?: RequestInit) => {
    return fetch(input, {
      ...init,
      credentials: 'include',
    });
  },
});
