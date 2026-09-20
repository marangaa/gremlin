import { generateText } from 'ai';
import './devtools';
import { z } from 'zod';
import { type BrowserContext } from '../events/tracker';
import {
  type FocusSprint,
  type OrganismConfig,
  telemetryStorage,
} from '../storage';
import { resolveLanguageModel } from './modelFactory';
import { type SupportedAiProvider } from './providers';
import { api } from '../api/client';
import { agentOrchestrator } from './AgentOrchestrator';
import type { EvaluationResult, OrganismState } from '@gremlin/shared';

export const OrganismDecisionSchema = z.object({
  status: z.enum([
    'on_task',
    'exploring_tangent',
    'distracted',
    'resting_or_idle',
    'goal_completed',
  ]),
  divergenceScore: z.number().min(0).max(1),
  mood: z.enum([
    'idle',
    'watching',
    'peek',
    'curious',
    'confused',
    'suspicious',
    'annoyed',
    'celebrating',
    'sleeping',
    'shocked',
    'thinking',
    'wandering',
    'hidden',
  ]),
  remark: z.string().max(70).nullable(),
  visualEffect: z.enum(['none', 'vignette', 'screen_shake', 'confetti']).default('none'),
  soundReaction: z.enum(['none', 'chirp', 'alert', 'celebrate', 'sigh']).default('none'),
  reasoning: z.string().optional(),
});

export type OrganismDecision = z.infer<typeof OrganismDecisionSchema>;

/**
 * Builds the current-tab breadcrumb from live page signals when available,
 * falling back to domain/title/dwell telemetry only.
 */
function buildBreadcrumb(ctx: BrowserContext) {
  const signal = ctx.pageSignal;
  return {
    url: signal?.urlClean ?? ctx.currentDomain,
    domain: ctx.currentDomain,
    title: signal?.title || ctx.currentTitle,
    headings: signal?.headings ?? [],
    metaDescription: signal?.description || undefined,
    textExcerpt: signal?.articleSnippet ?? '',
    dwellSeconds: ctx.timeOnCurrentDomainSec,
    scrollDepthPercent: signal?.scrollDepthPercent ?? 50,
    isMediaPlaying: signal?.isMediaPlaying ?? false,
    timestamp: Date.now(),
  };
}

/**
 * Evaluates the user's browsing context strictly using real AI reasoning.
 * Zero Fallbacks Policy: Enforces real LLM execution via Cloud API or FocusMonitorAgent.
 */
export async function decideOrganismReaction(
  ctx: BrowserContext,
  sprint: FocusSprint,
  config: OrganismConfig,
  forcePoke = false,
): Promise<{
  shouldReact: boolean;
  state: OrganismState;
  remark?: string;
  triggerEffect: boolean;
  intensity: number;
  isConfigured: boolean;
  /** Focus classification for the memory loop (episode recording). */
  status: import('@gremlin/shared').AgentFocusStatus;
  /** Chosen response kind — `observe` means deliberately silent. */
  intervention: import('@gremlin/shared').InterventionKind;
  escalationDelta?: number;
}> {
  const startTime = performance.now();

  // Update telemetry: evaluation in progress
  const currentTelemetry = await telemetryStorage.getValue();
  await telemetryStorage.setValue({
    ...currentTelemetry,
    isEvaluating: true,
    nextEvaluationAt: Date.now() + 45000,
  });

  try {
    const workingContext = await agentOrchestrator.memoryStore.getWorkingContext(
      buildBreadcrumb(ctx),
      ctx.recentHistory.map((h) => ({
        domain: h.domain,
        title: h.title,
        dwellSeconds: h.dwellSeconds,
        scrollDepthPercent: 50,
        isMediaPlaying: false,
        timestamp: h.timestamp,
      })),
    );

    // Prepare BYOK or cloud authentication headers
    const headers: Record<string, string> = {
      'x-requested-with': 'Gremlin-Browser-Extension',
    };
    const byokKey = config.byokApiKey?.trim() || config.selfHostedApiKey?.trim();
    const byokEndpoint = config.byokEndpoint?.trim() || config.selfHostedEndpoint?.trim();
    const byokModel = config.byokModel?.trim() || config.selfHostedModel?.trim();

    if (byokKey || config.provider === 'ollama') {
      if (byokKey) headers['x-byok-key'] = byokKey;
      headers['x-byok-provider'] = config.provider || 'google';
      if (byokModel) {
        headers['x-byok-model'] = byokModel;
      }
      if (byokEndpoint) {
        headers['x-byok-endpoint'] = byokEndpoint;
      }
    }

    const res = await api.api.sprint.evaluate.$post(
      {
        json: {
          sprint: workingContext.sprint,
          goals: workingContext.activeGoals,
          notes: workingContext.recentNotes,
          companionId: config.organismId,
          currentTab: workingContext.currentTab,
          timeline: workingContext.timeline,
          elapsedSprintMinutes: workingContext.elapsedSprintMinutes,
          localTime: workingContext.localTime,
          isContinuousFlow: Boolean(sprint.isContinuousFlow),
        },
      },
      {
        headers,
      },
    );

    const latencyMs = Math.round(performance.now() - startTime);

    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data) {
        const evalData: EvaluationResult = json.data;
        const focusScore = Math.round((1 - evalData.divergenceScore) * 100);
        const updatedHistory = [
          ...(currentTelemetry.history || []).slice(-19),
          {
            timestamp: Date.now(),
            score: focusScore,
            status: evalData.status,
            domain: ctx.currentDomain,
          },
        ];

        await telemetryStorage.setValue({
          isEvaluating: false,
          lastEvaluatedAt: Date.now(),
          nextEvaluationAt: Date.now() + 45000,
          lastStatus: evalData.status,
          lastScore: focusScore,
          lastReasoning: evalData.reasoning,
          lastRemark: evalData.remark ?? undefined,
          lastDomain: ctx.currentDomain,
          latencyMs,
          history: updatedHistory,
        });

        const isOffTask =
          evalData.status === 'distracted' || evalData.status === 'exploring_tangent';

        return {
          shouldReact: isOffTask && evalData.intervention !== 'observe',
          state: evalData.mood,
          remark: evalData.remark,
          triggerEffect:
            isOffTask &&
            (evalData.visualEffect === 'vignette' || evalData.visualEffect === 'screen_shake'),
          intensity: evalData.divergenceScore,
          isConfigured: true,
          status: evalData.status,
          intervention: evalData.intervention,
          escalationDelta: evalData.escalationDelta,
        };
      }
    } else if (res.status === 403) {
      const errorJson = (await res.json().catch(() => ({}))) as { message?: string };
      const remark = errorJson?.message || 'Add an API key in Settings or upgrade to Gremlin Pro ($5/mo).';
      await telemetryStorage.setValue({
        ...currentTelemetry,
        isEvaluating: false,
        lastReasoning: remark,
      });

      return {
        shouldReact: true,
        state: 'confused',
        remark,
        triggerEffect: false,
        intensity: 0,
        isConfigured: false,
        status: 'resting_or_idle',
        intervention: 'nudge',
        escalationDelta: 0,
      };
    } else if (res.status === 401) {
      await telemetryStorage.setValue({
        ...currentTelemetry,
        isEvaluating: false,
        lastReasoning: 'Signed out of Gremlin Cloud. Please sign in again or add an API key.',
      });

      return {
        shouldReact: true,
        state: 'confused',
        remark: 'Signed out of Gremlin Cloud. Please sign in again or add an API key.',
        triggerEffect: false,
        intensity: 0,
        isConfigured: false,
        status: 'resting_or_idle',
        intervention: 'nudge',
        escalationDelta: 0,
      };
    }
  } catch (err) {
    console.error('[Gremlin Evaluation Engine Error]:', err);
    await telemetryStorage.setValue({
      ...currentTelemetry,
      isEvaluating: false,
    });
  }

  // Fallback when backend is unreachable or offline
  return {
    shouldReact: forcePoke,
    state: forcePoke ? 'confused' : 'idle',
    remark: forcePoke ? 'Local worker offline. Start `pnpm dev` in apps/backend.' : undefined,
    triggerEffect: false,
    intensity: 0,
    isConfigured: false,
    status: 'on_task',
    intervention: 'observe',
    escalationDelta: 0,
  };
}

export async function testAiConnection(options: {
  provider: SupportedAiProvider;
  apiKey?: string;
  endpoint?: string;
  model?: string;
}): Promise<{ ok: boolean; message: string }> {
  try {
    const aiModel = resolveLanguageModel(options);
    const result = await generateText({
      model: aiModel,
      prompt: 'Respond with the single word "Ready".',
    });
    return { ok: true, message: `Connected to ${options.model || options.provider}: ${result.text.trim()}` };
  } catch (err: any) {
    return { ok: false, message: err?.message || 'Connection failed' };
  }
}


