import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';
import type { AppEnv } from '../types/env';
import { getPool } from '../lib/db';

/**
 * Full account sync — goals, smart notes, and diaries mirror server-side for
 * signed-in humans so "account = everything backed up", independent of
 * whether judgments run BYOK or through the cloud proxy.
 */

const goalSchema = z.object({
  id: z.string().max(80),
  title: z.string().max(200),
  category: z.string().max(64).default('general'),
  estimatedMinutes: z.number().int().min(0).optional(),
  isActive: z.boolean(),
  completed: z.boolean(),
  createdAt: z.number().int().positive(),
  completedAt: z.number().int().positive().nullable().optional(),
});

const noteSchema = z.object({
  id: z.string().max(80),
  content: z.string().max(2000),
  url: z.string().max(2048).default(''),
  domain: z.string().max(253).default(''),
  pageTitle: z.string().max(512).default(''),
  snippet: z.string().max(1000).nullable().optional(),
  goalId: z.string().max(80).nullable().optional(),
  goalTitle: z.string().max(200).nullable().optional(),
  companionId: z.enum(['Sarge', 'waifu', 'sherlock', 'kuro', 'sensei', 'byte', 'pixel', 'ufo']).default('Sarge'),
  timestamp: z.number().int().positive(),
});

export const syncRoutes = new Hono<AppEnv>()
  .use('*', requireAuth)

  .post('/goals', zValidator('json', z.object({ goals: z.array(goalSchema).max(300) })), async (c) => {
    const user = c.get('user')!;
    const pool = getPool(c.env.DATABASE_URL);
    const { goals } = c.req.valid('json');
    for (const g of goals) {
      await pool.query(
        `INSERT INTO "sync_goals"
           ("userId","id","title","category","estimatedMinutes","isActive","completed","createdAt","completedAt")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         ON CONFLICT ("userId","id") DO UPDATE SET
           "title"=$3, "category"=$4, "estimatedMinutes"=$5, "isActive"=$6,
           "completed"=$7, "completedAt"=$9`,
        [user.id, g.id, g.title, g.category, g.estimatedMinutes ?? null, g.isActive, g.completed, g.createdAt, g.completedAt ?? null],
      );
    }
    return c.json({ success: true, stored: goals.length });
  })

  .post('/notes', zValidator('json', z.object({ notes: z.array(noteSchema).max(200) })), async (c) => {
    const user = c.get('user')!;
    const pool = getPool(c.env.DATABASE_URL);
    const { notes } = c.req.valid('json');
    for (const n of notes) {
      await pool.query(
        `INSERT INTO "sync_notes"
           ("userId","id","content","url","domain","pageTitle","snippet","goalId","goalTitle","companionId","timestamp")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
         ON CONFLICT ("userId","id") DO NOTHING`,
        [user.id, n.id, n.content, n.url, n.domain, n.pageTitle, n.snippet ?? null, n.goalId ?? null, n.goalTitle ?? null, n.companionId, n.timestamp],
      );
    }
    return c.json({ success: true, stored: notes.length });
  })

  .put('/diary', zValidator('json', z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), data: z.record(z.string(), z.unknown()) })), async (c) => {
    const user = c.get('user')!;
    const pool = getPool(c.env.DATABASE_URL);
    const { date, data } = c.req.valid('json');
    await pool.query(
      `INSERT INTO "sync_diaries" ("userId","date","data","updatedAt")
       VALUES ($1,$2,$3,NOW())
       ON CONFLICT ("userId","date") DO UPDATE SET "data"=$3, "updatedAt"=NOW()`,
      [user.id, date, JSON.stringify(data)],
    );
    return c.json({ success: true });
  })

  .get('/all', async (c) => {
    const user = c.get('user')!;
    const pool = getPool(c.env.DATABASE_URL);

    const goalRows = await pool.query(
      `SELECT * FROM "sync_goals" WHERE "userId"=$1`,
      [user.id],
    );
    const noteRows = await pool.query(
      `SELECT * FROM "sync_notes" WHERE "userId"=$1 ORDER BY "timestamp" DESC LIMIT 200`,
      [user.id],
    );
    const diaryRows = await pool.query(
      `SELECT "date","data" FROM "sync_diaries" WHERE "userId"=$1 ORDER BY "date" DESC LIMIT 30`,
      [user.id],
    );

    return c.json({
      success: true,
      goals: goalRows.rows.map((r: Record<string, unknown>) => ({
        id: r.id,
        title: r.title,
        category: r.category,
        estimatedMinutes: r.estimatedMinutes ?? undefined,
        isActive: r.isActive,
        completed: r.completed,
        createdAt: Number(r.createdAt),
        completedAt: r.completedAt != null ? Number(r.completedAt) : undefined,
      })),
      notes: noteRows.rows.map((r: Record<string, unknown>) => ({
        id: r.id,
        content: r.content,
        url: r.url,
        domain: r.domain,
        pageTitle: r.pageTitle,
        snippet: r.snippet ?? undefined,
        goalId: r.goalId ?? undefined,
        goalTitle: r.goalTitle ?? undefined,
        companionId: r.companionId,
        timestamp: Number(r.timestamp),
      })),
      diaries: diaryRows.rows.map((r: Record<string, unknown>) => ({
        ...((r.data as object) ?? {}),
        date: r.date,
      })),
    });
  });
