import { api } from './client';
import type { SessionEpisode, FocusProfile } from '@gremlin/shared';
import type { DecomposedGoal, SmartPageNote, DailyDiary } from '@gremlin/shared';

/**
 * Cloud memory sync — mirrors episodes, profile, goals, notes, and diaries to
 * Gremlin Cloud for signed-in users. Every call is best-effort: failures
 * resolve to `null` so local-first behavior is never disrupted by network.
 */

export async function pushEpisodes(episodes: SessionEpisode[]): Promise<boolean> {
  try {
    const res = await api.api.memory.episodes.$post({ json: { episodes } });
    return res.ok;
  } catch {
    return false;
  }
}

export async function pullEpisodes(sinceMs = 0): Promise<SessionEpisode[] | null> {
  try {
    const res = await api.api.memory.episodes.$get({ query: { since: String(sinceMs) } });
    if (!res.ok) return null;
    const json = await res.json();
    if (!json.success) return null;
    return json.episodes as SessionEpisode[];
  } catch {
    return null;
  }
}

export async function pullProfile(): Promise<FocusProfile | null> {
  try {
    const res = await api.api.memory.profile.$get();
    if (!res.ok) return null;
    const json = await res.json();
    if (!json.success || !json.profile) return null;
    return json.profile as unknown as FocusProfile;
  } catch {
    return null;
  }
}

export async function pushProfile(profile: FocusProfile): Promise<boolean> {
  try {
    const res = await api.api.memory.profile.$put({ json: profile });
    return res.ok;
  } catch {
    return false;
  }
}

export async function pushGoals(goals: DecomposedGoal[]): Promise<boolean> {
  try {
    const res = await api.api.memory.goals.$post({ json: { goals } });
    return res.ok;
  } catch {
    return false;
  }
}

export async function pushNotes(notes: SmartPageNote[]): Promise<boolean> {
  try {
    const res = await api.api.memory.notes.$post({ json: { notes } });
    return res.ok;
  } catch {
    return false;
  }
}

export async function pushDiary(date: string, diary: DailyDiary): Promise<boolean> {
  try {
    const res = await api.api.memory.diary.$put({
      json: { date, data: diary as unknown as Record<string, unknown> },
    });
    return res.ok;
  } catch {
    return false;
  }
}

export interface AccountSyncPayload {
  goals: DecomposedGoal[];
  notes: SmartPageNote[];
  diaries: DailyDiary[];
}

export async function pullAll(): Promise<AccountSyncPayload | null> {
  try {
    const res = await api.api.memory.all.$get();
    if (!res.ok) return null;
    const json = (await res.json()) as {
      success: boolean;
      goals: DecomposedGoal[];
      notes: SmartPageNote[];
      diaries: DailyDiary[];
    };
    if (!json.success) return null;
    return { goals: json.goals ?? [], notes: json.notes ?? [], diaries: json.diaries ?? [] };
  } catch {
    return null;
  }
}
