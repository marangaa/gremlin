import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';
import type { AppEnv } from '../types/env';
import { getPool } from '../lib/db';

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

interface EpisodeRow {
  id: string;
  ts: string | number;
  type: string;
  domain: string | null;
  detail: string;
  goalTitle: string | null;
  interventionKind: string | null;
  interventionLevel: number | null;
  outcomeEffective: boolean | null;
  returnedWithinMin: number | null;
}

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
    const pool = getPool(c.env.DATABASE_URL);
    const { episodes } = c.req.valid('json');

    let stored = 0;
    for (const ep of episodes) {
      await pool.query(
        `INSERT INTO "memory_episodes"
           ("id", "userId", "ts", "type", "domain", "detail", "goalTitle", "interventionKind", "interventionLevel", "outcomeEffective", "returnedWithinMin")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT ("id") DO NOTHING`,
        [
          ep.id,
          user.id,
          ep.ts,
          ep.type,
          ep.domain ?? null,
          ep.detail,
          ep.goalTitle ?? null,
          ep.intervention?.kind ?? null,
          ep.intervention?.level ?? null,
          ep.outcome?.effective ?? null,
          ep.outcome?.returnedWithinMin ?? null,
        ],
      );
      stored += 1;
    }

    return c.json({ success: true, stored });
  })

  .get('/episodes', async (c) => {
    const user = c.get('user')!;
    const pool = getPool(c.env.DATABASE_URL);
    const since = Number(c.req.query('since') ?? 0);
    const limit = Math.min(200, Math.max(1, Number(c.req.query('limit') ?? 100)));

    const { rows } = await pool.query<EpisodeRow>(
      `SELECT * FROM "memory_episodes"
        WHERE "userId" = $1 AND "ts" >= $2
        ORDER BY "ts" DESC
        LIMIT $3`,
      [user.id, since, limit],
    );

    return c.json({ success: true, episodes: rows.map(mapEpisodeRow) });
  })

  .get('/profile', async (c) => {
    const user = c.get('user')!;
    const pool = getPool(c.env.DATABASE_URL);

    const { rows } = await pool.query<{ data: unknown }>(
      `SELECT "data" FROM "focus_profiles" WHERE "userId" = $1`,
      [user.id],
    );

    if (rows.length === 0) {
      return c.json({ success: true, profile: null });
    }
    return c.json({ success: true, profile: rows[0]!.data });
  })

  .put('/profile', zValidator('json', focusProfileSchema), async (c) => {
    const user = c.get('user')!;
    const pool = getPool(c.env.DATABASE_URL);
    const profile = c.req.valid('json');

    await pool.query(
      `INSERT INTO "focus_profiles" ("userId", "data", "updatedAt")
       VALUES ($1, $2, NOW())
       ON CONFLICT ("userId") DO UPDATE SET "data" = $2, "updatedAt" = NOW()`,
      [user.id, JSON.stringify(profile)],
    );

    return c.json({ success: true });
  });

