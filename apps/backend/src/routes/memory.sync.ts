import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq, desc, and } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth';
import type { AppEnv } from '../types/env';
import { getDb, syncGoals, syncNotes, syncDiaries, syncDevices } from '../lib/db';
/**
 * Full account sync — goals, smart notes, and diaries mirror server-side for
 * signed-in humans so "account = everything backed up", independent of
 * whether judgments run BYOK or through the cloud proxy.
 *
 * Device bookkeeping: every push may carry `deviceId`/`deviceName`; the
 * registry is upserted so cross-device state stays attributable.
 *
 * Diary merge (double-write guard): PUT /diary never blind-overwrites the
 * stored day. Sessions are unioned by id (newer `endedAt` wins), counters
 * take the max of both versions, and focus totals/top-domains are
 * recomputed from the merged sessions — so two browsers writing the same
 * day converge instead of erasing each other's sessions.
 */

/** Optional device identity on any sync write. */
const deviceFields = { deviceId: z.string().max(80).optional(), deviceName: z.string().max(120).optional() };
type DeviceFields = { deviceId?: string; deviceName?: string };

/** Shape of the diary JSON document pushed by the extension. */

/** Shape of the diary JSON document pushed by the extension. */
interface DiarySession {
  id?: string;
  startedAt?: number;
  endedAt?: number;
  durationMinutes?: number;
  domains?: string[];
}

interface DailyDiaryShape {
  date?: string;
  totalFocusMinutes?: number;
  totalDetours?: number;
  completedGoalsCount?: number;
  contextSwitches?: number;
  sessions?: DiarySession[];
  notes?: unknown[];
  topDomains?: Array<{ domain: string; minutes: number }>;
  reflection?: unknown;
}

/** Best-effort device-registry upsert — never blocks the sync write. */
async function upsertDevice(db: ReturnType<typeof getDb>, userId: string, device: DeviceFields): Promise<void> {
  if (!device.deviceId) return;
  try {
    await db
      .insert(syncDevices)
      .values({
        userId,
        deviceId: device.deviceId,
        name: device.deviceName ?? 'Unknown device',
        lastSeenAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [syncDevices.userId, syncDevices.deviceId],
        set: {
          ...(device.deviceName ? { name: device.deviceName } : {}),
          lastSeenAt: new Date(),
        },
      });
  } catch {
    /** Registry is bookkeeping; the sync write itself must still succeed. */
  }
}

/** Recomputes focus totals + top domains from the merged session list. */
function recomputeDiaryAggregates(merged: {
  date?: string;
  sessions?: NonNullable<DailyDiaryShape['sessions']>;
  totalDetours?: number;
  completedGoalsCount?: number;
  contextSwitches?: number;
  notes?: unknown[];
  reflection?: unknown;
}): Record<string, unknown> {
  const sessions = merged.sessions ?? [];
  let totalMinutes = 0;
  const domainMinutes = new Map<string, number>();
  for (const s of sessions) {
    const mins = Math.max(0, Math.round(s.durationMinutes ?? 0));
    totalMinutes += mins;
    const domains = s.domains ?? [];
    const per = mins / (domains.length || 1);
    for (const d of domains) {
      if (!d) continue;
      domainMinutes.set(d, (domainMinutes.get(d) ?? 0) + per);
    }
  }
  return {
    ...merged,
    totalFocusMinutes: totalMinutes,
    topDomains: [...domainMinutes.entries()]
      .map(([domain, minutes]) => ({ domain, minutes: Math.round(minutes) }))
      .sort((a, b) => b.minutes - a.minutes)
      .slice(0, 5),
  };
}

/**
 * Server-side day merge (the double-write killer): sessions are unioned by id
 * with newer `endedAt` winning per session, counters take the max of both
 * versions, and focus totals/top-domains are recomputed from the union.
 */
function mergeDiaryDay(incoming: Record<string, unknown>, stored: Record<string, unknown>): Record<string, unknown> {
  const a = incoming as DailyDiaryShape;
  const b = stored as DailyDiaryShape;

  if (!Array.isArray(a.sessions)) return incoming;
  if (!Array.isArray(b.sessions)) return incoming;

  const bySessionId = new Map<string, DiarySession>();
  for (const s of b.sessions) {
    bySessionId.set(s.id ?? `stored_${bySessionId.size}`, s);
  }
  for (const s of a.sessions) {
    const key = s.id;
    if (!key) continue; // sessionless entries can't be merged — skip
    const prev = bySessionId.get(key);
    if (!prev || (s.endedAt ?? 0) >= (prev.endedAt ?? 0)) {
      bySessionId.set(key, s);
    }
  }
  const sessions = [...bySessionId.values()].sort((x, y) => (y.startedAt ?? 0) - (x.startedAt ?? 0));

  const pickMax = (x?: number, y?: number): number | undefined =>
    x == null && y == null ? undefined : Math.max(x ?? 0, y ?? 0);

  return recomputeDiaryAggregates({
    date: a.date ?? b.date,
    sessions,
    totalDetours: pickMax(a.totalDetours, b.totalDetours),
    completedGoalsCount: pickMax(a.completedGoalsCount, b.completedGoalsCount),
    contextSwitches: pickMax(a.contextSwitches, b.contextSwitches),
    notes: a.notes && a.notes.length > 0 ? a.notes : b.notes,
    reflection: a.reflection ?? b.reflection,
  });
}

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

  .post('/goals', zValidator('json', z.object({ ...deviceFields, goals: z.array(goalSchema).max(300) })), async (c) => {
    const user = c.get('user')!;
    const db = getDb(c.env.DATABASE_URL);
    const { goals, ...device } = c.req.valid('json');
    await upsertDevice(db, user.id, device);

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

  .post('/notes', zValidator('json', z.object({ ...deviceFields, notes: z.array(noteSchema).max(200) })), async (c) => {
    const user = c.get('user')!;
    const db = getDb(c.env.DATABASE_URL);
    const { notes, ...device } = c.req.valid('json');
    await upsertDevice(db, user.id, device);

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

  .put('/diary', zValidator('json', z.object({ ...deviceFields, date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), data: z.record(z.string(), z.unknown()) })), async (c) => {
    const user = c.get('user')!;
    const db = getDb(c.env.DATABASE_URL);
    const { date, data, ...device } = c.req.valid('json');
    await upsertDevice(db, user.id, device);

    /**
     * Double-write guard: fetch the stored day first and merge sessions by id
     * before upserting. Two browsers pushing the same day converge (union of
     * sessions, max counters, recomputed aggregates) instead of the last
     * push erasing the other device's focus sessions.
     */
    const [stored] = await db
      .select({ data: syncDiaries.data })
      .from(syncDiaries)
      .where(and(eq(syncDiaries.userId, user.id), eq(syncDiaries.date, date)))
      .limit(1);

    const merged = mergeDiaryDay(data, (stored?.data as Record<string, unknown>) ?? {});

    await db
      .insert(syncDiaries)
      .values({
        userId: user.id,
        date,
        data: merged,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [syncDiaries.userId, syncDiaries.date],
        set: {
          data: merged,
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
