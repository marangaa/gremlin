import { eventTracker } from '@/lib/events/tracker';
import { heuristicsEngine } from '@/lib/events/heuristics';
import { decideOrganismReaction } from '@/lib/ai/engine';
import {
  configStorage,
  sprintStorage,
  organismStateStorage,
  activityStorage,
  type ActivityEntry,
} from '@/lib/storage';
import { onMessage, sendMessage } from '@/lib/messaging';

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
const DEBOUNCE_MS = 350;

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

  // Periodic alarm for checking situation & focus sprint progress
  browser.alarms.create('organismTick', { periodInMinutes: 0.5 });

  browser.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === 'organismTick') {
      await evaluateCurrentState();
    }
  });

  // Evaluate state with debounce when tabs update or switch
  browser.tabs.onActivated.addListener(() => {
    debouncedEvaluate();
  });

  browser.tabs.onUpdated.addListener((_tabId, changeInfo, tab) => {
    if (tab.active && (changeInfo.status === 'complete' || changeInfo.url)) {
      debouncedEvaluate();
    }
  });

  // Handle Typed RPC Messaging
  onMessage('startSprint', async ({ data }) => {
    await sprintStorage.setValue({
      goal: data.goal,
      targetMinutes: data.targetMinutes,
      startedAt: Date.now(),
      status: 'active',
    });

    const [activeTab] = await browser.tabs.query({ active: true, currentWindow: true });

    if (activeTab?.id) {
      await sendMessage(
        'triggerReaction',
        {
          state: 'peek',
          message: `Sprint locked: "${data.goal.slice(0, 22)}"`,
          intensity: 0.8,
        },
        activeTab.id,
      );
    }
  });

  onMessage('stopSprint', async () => {
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
      }
    }

    const situation = heuristicsEngine.evaluate(
      ctx,
      sprint,
      config.organismId,
      config.chattiness,
    );

    if (force) {
      situation.trigger = 'MANUAL_POKE';
      situation.shouldPromptAI = true;
    }

    if (situation.shouldPromptAI || situation.recommendedState !== organismState.state) {
      const decision = await decideOrganismReaction(ctx, sprint, config, situation);

      if (decision.shouldReact || force) {
        heuristicsEngine.recordRemarkGiven();

        // Track stats & activity entry
        if (situation.trigger === 'GOAL_DIVERGENCE') {
          organismState.divergenceCountToday += 1;
          await logActivity('divergence', ctx.currentDomain, `Detour on ${ctx.currentDomain}`);
        } else if (situation.trigger === 'GOAL_RETURN') {
          await logActivity('return', ctx.currentDomain, 'Returned to focus task');
        } else if (situation.trigger === 'PROLONGED_FOCUS') {
          organismState.focusMinutesToday += 15;
          await logActivity('focus', ctx.currentDomain, '15m continuous focus sprint');
        }

        await organismStateStorage.setValue({
          ...organismState,
          state: decision.state,
          lastRemark: decision.remark,
          lastRemarkAt: decision.remark ? Date.now() : organismState.lastRemarkAt,
          lastObservationAt: Date.now(),
        });

        // Broadcast to active tab
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
            // Tab not injectable (e.g. chrome://)
          }
        }

        return {
          triggered: true,
          message: decision.remark,
          state: decision.state,
        };
      }
    }

    return { triggered: false };
  } catch (err) {
    console.error('[AI Organism Background] Evaluation error:', err);
    return { triggered: false };
  }
}

async function logActivity(
  type: ActivityEntry['type'],
  domain: string,
  summary: string,
) {
  const current = await activityStorage.getValue();
  const entry: ActivityEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: Date.now(),
    type,
    domain: domain || 'browser',
    summary,
  };
  await activityStorage.setValue([entry, ...current].slice(0, 30));
}
