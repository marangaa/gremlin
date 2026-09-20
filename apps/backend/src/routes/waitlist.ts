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

const ipRateLimits = new Map<string, { count: number; resetAt: number }>();
const MAX_REQUESTS_PER_WINDOW = 5;
const WINDOW_MS = 10 * 60 * 1000; // 10 minutes

export const waitlistRoutes = new Hono<AppEnv>()
  /**
   * Submit email to join the waitlist.
   */
  .post(
    '/',
    zValidator('json', joinWaitlistSchema, (result, c) => {
      if (!result.success) {
        return c.json(
          {
            success: false as const,
            error: result.error.issues[0]?.message || 'Please enter a valid email address',
          },
          400,
        );
      }
    }),
    async (c) => {
      const ip = c.req.header('cf-connecting-ip') || c.req.header('x-real-ip') || 'unknown';
      const now = Date.now();
      const record = ipRateLimits.get(ip);

      if (record && now < record.resetAt) {
        if (record.count >= MAX_REQUESTS_PER_WINDOW) {
          return c.json(
            {
              success: false as const,
              error: 'Too many submissions. Please try again in a few minutes.',
            },
            429,
          );
        }
        record.count += 1;
      } else {
        if (ipRateLimits.size > 1000) {
          for (const [k, v] of ipRateLimits.entries()) {
            if (now >= v.resetAt) ipRateLimits.delete(k);
          }
        }
        ipRateLimits.set(ip, { count: 1, resetAt: now + WINDOW_MS });
      }

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
