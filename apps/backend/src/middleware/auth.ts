import { createMiddleware } from 'hono/factory';
import { HTTPException } from 'hono/http-exception';
import { getAuth } from '../lib/auth';
import type { AppEnv } from '../types/env';

/**
 * Enforces session authentication on protected Hono routes.
 * Populates `c.set('session', ...)` and `c.set('user', ...)`.
 *
 * @throws {HTTPException} 401 Unauthorized if no valid session exists.
 */
export const requireAuth = createMiddleware<AppEnv>(async (c, next) => {
  const auth = getAuth(c.env);
  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
  });

  if (!session || !session.user) {
    throw new HTTPException(401, {
      message: 'Authentication required. Please sign in.',
    });
  }

  c.set('session', session.session as unknown as AppEnv['Variables']['session']);
  c.set('user', session.user as unknown as AppEnv['Variables']['user']);

  await next();
});

/**
 * Optional session middleware. Populates session context if present without blocking.
 */
export const optionalAuth = createMiddleware<AppEnv>(async (c, next) => {
  try {
    const auth = getAuth(c.env);
    const session = await auth.api.getSession({
      headers: c.req.raw.headers,
    });

    if (session && session.user) {
      c.set('session', session.session as unknown as AppEnv['Variables']['session']);
      c.set('user', session.user as unknown as AppEnv['Variables']['user']);
    } else {
      c.set('session', null);
      c.set('user', null);
    }
  } catch {
    c.set('session', null);
    c.set('user', null);
  }

  await next();
});
