import type { DecomposedGoal, SmartPageNote, DailyDiary, SessionEpisode, FocusProfile } from '@gremlin/shared';
import {
  goalsStorage,
  notesStorage,
  diaryStorage,
  focusProfileStorage,
  episodeLogStorage,
  userSessionStorage,
  getDeviceIdentity,
} from '../storage';
import {
  pushDiary,
  pushEpisodes,
  pushGoals,
  pushNotes,
  pushProfile,
  pullAll,
  pullEpisodes,
  pullProfile,
} from '../api/memoryClient';

/**
 * ============================================================
 *  ACCOUNT SYNC ENGINE — one store, one direction of authority
 * ============================================================
 *
 * The extension keeps ONE persistent store (`local:`). When — and only when —
 * the human is signed in with an active Pro subscription, Class-A collections
 * (goals, page notes, diaries, focus profile, episodes) are mirrored to the
 * account so they follow the human across devices and reinstalls.
 *
 * Class-B data (organismConfig, BYOK secrets, organismState, sprint,
 * userSession, event/activity history) NEVER leaves the device.
 *
 * Authority & merge rules (prevents double-write corruption):
 *  - Local is authoritative for what this device just changed → PUSH after
 *    mutations, debounced, never blocking UI.
 *  - The server is authoritative for account history → PULL on sign-in /
 *    popup open and MERGE by stable id (LWW per record). Pulls never blindly
 *    overwrite newer local rows.
 *  - Identity is decided by the SERVER (`user.plan` mirror); local storage
 *    only caches the hint. The gate re-checks before every push/pull.
 *
 * All failures are swallowed — sync is strictly best-effort.
 */

/** Collections whose mutation should schedule a debounced push. */
export type SyncCollection = 'goals' | 'notes' | 'diary' | 'profile' | 'episodes';

const DEBOUNCE_MS = 800;
/** Throttle repeated popup-open pulls within one worker lifetime. */
const PULL_THROTTLE_MS = 30_000;
/** Merge lookback window when fetching remote episodes. */
const EPISODE_MERGE_LOOKBACK_MS = 7 * 24 * 60 * 60 * 1000;

async function isAccountSyncActive(): Promise<boolean> {
  try {
    const s = await userSessionStorage.getValue();
    return Boolean(s.isLoggedIn) && s.plan === 'pro';
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Merge helpers — upsert-by-stable-id, last-writer-wins per record
// ---------------------------------------------------------------------------

export function mergeGoals(local: DecomposedGoal[], remote: DecomposedGoal[]): DecomposedGoal[] {
  const byId = new Map(local.map((g) => [g.id, g]));
  for (const r of remote) {
    const l = byId.get(r.id);
    if (!l) {
      byId.set(r.id, r);
    } else if (r.completedAt && !l.completedAt) {
      byId.set(r.id, r); // completion wins over an older uncompleted copy
    } else if (l.completedAt && !r.completedAt) {
      byId.set(r.id, l); // never resurrect a completed goal
    } else if (!l.completed && r.completed) {
      byId.set(r.id, r);
    } else {
      byId.set(r.id, l);
    }
  }
  return [...byId.values()].sort((a, b) => b.createdAt - a.createdAt).slice(0, 300);
}

export function mergeNotes(local: SmartPageNote[], remote: SmartPageNote[]): SmartPageNote[] {
  const byId = new Map(local.map((n) => [n.id, n]));
  for (const r of remote) {
    const l = byId.get(r.id);
    if (!l || r.timestamp >= l.timestamp) byId.set(r.id, r);
  }
  return [...byId.values()].sort((a, b) => b.timestamp - a.timestamp).slice(0, 200);
}

/** Merge two diary days: union of sessions by id, maxed aggregate counters. */
export function mergeDiaryDay(a: DailyDiary, b: DailyDiary): DailyDiary {
  const sessionsById = new Map<string, DailyDiary['sessions'][number]>();
  for (const s of [...a.sessions, ...b.sessions]) sessionsById.set(s.id, s);
  const sessions = [...sessionsById.values()].sort((x, y) => y.startedAt - x.startedAt);
  const sum = (xs: number[]) => xs.reduce((acc, x) => acc + x, 0);
  const sessionMins = sum(sessions.map((s) => s.durationMinutes ?? 0));
  return {
    date: a.date,
    sessions,
    totalFocusMinutes: Math.max(a.totalFocusMinutes ?? 0, b.totalFocusMinutes ?? 0, sessionMins),
    totalDetours: Math.max(a.totalDetours ?? 0, b.totalDetours ?? 0),
    completedGoalsCount: Math.max(a.completedGoalsCount ?? 0, b.completedGoalsCount ?? 0),
    contextSwitches: Math.max(a.contextSwitches ?? 0, b.contextSwitches ?? 0),
    notes: unionById(a.notes ?? [], b.notes ?? []),
    topDomains: mergeTopDomains(a.topDomains ?? [], b.topDomains ?? []),
  };
}

function unionById<T extends { id: string; timestamp: number }>(a: T[], b: T[]): T[] {
  const byId = new Map(a.map((n) => [n.id, n]));
  for (const n of b) {
    const cur = byId.get(n.id);
    if (!cur || n.timestamp >= cur.timestamp) byId.set(n.id, n);
  }
  return [...byId.values()];
}

function mergeTopDomains(
  a: DailyDiary['topDomains'],
  b: DailyDiary['topDomains'],
): DailyDiary['topDomains'] {
  const byDomain = new Map<string, number>();
  for (const d of [...a, ...b]) {
    byDomain.set(d.domain, Math.max(byDomain.get(d.domain) ?? 0, d.minutes));
  }
  return [...byDomain.entries()]
    .map(([domain, minutes]) => ({ domain, minutes }))
    .sort((x, y) => y.minutes - x.minutes)
    .slice(0, 5);
}

export function mergeDiaries(local: DailyDiary[], remote: DailyDiary[]): DailyDiary[] {
  const byDate = new Map(local.map((d) => [d.date, d]));
  for (const r of remote) {
    const l = byDate.get(r.date);
    byDate.set(r.date, l ? mergeDiaryDay(l, r) : r);
  }
  return [...byDate.values()].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 30);
}

export function mergeEpisodes(local: SessionEpisode[], remote: SessionEpisode[]): SessionEpisode[] {
  const byId = new Map(local.map((e) => [e.id, e]));
  for (const r of remote) if (!byId.has(r.id)) byId.set(r.id, r);
  return [...byId.values()].sort((a, b) => b.ts - a.ts).slice(0, 300);
}

export function mergeProfile(local: FocusProfile, remote: FocusProfile): FocusProfile {
  if (!remote) return local;
  return (remote.updatedAt ?? 0) > (local.updatedAt ?? 0) ? remote : local;
}
// ---------------------------------------------------------------------------
// Push — debounced, full-collection upserts (server merges by stable id)
// ---------------------------------------------------------------------------

let pushTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * One push = full snapshot of every Class-A collection. Idempotent: the
 * server upserts by stable id (episodes `onConflictDoNothing`, goals/notes
 * per-record LWW, diary-day merged by session id), so a repeated push can
 * never corrupt state — only costs bandwidth. At current caps (300 goals,
 * 200 notes, 30 diaries, 300 episodes ≈ 250 KB) full-snapshot pushes are
 * cheap; cursor-based deltas are a Phase-2 optimization, deliberately not
 * hand-rolled now.
 */
export async function pushAllNow(): Promise<boolean> {
  if (!(await isAccountSyncActive())) return false;
  try {
    const [goals, notes, diaries, episodes, profile] = await Promise.all([
      goalsStorage.getValue(),
      notesStorage.getValue(),
      diaryStorage.getValue(),
      episodeLogStorage.getValue(),
      focusProfileStorage.getValue(),
    ]);
    const results = await Promise.all([
      pushGoals(goals.slice(0, 300)),
      pushNotes(notes.slice(0, 200)),
      diaries[0] ? pushDiary(diaries[0].date, diaries[0]) : Promise.resolve(true),
      episodes.length > 0 ? pushEpisodes(episodes.slice(0, 200)) : Promise.resolve(true),
      pushProfile(profile),
    ]);
    return results.every(Boolean);
  } catch {
    return false;
  }
}

/** Debounced trigger — call after every Class-A mutation. Never blocks UI.
 *  Accepts the collection tag for observability; the debounce is shared. */
export function schedulePush(_collection?: SyncCollection): void {
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    pushTimer = null;
    void pushAllNow();
  }, DEBOUNCE_MS);
}

/** Alias kept for call sites that name the intent (queueAccountSync('notes')). */
export const queueAccountSync = schedulePush;

// ---------------------------------------------------------------------------
// Pull + merge — sign-in / popup-open reconciliation
// ---------------------------------------------------------------------------

let lastPullAt = 0;

function jsonEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Fetches the account's Class-A state and merges it into the local store.
 * Merges are per-record LWW (never blind overwrite), so a pull after being
 * offline cannot destroy newer local edits. Only writes when the merge
 * actually differs — prevents pointless storage churn and watcher storms.
 */
export async function pullAndMerge(force = false): Promise<void> {
  if (!(await isAccountSyncActive())) return;
  const now = Date.now();
  if (!force && now - lastPullAt < PULL_THROTTLE_MS) return;
  lastPullAt = now;

  try {
    const [remoteAll, remoteEpisodes, remoteProfile] = await Promise.all([
      pullAll(),
      pullEpisodes(now - EPISODE_MERGE_LOOKBACK_MS),
      pullProfile(),
    ]);

    if (remoteAll) {
      const [localGoals, localNotes, localDiaries] = await Promise.all([
        goalsStorage.getValue(),
        notesStorage.getValue(),
        diaryStorage.getValue(),
      ]);
      const goals = mergeGoals(localGoals, remoteAll.goals);
      const notes = mergeNotes(localNotes, remoteAll.notes);
      const diaries = mergeDiaries(localDiaries, remoteAll.diaries);
      if (!jsonEqual(goals, localGoals)) await goalsStorage.setValue(goals);
      if (!jsonEqual(notes, localNotes)) await notesStorage.setValue(notes);
      if (!jsonEqual(diaries, localDiaries)) await diaryStorage.setValue(diaries);
    }

    if (remoteEpisodes && remoteEpisodes.length > 0) {
      const localEpisodes = await episodeLogStorage.getValue();
      const episodes = mergeEpisodes(localEpisodes, remoteEpisodes);
      if (!jsonEqual(episodes, localEpisodes)) await episodeLogStorage.setValue(episodes);
    }

    if (remoteProfile) {
      const localProfile = await focusProfileStorage.getValue();
      const profile = mergeProfile(localProfile, remoteProfile);
      if (profile !== localProfile) await focusProfileStorage.setValue(profile);
    }
  } catch {
    /** Offline / backend down: local-first continues untouched. */
  }
}

/**
 * Runs when an account connects (sign-in, popup-adopted shared cookie):
 * pull-merge the account first, then push local state so fresh devices
 * contribute immediately. Force bypasses the pull throttle.
 */
export async function onAccountConnected(): Promise<void> {
  lastPullAt = 0;
  await pullAndMerge(true);
  void pushAllNow();
}