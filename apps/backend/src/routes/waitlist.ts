import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { AppEnv } from '../types/env';
import { getDb, waitlist } from '../lib/db';
import { logger } from '../lib/logger';

const joinWaitlistSchema = z.object({
  email: z.string().email('Please enter a valid email address').max(255),
  source: z.string().max(64).optional().default('website'),
});

export const waitlistRoutes = new Hono<AppEnv>()
  /**
   * Submit email to join the waitlist.
   */
  .post('/', zValidator('json', joinWaitlistSchema), async (c) => {
    const { email, source } = c.req.valid('json');
    const normalizedEmail = email.toLowerCase().trim();
    const db = getDb(c.env.DATABASE_URL);

    try {
      await db
        .insert(waitlist)
        .values({
          email: normalizedEmail,
          source: source || 'website',
          createdAt: new Date(),
        })
        .onConflictDoNothing({ target: waitlist.email });

      logger.info('Waitlist submission received', { email: normalizedEmail, source });

      return c.json({
        success: true as const,
        message: "You're on the list! We'll notify you as soon as Gremlin launches.",
      });
    } catch (err: any) {
      logger.error('Failed to record waitlist entry', err);
      return c.json(
        {
          success: false as const,
          error: 'Failed to record waitlist entry. Please try again.',
        },
        500,
      );
    }
  });
