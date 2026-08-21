import {
  sprintStorage,
  goalsStorage,
  notesStorage,
  diaryStorage,
  activityStorage,
  type DecomposedGoal,
  type SmartPageNote,
  type DailyDiary,
  type FocusSprint,
  type ActivityEntry,
} from '../../storage';
import type {
  BrowsingBreadcrumb,
  RollingTimelineEntry,
} from '@gremlin/shared';

export interface WorkingContext {
  sprint: FocusSprint;
  activeGoals: DecomposedGoal[];
  recentNotes: SmartPageNote[];
  currentTab: BrowsingBreadcrumb;
  timeline: RollingTimelineEntry[];
  elapsedSprintMinutes: number;
  localTime: string;
  isoTimestamp: string;
}

export class AgentMemoryStore {
  /**
   * Builds the current working context for the real-time focus agent.
   */
  public async getWorkingContext(
    currentTab: BrowsingBreadcrumb,
    timeline: RollingTimelineEntry[],
  ): Promise<WorkingContext> {
    const sprint: FocusSprint = await sprintStorage.getValue();
    const allGoals: DecomposedGoal[] = await goalsStorage.getValue();
    const activeGoals = allGoals.filter((g: DecomposedGoal) => g.isActive && !g.completed);

    const allNotes: SmartPageNote[] = await notesStorage.getValue();
    const recentNotes = allNotes.slice(0, 5);

    const now = new Date();
    const elapsedSprintMinutes =
      sprint.startedAt > 0 && sprint.status === 'active'
        ? (Date.now() - sprint.startedAt) / 60000
        : 0;

    return {
      sprint,
      activeGoals,
      recentNotes,
      currentTab,
      timeline,
      elapsedSprintMinutes,
      localTime: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isoTimestamp: now.toISOString(),
    };
  }

  public async getGoals(): Promise<DecomposedGoal[]> {
    return await goalsStorage.getValue();
  }

  public async saveGoals(goals: DecomposedGoal[]): Promise<void> {
    await goalsStorage.setValue(goals);
  }

  public async getSmartNotes(limit = 30): Promise<SmartPageNote[]> {
    const notes: SmartPageNote[] = await notesStorage.getValue();
    return notes.slice(0, limit);
  }

  public async getDailyDiaries(limit = 7): Promise<DailyDiary[]> {
    const diaries: DailyDiary[] = await diaryStorage.getValue();
    return diaries.slice(0, limit);
  }

  public async saveDailyDiary(diary: DailyDiary): Promise<void> {
    const all: DailyDiary[] = await diaryStorage.getValue();
    const filtered = all.filter((d: DailyDiary) => d.date !== diary.date);
    await diaryStorage.setValue([diary, ...filtered]);
  }

  public async getFocusActivityStats() {
    const activities: ActivityEntry[] = await activityStorage.getValue();
    const detours = activities.filter((a: ActivityEntry) => a.type === 'divergence' || a.type === 'thrashing').length;
    const milestones = activities.filter((a: ActivityEntry) => a.type === 'milestone').length;
    return { detours, milestones, totalActivities: activities.length };
  }
}

export const agentMemoryStore = new AgentMemoryStore();
