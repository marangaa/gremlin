import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';
import type { AppEnv } from '../types/env';
import { runAgentEvaluation } from '../lib/agent';
import { getPool, mapSprintRow, type SprintRow } from '../lib/db';

/**
 * Runtime-validated request schemas. These preserve full RPC type inference
 * for `hc<AppType>` clients while rejecting malformed payloads with 400s
 * instead of leaking unstructured 500s.
 */
const breadcrumbSchema = z.object({
  url: z.string().max(2048),
  domain: z.string().max(253),
  title: z.string().max(512),
  headings: z.array(z.string().max(200)).max(10).default([]),
  metaDescription: z.string().max(512).optional(),
  textExcerpt: z.string().max(4000).default(''),
  dwellSeconds: z.number().min(0).max(86400),
  scrollDepthPercent: z.number().min(0).max(100),
  isMediaPlaying: z.boolean(),
  timestamp: z.number().int().positive(),
});

const timelineEntrySchema = breadcrumbSchema.pick({
  domain: true,
  title: true,
  dwellSeconds: true,
  scrollDepthPercent: true,
  isMediaPlaying: true,
  timestamp: true,
});

const decomposedGoalSchema = z.object({
  id: z.string(),
  title: z.string().max(200),
  category: z.string().max(64),
  estimatedMinutes: z.number().optional(),
  isActive: z.boolean(),
  completed: z.boolean(),
  createdAt: z.number(),
  completedAt: z.number().optional(),
});

const smartPageNoteSchema = z.object({
  id: z.string(),
  content: z.string().max(2000),
  url: z.string().max(2048),
  domain: z.string().max(253),
  pageTitle: z.string().max(512),
  snippet: z.string().max(1000).optional(),
  goalId: z.string().optional(),
  goalTitle: z.string().max(200).optional(),
  companionId: z.enum(['goggins', 'waifu', 'sherlock', 'kuro', 'sensei']),
  timestamp: z.number(),
});

const evaluateSchema = z.object({
  sprint: z.object({
    goal: z.string().max(200),
    targetMinutes: z.number().min(1).max(180),
    startedAt: z.number(),
    status: z.enum(['idle', 'active', 'paused', 'completed']),
    isContinuousFlow: z.boolean().optional(),
  }),
  goals: z.array(decomposedGoalSchema).max(20).optional(),
  notes: z.array(smartPageNoteSchema).max(10).optional(),
  companionId: z.enum(['goggins', 'waifu', 'sherlock', 'kuro', 'sensei']),
  currentTab: breadcrumbSchema,
  timeline: z.array(timelineEntrySchema).max(15).default([]),
  elapsedSprintMinutes: z.number().min(0),
  totalDivergenceCountToday: z.number().int().min(0).optional(),
  localTime: z.string().max(64).optional(),
  isContinuousFlow: z.boolean().optional(),
});

const startSprintSchema = z.object({
  goal: z.string().max(100).default('Deep Work Sprint'),
  targetMinutes: z.coerce.number().min(1).max(180).default(25),
  organismId: z.enum(['goggins', 'waifu', 'sherlock', 'kuro', 'sensei']).optional(),
});

/**
 * Focus Sprint Lifecycle, Evaluation, and Telemetry Router.
 * Strictly guarded by Better Auth session middleware.
 *
 * Sprints are persisted in Neon so state survives worker eviction and
 * syncs across devices; the previous per-isolate in-memory Map could not.
 */
export const sprintRoutes = new Hono<AppEnv>()
  .use('*', requireAuth)

  /**
   * Evaluates the rolling browsing context window using server-side AI SDK agent reasoning.
   */
  .post('/evaluate', zValidator('json', evaluateSchema), async (c) => {
    const payload = c.req.valid('json');

    // Sanitize payload: bound excerpt length & array sizes to protect LLM context & token costs
    if (payload.currentTab.textExcerpt) {
      payload.currentTab.textExcerpt = payload.currentTab.textExcerpt.slice(0, 1000);
    }
    if (payload.currentTab.headings) {
      payload.currentTab.headings = payload.currentTab.headings.slice(0, 10);
    }
    payload.timeline = payload.timeline.slice(0, 15);

    const evaluation = await runAgentEvaluation(payload, c.env);

    return c.json({
      success: true as const,
      data: evaluation,
      evaluatedAt: Date.now(),
    });
  })

  /**
   * Retrieves the active focus sprint for the current authenticated user.
   */
  .get('/current', async (c) => {
    const user = c.get('user')!;
    const pool = getPool(c.env.DATABASE_URL);

    const result = await pool.query<SprintRow>(
      `SELECT * FROM sprints
       WHERE "userId" = $1 AND status = 'active'
       ORDER BY "startedAt" DESC
       LIMIT 1`,
      [user.id],
    );

    const sprint = result.rows[0] ? mapSprintRow(result.rows[0]) : null;

    return c.json({
      success: true as const,
      data: sprint,
    });
  })

  /**
   * Starts a new focus sprint session for the authenticated user,
   * superseding any previously active sprint.
   */
  .post('/start', zValidator('json', startSprintSchema), async (c) => {
    const user = c.get('user')!;
    const body = c.req.valid('json');
    const pool = getPool(c.env.DATABASE_URL);

    const goal = (body.goal || 'Deep Work Sprint').slice(0, 100);
    const targetMinutes = Math.min(Math.max(1, body.targetMinutes || 25), 180);
    const organismId = body.organismId || 'goggins';

    await pool.query(
      `UPDATE sprints SET status = 'superseded', "endedAt" = NOW()
       WHERE "userId" = $1 AND status = 'active'`,
      [user.id],
    );

    const inserted = await pool.query<SprintRow>(
      `INSERT INTO sprints ("userId", goal, "targetMinutes", "startedAt", status, organismId)
       VALUES ($1, $2, $3, NOW(), 'active', $4)
       RETURNING *`,
      [user.id, goal, targetMinutes, organismId],
    );

    return c.json(
      {
        success: true as const,
        data: mapSprintRow(inserted.rows[0]!),
      },
      201
    );
  })

  /**
   * Ends or completes the active focus sprint.
   */
  .post('/complete', async (c) => {
    const user = c.get('user')!;
    const pool = getPool(c.env.DATABASE_URL);

    const updated = await pool.query<SprintRow>(
      `UPDATE sprints SET status = 'completed', "endedAt" = NOW()
       WHERE "userId" = $1 AND status = 'active'
       RETURNING *`,
      [user.id],
    );

    const sprint = updated.rows[0] ? mapSprintRow(updated.rows[0]) : null;

    return c.json({
      success: true as const,
      data: sprint,
    });
  });
