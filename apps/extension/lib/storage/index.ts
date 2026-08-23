import { storage } from '#imports';
import { type OrganismId, type OrganismState } from '../personalities/types';
import type { SupportedAiProvider } from '../ai/providers';
import type {
  DecomposedGoal,
  SmartPageNote,
  DailyDiary,
  CompanionDailyReflection,
  AiTelemetryTrace,
  SessionEpisode,
  FocusProfile,
} from '@gremlin/shared';

export type OperatingMode = 'self-hosted' | 'cloud';

export interface OrganismConfig {
  mode: OperatingMode;
  organismId: OrganismId;
  name: string;
  enabled: boolean;

  // BYOK Settings
  provider?: SupportedAiProvider;
  selfHostedEndpoint?: string;
  selfHostedApiKey?: string;
  selfHostedModel?: string;

  // Audio & Effects Controls
  soundEnabled: boolean;
  volume: number;
  effectsEnabled: boolean;
  /** Chaos slider, 0 (calm) → 1 (unhinged). Scales effect visuals + ambient chance. */
  effectsIntensity?: number;

  // Viewport Position
  xFrac: number;
  yFrac: number;
}

export interface FocusSprint {
  goal: string;
  targetMinutes: number;
  startedAt: number;
  status: 'idle' | 'active' | 'paused' | 'completed';
  isContinuousFlow?: boolean;
}

export interface OrganismStateData {
  state: OrganismState;
  lastRemark?: string;
  lastRemarkAt?: number;
  focusMinutesToday: number;
  divergenceCountToday: number;
  lastObservationAt: number;
  /** Escalation ladder position (0 calm → 3 deep spiral). Decays when on-task. */
  escalationLevel?: number;
}

export interface UserSession {
  userId?: string;
  token?: string;
  plan: 'free' | 'pro';
  email?: string;
  isLoggedIn?: boolean;
}

export interface ActivityEntry {
  id: string;
  timestamp: number;
  type: 'focus' | 'divergence' | 'milestone' | 'poke' | 'thrashing';
  domain: string;
  summary: string;
}

export interface StoredHistoryEntry {
  domain: string;
  title: string;
  timestamp: number;
  dwellSeconds: number;
}

export type {
  DecomposedGoal,
  SmartPageNote,
  DailyDiary,
  CompanionDailyReflection,
  AiTelemetryTrace,
};

// ================= STORAGE DEFINITIONS =================
export const configStorage = storage.defineItem<OrganismConfig>('local:organismConfig', {
  fallback: {
    mode: 'self-hosted',
    organismId: 'Sarge',
    name: 'Sarge',
    enabled: true,
    provider: 'google',
    selfHostedEndpoint: 'http://localhost:11434/v1',
    selfHostedApiKey: '',
    selfHostedModel: 'gemini-2.5-flash',
    soundEnabled: true,
    volume: 0.6,
    effectsEnabled: true,
    effectsIntensity: 0.45,
    xFrac: 0.9,
    yFrac: 0.82,
  },
});

export const sprintStorage = storage.defineItem<FocusSprint>('local:sprint', {
  fallback: {
    goal: '',
    targetMinutes: 25,
    startedAt: 0,
    status: 'idle',
  },
});

export const organismStateStorage = storage.defineItem<OrganismStateData>('local:organismState', {
  fallback: {
    state: 'idle',
    lastRemark: undefined,
    lastRemarkAt: 0,
    focusMinutesToday: 0,
    divergenceCountToday: 0,
      escalationLevel: 0,
    lastObservationAt: 0,
  },
});

export const userSessionStorage = storage.defineItem<UserSession>('local:userSession', {
  fallback: {
    plan: 'free',
    isLoggedIn: false,
  },
});

export const onboardedStorage = storage.defineItem<boolean>('local:onboarded', {
  fallback: false,
});

export const activityStorage = storage.defineItem<ActivityEntry[]>('local:activityHistory', {
  fallback: [],
});

export const eventHistoryStorage = storage.defineItem<StoredHistoryEntry[]>('local:eventHistory', {
  fallback: [],
});

export const goalsStorage = storage.defineItem<DecomposedGoal[]>('local:decomposedGoals', {
  fallback: [],
});

export const notesStorage = storage.defineItem<SmartPageNote[]>('local:pageNotes', {
  fallback: [],
});

export const diaryStorage = storage.defineItem<DailyDiary[]>('local:diaries', {
  fallback: [],
});

export const telemetryStorage = storage.defineItem<AiTelemetryTrace[]>('local:aiTelemetryTraces', {
  fallback: [],
});

// ================= MEMORY LOOP =================

/** Append-only episode history (interventions + outcomes + observations). */
export const episodeLogStorage = storage.defineItem<SessionEpisode[]>('local:episodeLog', {
  fallback: [],
});

/** What the companion has learned about its human (live stats + distilled lessons). */
const FOCUS_PROFILE_FALLBACK: FocusProfile = {
  focusWindows: [],
  topDistractions: [],
  interventionEffectiveness: {},
  lessons: [],
  updatedAt: 0,
};

export const focusProfileStorage = storage.defineItem<FocusProfile>('local:focusProfile', {
  fallback: FOCUS_PROFILE_FALLBACK,
});

/**
 * Best-effort sync mirror of the profile so identity survives reinstalls.
 * chrome.storage.sync persists per Google-account profile; quotas are tight
 * (single item < 8KB), which the small profile comfortably satisfies.
 */
export const focusProfileSyncStorage = storage.defineItem<FocusProfile>('sync:focusProfile', {
  fallback: FOCUS_PROFILE_FALLBACK,
});



