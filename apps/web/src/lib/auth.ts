import { createAuthClient } from 'better-auth/react';
import { polarClient } from '@polar-sh/better-auth/client';
import { QueryClient } from '@tanstack/react-query';

export const API_URL = (import.meta.env.VITE_API_URL as string | undefined) || 'http://localhost:8700';

/**
 * Shared Better Auth React client instance pointed at the Gremlin backend.
 * The Polar client plugin is fully typed: `authClient.checkout({ slug })`,
 * `authClient.customer.portal()`, `authClient.customer.state()`,
 * `authClient.customer.benefits/subscriptions/orders.list()`, and
 * `authClient.usage.ingest()` / `authClient.usage.meters.list()` — no casts needed.
 */
export const authClient = createAuthClient({
  baseURL: API_URL,
  plugins: [polarClient()],
  fetchOptions: {
    // Web (5173 / fasihi.xyz) talks to the API cross-origin — without this
    // the session cookie is never sent and authenticated endpoints
    // (checkout, portal, customer.state) 401 even while useSession shows a
    // user. Mirrors the extension client's credentials:'include' (docs:
    // Better Auth client fetchOptions).
    credentials: 'include',
  },
});

/**
 * Shared TanStack Query client: the single owner of ALL server state
 * (profile/plan, Polar customer.state, portal/checkout mutations).
 * Component useState keeps UI-only state (tabs, forms, loading flags);
 * WXT storage keeps extension-local persistence. Nothing hand-rolls
 * useEffect+fetch anymore — use useQuery/useMutation with keys below.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

/** Canonical query keys — one per server fact, shared by all consumers. */
export const queryKeys = {
  profile: ['profile'] as const,
  customerState: ['customer-state'] as const,
};
