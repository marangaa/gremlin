import { storage } from 'wxt/utils/storage';
import { type OrganismId, type OrganismState } from '../personalities/types';

export type OperatingMode = 'cloud' | 'self-hosted';
export type DockPosition = 'bottom-right' | 'bottom-left' | 'top-right' | 'custom';
export type ChattinessLevel = 'quiet' | 'balanced' | 'chatty';

export interface OrganismConfig {
  mode: OperatingMode;
  organismId: OrganismId;
  name: string;
  enabled: boolean;
  cloudAuthToken?: string;
  selfHostedEndpoint: string;
  selfHostedApiKey?: string;
  selfHostedModel: string;
  dockPosition: DockPosition;
  chattiness: ChattinessLevel;
  /** Viewport X coordinate as a fraction of window width (0.0 to 1.0) */
  xFrac: number;
  /** Viewport Y coordinate as a fraction of window height (0.0 to 1.0) */
  yFrac: number;
}

export interface FocusSprint {
  goal: string;
  targetMinutes: number;
  startedAt: number;
  status: 'idle' | 'active' | 'completed';
}

export interface OrganismStateData {
  state: OrganismState;
  lastRemark?: string;
  lastRemarkAt: number;
  focusMinutesToday: number;
  divergenceCountToday: number;
  lastObservationAt: number;
}

export interface ActivityEntry {
  id: string;
  timestamp: number;
  type: 'divergence' | 'return' | 'focus' | 'thrashing' | 'milestone';
  domain: string;
  summary: string;
}

export const configStorage = storage.defineItem<OrganismConfig>('local:config', {
  defaultValue: {
    mode: 'cloud',
    organismId: 'nexus',
    name: 'Nexus-01',
    enabled: true,
    selfHostedEndpoint: 'http://localhost:11434/v1',
    selfHostedModel: 'llama3',
    dockPosition: 'bottom-right',
    chattiness: 'balanced',
    xFrac: 0.90,
    yFrac: 0.82,
  },
});

export const sprintStorage = storage.defineItem<FocusSprint>('local:sprint', {
  defaultValue: {
    goal: '',
    targetMinutes: 25,
    startedAt: 0,
    status: 'idle',
  },
});

export const organismStateStorage = storage.defineItem<OrganismStateData>(
  'local:organismState',
  {
    defaultValue: {
      state: 'idle',
      lastRemark: undefined,
      lastRemarkAt: 0,
      focusMinutesToday: 0,
      divergenceCountToday: 0,
      lastObservationAt: 0,
    },
  },
);

export const activityStorage = storage.defineItem<ActivityEntry[]>(
  'local:activityLog',
  {
    defaultValue: [],
  },
);
