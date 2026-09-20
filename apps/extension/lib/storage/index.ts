import { storage } from '#imports';
import { type OrganismId, type OrganismState } from '../personalities/types';
import type { SupportedAiProvider } from '../ai/providers';
import type {
  DecomposedGoal,
  SmartPageNote,
  DailyDiary,
  CompanionDailyReflection,
  DigitalSelfAwareness,
  SessionEpisode,
  FocusProfile,
} from '@gremlin/shared';

export type OperatingMode = 'byok' | 'cloud' | 'self-hosted';

export interface OrganismConfig {
  mode: OperatingMode;
  organismId: OrganismId;
  name: string;
  enabled: boolean;

  // BYOK Settings
  provider?: SupportedAiProvider;
  byokEndpoint?: string;
  byokApiKey?: string;
  byokModel?: string;

  // Backward compatibility aliases
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
  targetMinutes?: number;
  startedAt: number;
  status: 'idle' | 'active' | 'paused' | 'completed';
  isContinuousFlow?: boolean;
}

export interface FocusScorePoint {
  timestamp: number;
  score: number; // 0-100 focus %
  status: import('@gremlin/shared').AgentFocusStatus;
  domain: string;
}

export interface AgentTelemetryData {
  isEvaluating: boolean;
  lastEvaluatedAt: number;
  nextEvaluationAt: number;
  lastStatus?: import('@gremlin/shared').AgentFocusStatus;
  lastScore?: number; // 0-100
  lastReasoning?: string;
  lastRemark?: string;
  lastDomain?: string;
  latencyMs?: number;
  history: FocusScorePoint[];
}

export interface OrganismStateData {
  state: OrganismState;
  lastRemark?: string;
  lastRemarkAt?: number;
  focusMinutesToday: number;
  divergenceCountToday: number;
  contextSwitchesToday: number;
  lastObservationAt: number;
  /** Escalation ladder position (0 calm → 3 deep spiral). Decays when on-task. */
  escalationLevel?: number;
}

export interface UserSession {
  userId?: string;

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
  DigitalSelfAwareness,
};

// ================= STORAGE DEFINITIONS =================
export const configStorage = storage.defineItem<OrganismConfig>('local:organismConfig', {
  fallback: {
    mode: 'byok',
    organismId: 'Sarge',
    name: 'Sarge',
    enabled: true,
    provider: 'google',
    byokEndpoint: 'http://localhost:11434/v1',
    byokApiKey: '',
    byokModel: '',
    selfHostedEndpoint: 'http://localhost:11434/v1',
    selfHostedApiKey: '',
    selfHostedModel: '',
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
    startedAt: 0,
    status: 'idle',
    isContinuousFlow: true,
  },
});

export const telemetryStorage = storage.defineItem<AgentTelemetryData>('local:agentTelemetry', {
  fallback: {
    isEvaluating: false,
    lastEvaluatedAt: 0,
    nextEvaluationAt: 0,
    history: [],
  },
});

export const organismStateStorage = storage.defineItem<OrganismStateData>('local:organismState', {
  fallback: {
    state: 'idle',
    lastRemark: undefined,
    lastRemarkAt: 0,
    focusMinutesToday: 0,
    divergenceCountToday: 0,
    contextSwitchesToday: 0,
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
 * Device identity — persisted per extension install so every sync payload
 * carries provenance and the server can maintain a device roster.
 * WXT `local:` storage survives browser restarts; a UUID is generated once
 * per install and regenerated only on reinstall (fresh roster entry, old one
 * ages out server-side).
 */
export const deviceIdStorage = storage.defineItem<string>('local:deviceId', {
  fallback: '',
});

export const deviceNameStorage = storage.defineItem<string>('local:deviceName', {
  fallback: '',
});

/** Returns the install-stable device identity, creating it on first use. */
export async function getDeviceIdentity(): Promise<{ deviceId: string; deviceName: string }> {
  let id = await deviceIdStorage.getValue();
  if (!id) {
    id = crypto.randomUUID();
    await deviceIdStorage.setValue(id);
  }
  let name = await deviceNameStorage.getValue();
  if (!name) {
    const ua = navigator.userAgent;
    const browserName = /Edg\//.test(ua)
      ? 'Edge'
      : /OPR\//.test(ua)
        ? 'Opera'
        : /Chrome\//.test(ua)
          ? 'Chrome'
          : 'Browser';
    name = `${browserName} on ${navigator.platform || 'Unknown OS'}`;
    await deviceNameStorage.setValue(name);
  }
  return { deviceId: id, deviceName: name };
}




