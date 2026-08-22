import { eventTracker } from '@/lib/events/tracker';
import { decideOrganismReaction } from '@/lib/ai/engine';
import { decomposeUserIntent } from '@/lib/ai/decomposer';
import {
  getOrCreateTodayDiary,
  recordDiarySession,
  generateCompanionDiaryReflection,
} from '@/lib/diary/engine';
import {
  configStorage,
  sprintStorage,
  organismStateStorage,
  activityStorage,
  goalsStorage,
  notesStorage,
  type ActivityEntry,
  type OrganismConfig,
  type SmartPageNote,
  type DecomposedGoal,
} from '@/lib/storage';
import { onMessage, sendMessage } from '@/lib/messaging';

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
const DEBOUNCE_MS = 600;
/** Minimum interval between AI evaluations; pokes bypass it. */
const EVALUATION_THROTTLE_MS = 45_000;

function debouncedEvaluate(force = false) {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    void evaluateCurrentState(force);
  }, DEBOUNCE_MS);
}

export default defineBackground(() => {
  // Initialize browser event tracking
  eventTracker.init();

  // 1. Programmatically inject content scripts into all already-open tabs on install/reload
  browser.runtime.onInstalled.addListener(async () => {
    try {
      const tabs = await browser.tabs.query({ url: ['http://*/*', 'https://*/*'] });
      for (const tab of tabs) {
        if (tab.id) {
          try {
            await browser.scripting.executeScript({
              target: { tabId: tab.id },
              files: ['/content-scripts/content.js'],
            });
          } catch {
            // Ignore restricted tabs
          }
        }
      }
    } catch {
      // Ignore
    }
  });

  // 2. Global keyboard shortcut listener for Side Panel
  browser.commands?.onCommand.addListener(async (command) => {
    if (command === 'open_side_panel') {
      try {
        const currentWindow = await browser.windows.getCurrent();
        if (currentWindow?.id) {
          await browser.sidePanel?.open({ windowId: currentWindow.id });
        }
      } catch (err) {
        console.warn('[Gremlin Background] sidePanel.open command error:', err);
      }
    }
  });

  // 3. Broadcast live configuration changes to ALL open tabs immediately
  configStorage.watch(async (newConfig: OrganismConfig | null) => {
    if (!newConfig) return;
    try {
      const tabs = await browser.tabs.query({ url: ['http://*/*', 'https://*/*'] });
      for (const tab of tabs) {
        if (tab.id) {
          try {
            await sendMessage('configUpdated', { config: newConfig }, tab.id);
          } catch {
            // Tab might not be injectable or sleeping
          }
        }
      }
    } catch {
      // Ignore
    }
  });

  // Periodic heartbeat alarm for checking focus sprint progress
  browser.alarms.create('organismTick', { periodInMinutes: 0.5 });

  browser.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === 'organismTick') {
      await evaluateCurrentState();
    }
  });

  // Evaluate state with debounce when tabs update or switch
  browser.tabs.onActivated.addListener(async (activeInfo) => {
    debouncedEvaluate();
    // Record continuous focus activity log
    try {
      const tab = await browser.tabs.get(activeInfo.tabId);
      if (tab?.url) {
        const domain = new URL(tab.url).hostname.replace(/^www\./, '');
        const sprint = await sprintStorage.getValue();
        if (sprint.status === 'active' && domain) {
          await logActivity('focus', domain, `Browsing ${domain}`);
        }
      }
    } catch {
      // Ignore
    }
  });

  browser.tabs.onUpdated.addListener(async (_tabId, changeInfo, tab) => {
    if (tab.active && (changeInfo.status === 'complete' || changeInfo.url)) {
      debouncedEvaluate();
      if (changeInfo.url) {
        try {
          const domain = new URL(changeInfo.url).hostname.replace(/^www\./, '');
          const sprint = await sprintStorage.getValue();
          if (sprint.status === 'active' && domain) {
            await logActivity('focus', domain, `Navigated to ${domain}`);
          }
        } catch {
          // Ignore
        }
      }
    }
  });

  // Handle Typed RPC Messaging
  onMessage('pageSignal', async ({ data }) => {
    eventTracker.recordPageSignal(data.signal);
  });

  onMessage('startSprint', async ({ data }) => {
    await sprintStorage.setValue({
      goal: data.goal,
      targetMinutes: data.targetMinutes,
      startedAt: Date.now(),
      status: 'active',
    });

    const [activeTab] = await browser.tabs.query({ active: true, currentWindow: true });

    if (activeTab?.id) {
      try {
        await sendMessage(
          'triggerReaction',
          {
            state: 'peek',
            message: `Locked in: "${data.goal.slice(0, 24)}"`,
            intensity: 0.8,
          },
          activeTab.id,
        );
      } catch {
        // Tab not injectable
      }
    }
  });

  onMessage('stopSprint', async () => {
    const sprint = await sprintStorage.getValue();
    if (sprint.status === 'active' && sprint.startedAt > 0) {
      const elapsedMinutes = (Date.now() - sprint.startedAt) / 60000;
      const ctx = eventTracker.getContext();
      await recordDiarySession({
        goalTitle: sprint.goal || 'Focus Sprint',
        startedAt: sprint.startedAt,
        endedAt: Date.now(),
        durationMinutes: elapsedMinutes,
        domains: ctx.recentDomains,
        divergenceCount: 0,
      });
    }

    await sprintStorage.setValue({
      goal: '',
      targetMinutes: 25,
      startedAt: 0,
      status: 'idle',
    });
  });

  onMessage('pokeOrganism', async () => {
    return await evaluateCurrentState(true);
  });

  onMessage('clearActivityLog', async () => {
    eventTracker.clearHistory();
    await activityStorage.setValue([]);
    const state = await organismStateStorage.getValue();
    await organismStateStorage.setValue({
      ...state,
      focusMinutesToday: 0,
      divergenceCountToday: 0,
    });
  });

  // ================= NEW WORKDAY ENGINE RPCs =================
  onMessage('decomposeGoals', async ({ data }) => {
    const decomposed = await decomposeUserIntent(data.intent);
    const existing: DecomposedGoal[] = await goalsStorage.getValue();
    const merged = [...decomposed, ...existing.filter((e: DecomposedGoal) => !e.completed)];
    await goalsStorage.setValue(merged);
    return { goals: merged };
  });

  onMessage('createPageNote', async ({ data }) => {
    const config = await configStorage.getValue();
    const sprint = await sprintStorage.getValue();
    const notes: SmartPageNote[] = await notesStorage.getValue();

    const newNote: SmartPageNote = {
      id: `note_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      content: data.content,
      url: data.url,
      domain: data.domain,
      pageTitle: data.pageTitle,
      snippet: data.snippet,
      goalTitle: sprint.status === 'active' ? sprint.goal : undefined,
      companionId: config.organismId,
      timestamp: Date.now(),
    };

    await notesStorage.setValue([newNote, ...notes]);
    await logActivity('milestone', data.domain, `Note saved: "${data.content.slice(0, 30)}…"`);

    return { note: newNote };
  });

  onMessage('deletePageNote', async ({ data }) => {
    const notes: SmartPageNote[] = await notesStorage.getValue();
    await notesStorage.setValue(notes.filter((n: SmartPageNote) => n.id !== data.id));
  });

  onMessage('toggleGoal', async ({ data }) => {
    const goals: DecomposedGoal[] = await goalsStorage.getValue();
    const updated = goals.map((g: DecomposedGoal) => {
      if (g.id === data.id) {
        return {
          ...g,
          completed: data.completed !== undefined ? data.completed : g.completed,
          isActive: data.isActive !== undefined ? data.isActive : g.isActive,
          completedAt: data.completed ? Date.now() : undefined,
        };
      }
      return g;
    });
    await goalsStorage.setValue(updated);
  });

  onMessage('deleteGoal', async ({ data }) => {
    const goals: DecomposedGoal[] = await goalsStorage.getValue();
    await goalsStorage.setValue(goals.filter((g: DecomposedGoal) => g.id !== data.id));
  });

  onMessage('addGoal', async ({ data }) => {
    const goals = await goalsStorage.getValue();
    const newGoal: DecomposedGoal = {
      id: `goal_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      title: data.title,
      category: data.category || 'general',
      estimatedMinutes: 25,
      isActive: true,
      completed: false,
      createdAt: Date.now(),
    };
    const updated = [newGoal, ...goals];
    await goalsStorage.setValue(updated);
    return { goal: newGoal };
  });

  onMessage('getTodayDiary', async () => {
    const diary = await getOrCreateTodayDiary();
    return { diary };
  });

  onMessage('generateDiaryReflection', async () => {
    const reflection = await generateCompanionDiaryReflection();
    return { reflection };
  });

  onMessage('openInPageNoteHUD', async () => {
    const [activeTab] = await browser.tabs.query({ active: true, currentWindow: true });
    if (activeTab?.id) {
      try {
        await sendMessage('triggerReaction', { state: 'curious', message: 'Note Sheet open' }, activeTab.id);
      } catch {
        // Tab not injectable
      }
    }
  });

  onMessage('openSidePanel', async () => {
    try {
      const currentWindow = await browser.windows.getCurrent();
      if (currentWindow?.id) {
        await browser.sidePanel?.open({ windowId: currentWindow.id });
      }
    } catch (err) {
      console.warn('[Gremlin Background] openSidePanel error:', err);
    }
  });
});

async function evaluateCurrentState(force = false): Promise<{
  triggered: boolean;
  message?: string;
  state?: any;
}> {
  try {
    const config = await configStorage.getValue();
    if (!config.enabled && !force) return { triggered: false };

    const sprint = await sprintStorage.getValue();
    const organismState = await organismStateStorage.getValue();
    const ctx = eventTracker.getContext();

    // Check if sprint completed
    if (sprint.status === 'active' && sprint.startedAt > 0) {
      const elapsedMinutes = (Date.now() - sprint.startedAt) / 60000;
      if (elapsedMinutes >= sprint.targetMinutes) {
        await sprintStorage.setValue({ ...sprint, status: 'completed' });
        await logActivity('milestone', ctx.currentDomain, `Completed sprint: "${sprint.goal}"`);
        await recordDiarySession({
          goalTitle: sprint.goal,
          startedAt: sprint.startedAt,
          endedAt: Date.now(),
          durationMinutes: elapsedMinutes,
          domains: ctx.recentDomains,
          divergenceCount: organismState.divergenceCountToday,
        });
      }
    }

    // Only run AI evaluation during an active sprint or when poked
    const shouldEvaluate = sprint.status === 'active' || force;
    if (!shouldEvaluate) {
      return { triggered: false };
    }

    // Throttle: skip redundant LLM calls when the last evaluation is recent.
    // Manual pokes and the 30s alarm still pass through completion logic above.
    if (!force && Date.now() - organismState.lastObservationAt < EVALUATION_THROTTLE_MS) {
      return { triggered: false };
    }

    const decision = await decideOrganismReaction(ctx, sprint, config, force);

    // Record that an observation cycle ran regardless of reaction outcome,
    // so throttling reflects real evaluation cadence.
    organismState.lastObservationAt = Date.now();

    if (decision.shouldReact || force) {
      if (decision.triggerEffect || decision.state === 'annoyed' || decision.state === 'suspicious') {
        organismState.divergenceCountToday += 1;
        await logActivity('divergence', ctx.currentDomain, `Detour on ${ctx.currentDomain}`);
      } else if (decision.state === 'celebrating') {
        organismState.focusMinutesToday += 15;
        await logActivity('focus', ctx.currentDomain, 'Focus streak milestone');
      }

      organismState.state = decision.state;
      organismState.lastRemark = decision.remark;
      organismState.lastRemarkAt = Date.now();
      await organismStateStorage.setValue(organismState);

      const [activeTab] = await browser.tabs.query({ active: true, currentWindow: true });

      if (activeTab?.id) {
        try {
          await sendMessage(
            'triggerReaction',
            {
              state: decision.state,
              message: decision.remark,
              intensity: decision.intensity,
              triggerEffect: decision.triggerEffect,
            },
            activeTab.id,
          );
        } catch {
          // Tab might not be injectable
        }
      }

      return {
        triggered: true,
        message: decision.remark,
        state: decision.state,
      };
    }

    // Persist observation timestamp even when no reaction fires so the
    // throttle window reflects actual evaluation cadence.
    await organismStateStorage.setValue(organismState);
    return { triggered: false };
  } catch (err) {
    console.warn('[Gremlin Background] State evaluation error:', err);
    return { triggered: false };
  }
}

async function logActivity(
  type: ActivityEntry['type'],
  domain: string,
  summary: string,
) {
  try {
    const current = await activityStorage.getValue();
    const entry: ActivityEntry = {
      id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now(),
      type,
      domain,
      summary,
    };
    await activityStorage.setValue([entry, ...current.slice(0, 49)]);
  } catch {
    // Storage error fallback
  }
}
