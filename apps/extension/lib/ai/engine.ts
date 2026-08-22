import { generateText } from 'ai';
import { z } from 'zod';
import { type BrowserContext } from '../events/tracker';
import {
  type FocusSprint,
  type OrganismConfig,
  type AiTelemetryTrace,
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
 * Helper to record execution telemetry into persistent storage.
 */
async function recordTelemetryTrace(trace: Omit<AiTelemetryTrace, 'id' | 'timestamp'>) {
  try {
    const current = await telemetryStorage.getValue();
    const newTrace: AiTelemetryTrace = {
      id: `trace_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now(),
      ...trace,
    };
    await telemetryStorage.setValue([newTrace, ...current.slice(0, 49)]);
  } catch {
    // Ignore
  }
}

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
}> {
  const startTime = performance.now();

  // 1. CLOUD MODE: Send rolling window to Hono Backend
  if (config.mode === 'cloud') {
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

      const res = await api.api.sprint.evaluate.$post({
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
      });

      const latencyMs = Math.round(performance.now() - startTime);

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          const evalData: EvaluationResult = json.data;

          await recordTelemetryTrace({
            functionId: 'cloud:sprint.evaluate',
            provider: 'gremlin-cloud',
            model: 'hosted-edge',
            latencyMs,
            promptTokens: 0,
            completionTokens: 0,
            totalTokens: 0,
            goal: sprint.goal,
            activeDomain: ctx.currentDomain,
            activeTitle: ctx.currentTitle,
            status: evalData.status,
            mood: evalData.mood,
            remark: evalData.remark,
            reasoning: evalData.reasoning,
          });

          return {
            shouldReact: evalData.status !== 'on_task' || forcePoke,
            state: evalData.mood,
            remark: evalData.remark,
            triggerEffect: evalData.visualEffect === 'vignette' || evalData.visualEffect === 'screen_shake',
            intensity: evalData.divergenceScore,
            isConfigured: true,
          };
        }
      }
    } catch {
      // Cloud unreachable
    }
  }

  // 2. SELF-HOSTED / BYOK MODE: FocusMonitorAgent
  const focusAgent = await agentOrchestrator.getFocusMonitor(config.organismId);
  const breadcrumb = buildBreadcrumb(ctx);

  const timeline = ctx.recentHistory.map((h) => ({
    domain: h.domain,
    title: h.title,
    dwellSeconds: h.dwellSeconds,
    scrollDepthPercent: 50,
    isMediaPlaying: false,
    timestamp: h.timestamp,
  }));

  const result = await focusAgent.evaluate(breadcrumb, timeline, forcePoke);

  if (result.success) {
    const decision = result.data;
    const latencyMs = result.executionTimeMs;

    await recordTelemetryTrace({
      functionId: 'ai-agent:focusMonitor',
      provider: config.provider || 'google',
      model: config.selfHostedModel || 'default',
      latencyMs,
      promptTokens: result.usage?.inputTokens ?? 0,
      completionTokens: result.usage?.outputTokens ?? 0,
      totalTokens: result.usage?.totalTokens ?? 0,
      goal: sprint.goal,
      activeDomain: ctx.currentDomain,
      activeTitle: ctx.currentTitle,
      status: decision.status,
      mood: decision.mood,
      remark: decision.remark,
      reasoning: decision.reasoning,
    });

    return {
      shouldReact: decision.status !== 'on_task' || forcePoke,
      state: decision.mood,
      remark: decision.remark,
      triggerEffect: decision.visualEffect === 'vignette' || decision.visualEffect === 'screen_shake',
      intensity: decision.divergenceScore,
      isConfigured: true,
    };
  }

  // 3. UNCONFIGURED STATE: Honest feedback with zero fallbacks
  return {
    shouldReact: forcePoke,
    state: forcePoke ? 'confused' : 'idle',
    remark: forcePoke ? 'Add API key in Settings to activate AI tracking.' : undefined,
    triggerEffect: false,
    intensity: 0,
    isConfigured: false,
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
