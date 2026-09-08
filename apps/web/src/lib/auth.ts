import { createAuthClient } from 'better-auth/react';

export const API_URL = (import.meta.env.VITE_API_URL as string | undefined) || 'http://localhost:8787';

/**
 * Shared Better Auth React client instance pointed at the Gremlin backend.
 * Provides useSession(), signIn, signUp, signOut, etc.
 */
export const authClient = createAuthClient({
  baseURL: API_URL,
});
