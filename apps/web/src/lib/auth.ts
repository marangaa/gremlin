import { createAuthClient } from 'better-auth/react';
import { polarClient } from '@polar-sh/better-auth/client';

export const API_URL = (import.meta.env.VITE_API_URL as string | undefined) || 'http://localhost:8700';

/**
 * Shared Better Auth React client instance pointed at the Gremlin backend.
 * Provides useSession(), signIn, signUp, signOut, checkout, customer.portal, etc.
 */
export const authClient = createAuthClient({
  baseURL: API_URL,
  plugins: [polarClient()],
});
