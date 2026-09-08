import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq, and, gte, desc } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth';
import type { AppEnv } from '../types/env';
import { getDb, memoryEpisodes, focusProfiles } from '../lib/db';

/**
 * Memory sync API — mirrors the companion's episode log and focus profile
 * for authenticated users so learning survives reinstalls and follows the
 * human across devices.
 */

const interventionSchema = z.object({
  kind: z.enum(['observe', 'nudge', 'callout', 'reset']),
  level: z.number().int().min(0).max(3),
  remark: z.string().max(200).optional(),
});

const episodeSchema = z.object({
  id: z.string().max(80),
  ts: z.number().int().positive(),
  type: z.enum(['divergence', 'on_task', 'intervention', 'outcome', 'milestone']),
  domain: z.string().max(253).optional(),
  detail: z.string().max(400).default(''),
  goalTitle: z.string().max(200).optional(),
  intervention: interventionSchema.optional(),
  outcome: z
    .object({
      returnedWithinMin: z.number().min(0).max(1440).optional(),
      effective: z.boolean().optional(),
    })
    .optional(),
});

const pushEpisodesSchema = z.object({
  episodes: z.array(episodeSchema).max(200),
});

const focusProfileSchema = z.object({
  focusWindows: z.array(z.object({ hour: z.number().int().min(0).max(23), score: z.number() })).max(24),
  topDistractions: z.array(z.object({ domain: z.string().max(253), count: z.number().int().min(0) })).max(10),
  interventionEffectiveness: z.record(z.string(), z.object({ sent: z.number().int().min(0), effective: z.number().int().min(0) })),
  lessons: z.array(z.string().max(200)).max(8),
  updatedAt: z.number().int().positive(),
});

type EpisodeRow = typeof memoryEpisodes.$inferSelect;

function mapEpisodeRow(row: EpisodeRow) {
  return {
    id: row.id,
    ts: Number(row.ts),
    type: row.type as 'divergence' | 'on_task' | 'intervention' | 'outcome' | 'milestone',
    domain: row.domain ?? undefined,
    detail: row.detail,
    goalTitle: row.goalTitle ?? undefined,
    ...(row.interventionKind
      ? {
          intervention: {
            kind: row.interventionKind as 'observe' | 'nudge' | 'callout' | 'reset',
            level: row.interventionLevel ?? 0,
          },
        }
      : {}),
    ...(row.outcomeEffective != null || row.returnedWithinMin != null
      ? {
          outcome: {
            ...(row.returnedWithinMin != null ? { returnedWithinMin: Number(row.returnedWithinMin) } : {}),
            ...(row.outcomeEffective != null ? { effective: row.outcomeEffective } : {}),
          },
        }
      : {}),
  };
}

export const memoryRoutes = new Hono<AppEnv>()
  .use('*', requireAuth)

  .post('/episodes', zValidator('json', pushEpisodesSchema), async (c) => {
    const user = c.get('user')!;
    const db = getDb(c.env.DATABASE_URL);
    const { episodes } = c.req.valid('json');

    if (episodes.length > 0) {
      await db
        .insert(memoryEpisodes)
        .values(
          episodes.map((ep) => ({
            id: ep.id,
            userId: user.id,
            ts: ep.ts,
            type: ep.type,
            domain: ep.domain ?? null,
            detail: ep.detail,
            goalTitle: ep.goalTitle ?? null,
            interventionKind: ep.intervention?.kind ?? null,
            interventionLevel: ep.intervention?.level ?? null,
            outcomeEffective: ep.outcome?.effective ?? null,
            returnedWithinMin: ep.outcome?.returnedWithinMin ?? null,
          }))
        )
        .onConflictDoNothing({ target: memoryEpisodes.id });
    }

    return c.json({ success: true, stored: episodes.length });
  })

  .get('/episodes', async (c) => {
    const user = c.get('user')!;
    const db = getDb(c.env.DATABASE_URL);
    const since = Number(c.req.query('since') ?? 0);
    const limit = Math.min(200, Math.max(1, Number(c.req.query('limit') ?? 100)));

    const rows = await db
      .select()
      .from(memoryEpisodes)
      .where(
        and(
          eq(memoryEpisodes.userId, user.id),
          gte(memoryEpisodes.ts, since)
        )
      )
      .orderBy(desc(memoryEpisodes.ts))
      .limit(limit);

    return c.json({ success: true, episodes: rows.map(mapEpisodeRow) });
  })

  .get('/profile', async (c) => {
    const user = c.get('user')!;
    const db = getDb(c.env.DATABASE_URL);

    const [row] = await db
      .select({ data: focusProfiles.data })
      .from(focusProfiles)
      .where(eq(focusProfiles.userId, user.id))
      .limit(1);

    if (!row) {
      return c.json({ success: true, profile: null });
    }
    return c.json({ success: true, profile: row.data });
  })

  .put('/profile', zValidator('json', focusProfileSchema), async (c) => {
    const user = c.get('user')!;
    const db = getDb(c.env.DATABASE_URL);
    const profile = c.req.valid('json');

    await db
      .insert(focusProfiles)
      .values({
        userId: user.id,
        data: profile,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: focusProfiles.userId,
        set: {
          data: profile,
          updatedAt: new Date(),
        },
      });

    return c.json({ success: true });
  });
