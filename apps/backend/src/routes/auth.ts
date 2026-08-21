import { Hono } from 'hono';
import { getAuth } from '../lib/auth';
import { requireAuth } from '../middleware/auth';
import type { AppEnv } from '../types/env';

/**
 * Authentication and Session Introspection Router.
 */
export const authRoutes = new Hono<AppEnv>()
  /**
   * Introspect current active session and user profile.
   */
  .get('/session', requireAuth, (c) => {
    const user = c.get('user')!;
    const session = c.get('session')!;

    return c.json({
      success: true as const,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        },
        session: {
          id: session.id,
          expiresAt: session.expiresAt,
        },
      },
    });
  })

  /**
   * Forward all Better Auth standard endpoints (sign-in, sign-up, sign-out, session).
   */
  .all('/*', async (c) => {
    const auth = getAuth(c.env);
    return auth.handler(c.req.raw);
  });
