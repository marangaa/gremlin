import { storage } from '#imports';
import { type OrganismId, type OrganismState } from '../personalities/types';
import type { SupportedAiProvider } from '../ai/providers';
import type {
  DecomposedGoal,
  SmartPageNote,
  DailyDiary,
  CompanionDailyReflection,
  AiTelemetryTrace,
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
