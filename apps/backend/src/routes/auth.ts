import { Hono } from 'hono';
import { getAuth } from '../lib/auth';
import { requireAuth } from '../middleware/auth';
import type { AppEnv } from '../types/env';

/**
 * Authentication and Session Introspection Router.
 *
 * NOTE: Polar webhooks are NOT handled here. The `@polar-sh/better-auth`
 * `webhooks()` plugin (registered in `createBetterAuthInstance`) owns
 * `POST /api/auth/polar/webhooks` — signature verification via
 * `validateEvent()` plus routing to our `onOrderPaid` /
 * `onCustomerStateChanged` / `onPayload` tier-sync handlers. The catch-all
 * route below (`ALL /api/auth/*`) forwards that path to the Better Auth
 * handler, which dispatches it to the plugin endpoint. Keep this route
 * mounted BEFORE the catch-all, and never shadow `/polar/webhooks` here.
 */
export const authRoutes = new Hono<AppEnv>()
  /**
   * Introspect current active session and user profile, including the
   * server-managed billing tier (`plan`) needed for Pro gating UI.
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
          plan: user.plan === 'pro' ? 'pro' : 'free',
        },
        session: {
          id: session.id,
          expiresAt: session.expiresAt,
        },
      },
    });
  })

  /**
   * Forward all Better Auth standard endpoints (sign-in, sign-up, sign-out,
   * session) plus every plugin endpoint — including the Polar plugin's
   * `POST /polar/webhooks` receiver.
   */
  .all('/*', async (c) => {
    const auth = getAuth(c.env);
    return auth.handler(c.req.raw);
  });
