import { api } from './client';
import type { SessionEpisode, FocusProfile } from '@gremlin/shared';

/**
 * Cloud memory sync — mirrors episodes and the focus profile to Gremlin
 * Cloud for signed-in users. Every call is best-effort: failures resolve to
 * `null` so local-first behavior is never disrupted by network state.
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
