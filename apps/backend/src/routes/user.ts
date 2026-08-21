import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';
import type { AppEnv } from '../types/env';
import type { UserProfile } from '@gremlin/shared';

/**
 * User Profile and Account Management Router.
 */
export const userRoutes = new Hono<AppEnv>()
  .use('*', requireAuth)

  /**
   * Fetch current user profile with subscription plan tier.
   */
  .get('/profile', (c) => {
    const user = c.get('user')!;

    const profile: UserProfile = {
      id: user.id,
      email: user.email,
      name: user.name || undefined,
      plan: user.plan === 'pro' ? 'pro' : 'free',
      createdAt: new Date(user.createdAt).getTime(),
    };

    return c.json({
      success: true as const,
      data: profile,
    });
  })

  /**
   * Update user display name.
   */
  .patch('/profile', zValidator('json', z.object({ name: z.string().max(100).optional() })), async (c) => {
    const user = c.get('user')!;
    const body = c.req.valid('json');

    return c.json({
      success: true as const,
      data: {
        id: user.id,
        name: body.name || user.name,
        updatedAt: Date.now(),
      },
    });
  });
