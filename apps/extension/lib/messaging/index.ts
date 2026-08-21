import { defineExtensionMessaging } from '@webext-core/messaging';
import { type OrganismId, type OrganismState } from '../personalities/types';
import { type OrganismConfig } from '../storage';
import type { PageSignalSnapshot } from '../events/extractor';
import type {
  DecomposedGoal,
  SmartPageNote,
  DailyDiary,
  CompanionDailyReflection,
} from '@gremlin/shared';

export interface ProtocolMap {
  triggerReaction(data: {
    state: OrganismState;
    message?: string;
    intensity?: number;
    triggerEffect?: boolean;
  }): void;
  startSprint(data: { goal: string; targetMinutes: number }): void;
  stopSprint(): void;
  pokeOrganism(): { triggered: boolean; message?: string; state?: OrganismState };
  clearActivityLog(): void;
  testScreenEffect(data: { organismId: OrganismId }): void;
  configUpdated(data: { config: OrganismConfig }): void;
  /**
   * Content scripts deliver privacy-filtered page snapshots (headings, excerpt,
   * scroll depth, media state) so the AI evaluation sees real page context.
   */
  pageSignal(data: { signal: PageSignalSnapshot }): void;

  // Workday Engine RPCs
  decomposeGoals(data: { intent: string }): { goals: DecomposedGoal[] };
  createPageNote(data: {
    content: string;
    url: string;
    domain: string;
    pageTitle: string;
    snippet?: string;
  }): { note: SmartPageNote };
  deletePageNote(data: { id: string }): void;
  toggleGoal(data: { id: string; completed?: boolean; isActive?: boolean }): void;
  deleteGoal(data: { id: string }): void;
  addGoal(data: { title: string; category?: string }): { goal: DecomposedGoal };
  getTodayDiary(): { diary: DailyDiary };
  generateDiaryReflection(): { reflection: CompanionDailyReflection };
  openInPageNoteHUD(): void;
  openSidePanel(): void;
}

export const { sendMessage, onMessage } = defineExtensionMessaging<ProtocolMap>();
