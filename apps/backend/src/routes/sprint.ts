import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq, and, desc } from 'drizzle-orm';
import { requireAuth, requirePro } from '../middleware/auth';
import type { AppEnv } from '../types/env';
import { runAgentEvaluation } from '../lib/agent';
import { getDb, sprints, mapSprintRow } from '../lib/db';

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
  companionId: z.enum(['Sarge', 'waifu', 'sherlock', 'kuro', 'sensei', 'byte', 'pixel', 'ufo']),
  timestamp: z.number(),
});

import { getAuth } from '../lib/auth';

const evaluateSchema = z.object({
  sprint: z.object({
    goal: z.string().max(200),
    startedAt: z.number(),
    status: z.enum(['idle', 'active', 'paused', 'completed']),
    isContinuousFlow: z.boolean().optional(),
  }),
  goals: z.array(decomposedGoalSchema).max(20).optional(),
  notes: z.array(smartPageNoteSchema).max(10).optional(),
  companionId: z.enum(['Sarge', 'waifu', 'sherlock', 'kuro', 'sensei', 'byte', 'pixel', 'ufo']),
  currentTab: breadcrumbSchema,
  timeline: z.array(timelineEntrySchema).max(15).default([]),
  elapsedSprintMinutes: z.number().min(0),
  totalDivergenceCountToday: z.number().int().min(0).optional(),
  localTime: z.string().max(64).optional(),
  isContinuousFlow: z.boolean().optional(),
});

const startSprintSchema = z.object({
  goal: z.string().max(100).default('Deep Work Sprint'),
  targetMinutes: z.coerce.number().optional().default(0),
  organismId: z.enum(['Sarge', 'waifu', 'sherlock', 'kuro', 'sensei', 'byte', 'pixel', 'ufo']).optional(),
});

/**
 * Focus Sprint Lifecycle, Evaluation, and Telemetry Router.
 *
 * Evaluation route supports:
 * 1. Local Development (localhost) - zero-gate instant dev evaluations via server dev keys.
 * 2. BYOK (Free Tier) - evaluates via user-provided API key passed in headers.
 * 3. Gremlin Pro ($5/mo) - evaluates via server's hosted Gemini pool.
 */
export const sprintRoutes = new Hono<AppEnv>()
  /**
   * Evaluates the rolling browsing context window using server-side AI SDK agent reasoning.
   */
  .post('/evaluate', zValidator('json', evaluateSchema), async (c) => {
    // 1. Check for client-supplied BYOK headers
    const byokKey = c.req.header('x-byok-key')?.trim();
    const byokProvider = c.req.header('x-byok-provider')?.trim();
    const byokModel = c.req.header('x-byok-model')?.trim();
    const byokEndpoint = c.req.header('x-byok-endpoint')?.trim();

    const isByok = Boolean(byokKey) || byokProvider === 'ollama';

    // Strict gate: Must either supply client BYOK credentials or have an authenticated Pro subscription.
    // Zero dev bypass or server-key fallback.
    let isPro = false;
    if (!isByok) {
      try {
        const auth = getAuth(c.env);
        const session = await auth.api.getSession({
          headers: c.req.raw.headers,
        });
        if (session?.user && (session.user as any).plan === 'pro') {
          isPro = true;
        }
      } catch {
        isPro = false;
      }

      if (!isPro) {
        throw new HTTPException(403, {
          message: 'Add your API key (BYOK) in Settings or upgrade to Gremlin Pro ($5/mo) for cloud AI.',
        });
      }
    }

    const payload = c.req.valid('json');

    // Sanitize payload: bound excerpt length & array sizes to protect LLM context & token costs
    if (payload.currentTab.textExcerpt) {
      payload.currentTab.textExcerpt = payload.currentTab.textExcerpt.slice(0, 1000);
    }
    if (payload.currentTab.headings) {
      payload.currentTab.headings = payload.currentTab.headings.slice(0, 10);
    }
    payload.timeline = payload.timeline.slice(0, 15);

    const evaluation = await runAgentEvaluation(
      payload as any,
      c.env,
      isByok
        ? {
            provider: byokProvider,
            apiKey: byokKey,
            model: byokModel,
            endpoint: byokEndpoint,
          }
        : undefined,
    );

    return c.json({
      success: true as const,
      data: evaluation,
      evaluatedAt: Date.now(),
    });
  })

  .use('/current', requireAuth)
  .use('/start', requireAuth)
  .use('/complete', requireAuth)

  /**
   * Retrieves the active focus sprint for the current authenticated user.
   */
  .get('/current', async (c) => {
    const user = c.get('user')!;
    const db = getDb(c.env.DATABASE_URL);

    const result = await db
      .select()
      .from(sprints)
      .where(and(eq(sprints.userId, user.id), eq(sprints.status, 'active')))
      .orderBy(desc(sprints.startedAt))
      .limit(1);

    const sprint = result[0] ? mapSprintRow(result[0] as any) : null;

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
    const db = getDb(c.env.DATABASE_URL);

    const goal = (body.goal || 'Deep Work Sprint').slice(0, 100);
    const targetMinutes = Math.min(Math.max(1, body.targetMinutes || 25), 180);
    const organismId = body.organismId || 'Sarge';

    await db
      .update(sprints)
      .set({ status: 'superseded', endedAt: new Date() })
      .where(and(eq(sprints.userId, user.id), eq(sprints.status, 'active')));

    const inserted = await db
      .insert(sprints)
      .values({
        userId: user.id,
        goal,
        targetMinutes,
        startedAt: new Date(),
        status: 'active',
        organismId,
      })
      .returning();

    return c.json(
      {
        success: true as const,
        data: mapSprintRow(inserted[0] as any),
      },
      201,
    );
  })

  /**
   * Ends or completes the active focus sprint.
   */
  .post('/complete', async (c) => {
    const user = c.get('user')!;
    const db = getDb(c.env.DATABASE_URL);

    const updated = await db
      .update(sprints)
      .set({ status: 'completed', endedAt: new Date() })
      .where(and(eq(sprints.userId, user.id), eq(sprints.status, 'active')))
      .returning();

    const sprint = updated[0] ? mapSprintRow(updated[0] as any) : null;

    return c.json({
      success: true as const,
      data: sprint,
    });
  });
