import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq, desc } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth';
import type { AppEnv } from '../types/env';
import { getDb, syncGoals, syncNotes, syncDiaries } from '../lib/db';

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
    const db = getDb(c.env.DATABASE_URL);
    const { goals } = c.req.valid('json');

    for (const g of goals) {
      await db
        .insert(syncGoals)
        .values({
          userId: user.id,
          id: g.id,
          title: g.title,
          category: g.category,
          estimatedMinutes: g.estimatedMinutes ?? null,
          isActive: g.isActive,
          completed: g.completed,
          createdAt: g.createdAt,
          completedAt: g.completedAt ?? null,
        })
        .onConflictDoUpdate({
          target: [syncGoals.userId, syncGoals.id],
          set: {
            title: g.title,
            category: g.category,
            estimatedMinutes: g.estimatedMinutes ?? null,
            isActive: g.isActive,
            completed: g.completed,
            completedAt: g.completedAt ?? null,
          },
        });
    }
    return c.json({ success: true, stored: goals.length });
  })

  .post('/notes', zValidator('json', z.object({ notes: z.array(noteSchema).max(200) })), async (c) => {
    const user = c.get('user')!;
    const db = getDb(c.env.DATABASE_URL);
    const { notes } = c.req.valid('json');

    if (notes.length > 0) {
      await db
        .insert(syncNotes)
        .values(
          notes.map((n) => ({
            userId: user.id,
            id: n.id,
            content: n.content,
            url: n.url,
            domain: n.domain,
            pageTitle: n.pageTitle,
            snippet: n.snippet ?? null,
            goalId: n.goalId ?? null,
            goalTitle: n.goalTitle ?? null,
            companionId: n.companionId,
            timestamp: n.timestamp,
          }))
        )
        .onConflictDoNothing({ target: [syncNotes.userId, syncNotes.id] });
    }
    return c.json({ success: true, stored: notes.length });
  })

  .put('/diary', zValidator('json', z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), data: z.record(z.string(), z.unknown()) })), async (c) => {
    const user = c.get('user')!;
    const db = getDb(c.env.DATABASE_URL);
    const { date, data } = c.req.valid('json');

    await db
      .insert(syncDiaries)
      .values({
        userId: user.id,
        date,
        data,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [syncDiaries.userId, syncDiaries.date],
        set: {
          data,
          updatedAt: new Date(),
        },
      });

    return c.json({ success: true });
  })

  .get('/all', async (c) => {
    const user = c.get('user')!;
    const db = getDb(c.env.DATABASE_URL);

    const [goalRows, noteRows, diaryRows] = await Promise.all([
      db.select().from(syncGoals).where(eq(syncGoals.userId, user.id)),
      db.select().from(syncNotes).where(eq(syncNotes.userId, user.id)).orderBy(desc(syncNotes.timestamp)).limit(200),
      db.select({ date: syncDiaries.date, data: syncDiaries.data }).from(syncDiaries).where(eq(syncDiaries.userId, user.id)).orderBy(desc(syncDiaries.date)).limit(30),
    ]);

    return c.json({
      success: true,
      goals: goalRows.map((r) => ({
        id: r.id,
        title: r.title,
        category: r.category,
        estimatedMinutes: r.estimatedMinutes ?? undefined,
        isActive: r.isActive,
        completed: r.completed,
        createdAt: Number(r.createdAt),
        completedAt: r.completedAt != null ? Number(r.completedAt) : undefined,
      })),
      notes: noteRows.map((r) => ({
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
      diaries: diaryRows.map((r) => ({
        ...((r.data as object) ?? {}),
        date: r.date,
      })),
    });
  });
