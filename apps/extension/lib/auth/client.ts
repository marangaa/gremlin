import { createAuthClient } from 'better-auth/client';
import { API_BASE_URL } from '../api/client';

// Vanilla Better Auth client — framework-free so it can run inside both the
// MV3 background service worker and the React popup. React hooks (useSession)
// remain available via authClient.useSession where a React tree exists.
export const authClient = createAuthClient({
  baseURL: API_BASE_URL,
  fetchOptions: {
    credentials: 'include',
    headers: {
      'x-requested-with': 'Gremlin-Browser-Extension',
    },
  },
});

export const { signIn, signUp, signOut, getSession, useSession } = authClient;

/**
 * Session shape for consumers needing explicit typing.
 * Plan tier rides on session.user.plan once server additionalFields are wired.
 */
export type GremlinSession = Awaited<ReturnType<typeof getSession>>;
