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
import {
  recordEpisode,
  openIntervention,
  closeOpenOutcomes,
  getTodaysEpisodes,
} from '@/lib/memory/episodeStore';
import { recordObservation, getProfile, bumpLessons } from '@/lib/memory/focusProfile';
import { pushEpisodes, pushProfile } from '@/lib/api/memoryClient';
import { agentOrchestrator } from '@/lib/ai/AgentOrchestrator';
import { onMessage, sendMessage } from '@/lib/messaging';

/**
 * Cloud memory mirror — when the human is signed into Gremlin Cloud, new
 * episodes and profile updates opportunistically mirror server-side so
 * learning survives reinstalls and follows them across devices. Local-first:
 * every failure is swallowed and nothing waits on the network.
 */
async function isCloudSyncActive(): Promise<boolean> {
  try {
    const [config, session] = await Promise.all([
      configStorage.getValue(),
      (await import('@/lib/storage')).userSessionStorage.getValue(),
    ]);
    return config.mode === 'cloud' && Boolean(session.isLoggedIn);
  } catch {
    return false;
  }
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
const DEBOUNCE_MS = 600;
/** Minimum interval between AI evaluations; pokes bypass it. */
const EVALUATION_THROTTLE_MS = 45_000;

/**
 * Presence via chrome.idle (permission long declared, now finally used).
 * The companion never judges an empty chair: evaluations pause while the
 * human is idle or the machine is locked.
 */
type Presence = 'active' | 'idle' | 'locked';
let presence: Presence = 'active';
let wentIdleAt: number | null = null;
let welcomedBackForGap: number | null = null;

function isHumanPresent(): boolean {
  return presence === 'active';
}

/**
 * Nightly Psychologist trigger — lazy date-change hook. Chrome MV3 cannot
 * reliably wake at a scheduled hour, so instead: the first evaluation of a
 * new day distills YESTERDAY'S episodes into profile lessons (one LLM call
 * on the user's key), then stamps today as done.
 */
let lastDistillDate = '';

async function maybeRunNightlyDistill(): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  if (lastDistillDate === today) return;
  lastDistillDate = today;

  try {
    const episodes = await getTodaysEpisodes();
    if (episodes.length < 3) return;

    const psychologist = await agentOrchestrator.getPsychologist();
    const profile = await getProfile();
    const result = await psychologist.distillDaily({
      episodes,
      diarySummary: `Focus minutes today tracked; ${episodes.filter((e) => e.type === 'divergence').length} divergence events.`,
      currentLessons: profile.lessons,
    });
    if (result.success && result.data) {
      await bumpLessons(result.data.lessons);
    }
  } catch {
    // Distillation is opportunistic — never block evaluations on it.
  }
}

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

  // Periodic heartbeat: presence checks + safety-net evaluation cadence
  browser.alarms.create('organismTick', { periodInMinutes: 0.5 });

  // Boot-time profile merge: if Gremlin Cloud holds a newer focus profile
  // (e.g., synced from another device), adopt it locally.
  void (async () => {
    try {
      const { pullProfile } = await import('@/lib/api/memoryClient');
      const { focusProfileStorage } = await import('@/lib/storage');
      if (!(await isCloudSyncActive())) return;
      const remote = await pullProfile();
      if (!remote) return;
      const local = await focusProfileStorage.getValue();
      if ((remote.updatedAt ?? 0) > (local.updatedAt ?? 0)) {
        await focusProfileStorage.setValue(remote);
      }
    } catch {
      // Cloud unreachable — local-first continues unaffected.
    }
  })();

  browser.idle.setDetectionInterval(60);
  browser.idle.onStateChanged.addListener((newState) => {
    const prev = presence;
    presence = (newState as Presence) === 'locked' ? 'locked' : newState === 'idle' ? 'idle' : 'active';

    // Welcome-back flow: after a long idle gap during an active sprint, greet
    // the human warmly on return — once per gap, zero guilt attached.
    if (prev !== 'active' && presence === 'active' && wentIdleAt) {
      const gapMin = (Date.now() - wentIdleAt) / 60000;
      if (gapMin >= 15 && welcomedBackForGap !== wentIdleAt) {
        welcomedBackForGap = wentIdleAt;
        void (async () => {
          try {
            const sprint = await sprintStorage.getValue();
            if (sprint.status !== 'active') return;
            const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
            if (!tab?.id) return;
            await sendMessage(
              'triggerReaction',
              { state: 'curious', message: 'Welcome back — where were we?' },
              tab.id,
            );
          } catch {
            // Tab not injectable — skip the greeting
          }
        })();
      }
    }
    wentIdleAt = presence !== 'active' ? Date.now() : wentIdleAt;
  });

  browser.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === 'organismTick') {
      if (!isHumanPresent()) return;
      await maybeRunNightlyDistill();
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
      escalationLevel: 0,
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

    const onTask =
      decision.status === 'on_task' || decision.status === 'goal_completed' || decision.status === 'resting_or_idle';
    await recordObservation({
      domain: ctx.currentDomain,
      onTask,
      hour: new Date().getHours(),
    });


    if (decision.shouldReact || force) {
      if (decision.triggerEffect || decision.state === 'annoyed' || decision.state === 'suspicious') {
        organismState.divergenceCountToday += 1;
        await logActivity('divergence', ctx.currentDomain, `Detour on ${ctx.currentDomain}`);
        void recordEpisode({
          type: 'divergence',
          domain: ctx.currentDomain,
          detail: decision.remark ?? `Detour on ${ctx.currentDomain}`,
          ...(sprint.goal ? { goalTitle: sprint.goal } : {}),
        });
      } else if (decision.state === 'celebrating') {
        organismState.focusMinutesToday += 15;
        await logActivity('focus', ctx.currentDomain, 'Focus streak milestone');
      }

      // MEMORY LOOP — the judge spoke: open an intervention episode and
      // remember its kind so outcomes can close it later.
      const kind = decision.intervention ?? 'nudge';
      const level = organismState.escalationLevel ?? 0;
      if (kind !== 'observe') {
        await openIntervention({
          kind,
          level,
          remark: decision.remark,
          domain: ctx.currentDomain,
          ...(sprint.goal ? { goalTitle: sprint.goal } : {}),
        });
      }
      organismState.escalationLevel = Math.max(
        0,
        Math.min(3, level + (kind === 'observe' ? -1 : (decision.escalationDelta ?? 1))),
      );
      if (kind !== 'observe') {
        organismState.state = decision.state;
        organismState.lastRemark = decision.remark;
        organismState.lastRemarkAt = Date.now();
      } else {
        organismState.state = decision.state;
      }
      await organismStateStorage.setValue(organismState);

      void (async () => {
        if (await isCloudSyncActive()) {
          const eps = await getTodaysEpisodes();
          if (eps[0]) await pushEpisodes([eps[0]!]);
          await pushProfile(await getProfile());
        }
      })();

      const [activeTab] = await browser.tabs.query({ active: true, currentWindow: true });

      if (activeTab?.id && kind !== 'observe') {
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
        triggered: kind !== 'observe',
        message: decision.remark,
        state: decision.state,
      };
    }

    // OUTCOME WATCHER — the judge stayed silent this cycle; if that silence
    // follows an intervention and the human is back on task, close the loop.
    if (onTask) {
      const closed = await closeOpenOutcomes({ effective: true });
      if (closed > 0) {
        organismState.escalationLevel = Math.max(0, (organismState.escalationLevel ?? 0) - 1);
      }
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

