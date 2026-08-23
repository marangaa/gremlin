import type { FocusProfile, InterventionKind } from '@gremlin/shared';
import { focusProfileStorage, focusProfileSyncStorage } from '../storage';

/** Neutral seed score for an hour bucket with no observations yet. */
const DEFAULT_BUCKET_SCORE = 0.5;
/** Score gain when an on-task observation lands in an hour bucket. */
const SCORE_INCREMENT = 0.1;
/** Score penalty when an off-task observation lands in an hour bucket. */
const SCORE_DECREMENT = 0.15;
/** Maximum distractions tracked in the profile. */
const MAX_DISTRACTIONS = 5;
/** Maximum distilled lessons retained in the profile. */
const MAX_LESSONS = 8;

/**
 * Writes the profile locally and mirrors it to sync storage best-effort.
 * Sync failures (quotas, offline) never fail the write.
 */
async function persist(profile: FocusProfile): Promise<void> {
  const p = { ...profile, updatedAt: Date.now() };
  await focusProfileStorage.setValue(p);
  try {
    await focusProfileSyncStorage.setValue(p);
  } catch {
    /* sync quotas/offline — best effort */
  }
}

function ensureEffectiveness(
  profile: FocusProfile,
  kind: InterventionKind,
): { sent: number; effective: number } {
  return profile.interventionEffectiveness[kind] ?? { sent: 0, effective: 0 };
}

/**
 * Folds a live observation into the hour-bucket focus score and distraction
 * ranking, then persists the profile.
 */
export async function recordObservation(input: {
  domain: string;
  onTask: boolean;
  hour: number;
}): Promise<void> {
  const profile = await getProfile();

  const current =
    profile.focusWindows.find((w) => w.hour === input.hour)?.score ?? DEFAULT_BUCKET_SCORE;
  const nextScore = input.onTask
    ? Math.min(1, current + SCORE_INCREMENT)
    : Math.max(0, current - SCORE_DECREMENT);
  const focusWindows = [
    ...profile.focusWindows.filter((w) => w.hour !== input.hour),
    { hour: input.hour, score: nextScore },
  ].sort((a, b) => a.hour - b.hour);

  let topDistractions = profile.topDistractions;
  if (!input.onTask) {
    topDistractions = [
      ...topDistractions.filter((d) => d.domain !== input.domain),
      {
        domain: input.domain,
        count: (profile.topDistractions.find((d) => d.domain === input.domain)?.count ?? 0) + 1,
      },
    ]
      .sort((a, b) => b.count - a.count)
      .slice(0, MAX_DISTRACTIONS);
  }

  await persist({ ...profile, focusWindows, topDistractions });
}

/**
 * Increments the sent counter for an intervention kind, then persists the profile.
 */
export async function recordInterventionSent(kind: InterventionKind): Promise<void> {
  const profile = await getProfile();
  const entry = ensureEffectiveness(profile, kind);
  await persist({
    ...profile,
    interventionEffectiveness: {
      ...profile.interventionEffectiveness,
      [kind]: { ...entry, sent: entry.sent + 1 },
    },
  });
}

/**
 * Increments the effective counter for an intervention kind only when the
 * outcome was effective, then persists the profile.
 */
export async function recordInterventionOutcome(
  kind: InterventionKind,
  effective: boolean,
): Promise<void> {
  const profile = await getProfile();
  const entry = ensureEffectiveness(profile, kind);
  await persist({
    ...profile,
    interventionEffectiveness: {
      ...profile.interventionEffectiveness,
      [kind]: { ...entry, effective: entry.effective + (effective ? 1 : 0) },
    },
  });
}

/**
 * Merges new lessons ahead of existing ones, deduped newest-first and capped at 8.
 */
export async function bumpLessons(lessons: string[]): Promise<void> {
  const profile = await getProfile();
  const merged = [...lessons.filter(Boolean), ...profile.lessons].filter(
    (lesson, i, arr) => arr.indexOf(lesson) === i,
  );
  await persist({ ...profile, lessons: merged.slice(0, MAX_LESSONS) });
}

/**
 * Returns the companion's current learned profile of its user.
 */
export async function getProfile(): Promise<FocusProfile> {
  return focusProfileStorage.getValue();
}
