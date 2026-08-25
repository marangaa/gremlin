import {
  diaryStorage,
  notesStorage,
  goalsStorage,
  activityStorage,
  type DailyDiary,
  type SmartPageNote,
  type DecomposedGoal,
  type ActivityEntry,
} from '../storage';
import { agentOrchestrator } from '../ai/AgentOrchestrator';
import type { CompanionDailyReflection } from '@gremlin/shared';

/**
 * Returns today's date in YYYY-MM-DD local format.
 */
export function getTodayDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Retrieves or initializes today's DailyDiary structure.
 */
export async function getOrCreateTodayDiary(): Promise<DailyDiary> {
  const today = getTodayDateString();
  const allDiaries: DailyDiary[] = await diaryStorage.getValue();
  let diary = allDiaries.find((d: DailyDiary) => d.date === today);

  const notes: SmartPageNote[] = await notesStorage.getValue();
  const goals: DecomposedGoal[] = await goalsStorage.getValue();
  const activities: ActivityEntry[] = await activityStorage.getValue();

  const todayNotes = notes.filter((n: SmartPageNote) => {
    const d = new Date(n.timestamp);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` === today;
  });

  const completedGoals = goals.filter((g: DecomposedGoal) => g.completed);
  const detours = activities.filter((a: ActivityEntry) => a.type === 'divergence' || a.type === 'thrashing').length;

  if (!diary) {
    diary = {
      date: today,
      totalFocusMinutes: 0,
      totalDetours: detours,
      completedGoalsCount: completedGoals.length,
      sessions: [],
      notes: todayNotes,
      topDomains: [],
    };
    await diaryStorage.setValue([diary, ...allDiaries.filter((d: DailyDiary) => d.date !== today)]);
  } else {
    diary.notes = todayNotes;
    diary.completedGoalsCount = completedGoals.length;
    diary.totalDetours = detours;
  }

  return diary;
}

/**
 * Updates the daily diary with a completed focus session block.
 */
export async function recordDiarySession(session: {
  goalTitle: string;
  startedAt: number;
  endedAt: number;
  durationMinutes: number;
  domains: string[];
  divergenceCount: number;
}) {
  const today = getTodayDateString();
  const allDiaries: DailyDiary[] = await diaryStorage.getValue();
  const diary = await getOrCreateTodayDiary();

  const newSession = {
    id: `sess_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    goalTitle: session.goalTitle,
    startedAt: session.startedAt,
    endedAt: session.endedAt,
    durationMinutes: Math.max(1, Math.round(session.durationMinutes)),
    domains: Array.from(new Set(session.domains)),
    notesCount: diary.notes.filter((n: SmartPageNote) => n.timestamp >= session.startedAt && n.timestamp <= session.endedAt).length,
    divergenceCount: session.divergenceCount,
  };

  diary.sessions.unshift(newSession);
  diary.totalFocusMinutes += newSession.durationMinutes;

  // Recalculate top domains
  const domainMinutesMap: Record<string, number> = {};
  for (const s of diary.sessions) {
    const minsPerDomain = s.durationMinutes / (s.domains.length || 1);
    for (const d of s.domains) {
      if (d) domainMinutesMap[d] = (domainMinutesMap[d] || 0) + minsPerDomain;
    }
  }

  diary.topDomains = Object.entries(domainMinutesMap)
    .map(([domain, minutes]) => ({ domain, minutes: Math.round(minutes) }))
    .sort((a, b) => b.minutes - a.minutes)
    .slice(0, 5);

  await diaryStorage.setValue([diary, ...allDiaries.filter((d: DailyDiary) => d.date !== today)]);
}

/**
 * Generates an in-character daily reflection strictly via the autonomous DiarySynthesizerAgent.
 * Zero Fallbacks Policy: Throws an explicit error if unconfigured.
 */
export async function generateCompanionDiaryReflection(): Promise<CompanionDailyReflection> {
  const diary = await getOrCreateTodayDiary();
  const agent = await agentOrchestrator.getDiarySynthesizer();

  // Memory loop enrichment — the diary consumes episodes + lessons, not raw logs.
  const { getTodaysEpisodes } = await import('../memory/episodeStore');
  const { getProfile } = await import('../memory/focusProfile');
  const [episodes, profile] = await Promise.all([getTodaysEpisodes(), getProfile()]);

  const episodeDigest = episodes
    .map((e) => {
      const clock = new Date(e.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      if (e.type === 'intervention') return `${clock} — intervened (${e.intervention?.kind ?? 'nudge'}): ${e.detail}`;
      if (e.type === 'divergence') return `${clock} — divergence on ${e.domain ?? '?'}: ${e.detail}`;
      if (e.type === 'outcome') return `${clock} — outcome: ${e.outcome?.effective ? 'human recovered' : 'ignored'}${e.outcome?.returnedWithinMin != null ? ` in ${Math.round(e.outcome.returnedWithinMin)}m` : ''}`;
      return `${clock} — ${e.type}: ${e.detail}`;
    })
    .join('\n');

  const result = await agent.synthesize(diary, {
    episodeDigest: episodeDigest || 'None recorded',
    profileLessons: profile.lessons,
  });

  if (!result.success) {
    throw result.error;
  }

  return result.data;
}
