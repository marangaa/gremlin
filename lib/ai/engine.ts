import { generateObject } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { z } from 'zod';
import { CHARACTER_PROMPTS } from './prompts';
import { type OrganismId } from '../personalities/types';
import { type BrowserContext } from '../events/tracker';
import { type FocusSprint, type OrganismConfig } from '../storage';
import { type SituationEvaluation } from '../events/heuristics';

export const OrganismDecisionSchema = z.object({
  shouldReact: z.boolean(),
  state: z.enum([
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
  remark: z.string().max(45).optional(),
  triggerEffect: z.boolean().default(false),
  intensity: z.number().min(0).max(1),
});

export type OrganismDecision = z.infer<typeof OrganismDecisionSchema>;

export async function decideOrganismReaction(
  ctx: BrowserContext,
  sprint: FocusSprint,
  config: OrganismConfig,
  situation: SituationEvaluation,
): Promise<OrganismDecision> {
  const promptConfig = CHARACTER_PROMPTS[config.organismId] || CHARACTER_PROMPTS.nexus;

  // 1. Self-Hosted Mode with configured endpoint OR Cloud Mode with user key
  const hasEndpoint =
    (config.mode === 'self-hosted' && config.selfHostedEndpoint) ||
    Boolean(config.selfHostedApiKey);

  if (hasEndpoint) {
    try {
      const openai = createOpenAI({
        apiKey: config.selfHostedApiKey || 'dummy-key',
        baseURL: config.selfHostedEndpoint || 'http://localhost:11434/v1',
      });

      const aiModel = openai(config.selfHostedModel || 'llama3');

      const compactContext = {
        character: config.name,
        currentSprint: sprint.status === 'active' ? sprint.goal : undefined,
        currentDomain: ctx.currentDomain,
        currentTitle: ctx.currentTitle.slice(0, 50),
        timeOnCurrentDomainSec: ctx.timeOnCurrentDomainSec,
        recentDomains: ctx.recentDomains,
        situationTrigger: situation.trigger,
        situationReason: situation.reason,
      };

      const system = `You are ${promptConfig.identity}
Tone: ${promptConfig.tone}
Rules:
- Never use robotic/cyber clichés ("telemetry vector", "sub-optimal cycle", "protocols").
- Keep remarks under 8 words. Be natural, witty, and characterful.
- Decide if a visual distraction screen effect should trigger (triggerEffect: true if on a distracting site during active sprint).`;

      const prompt = `Context:
${JSON.stringify(compactContext, null, 2)}

Respond with structured JSON matching the schema.`;

      const result = await generateObject({
        model: aiModel,
        schema: OrganismDecisionSchema,
        system,
        prompt,
      });

      return result.object;
    } catch (err) {
      console.warn('[AI Organism] Inference fallback:', err);
    }
  }

  // 2. Intelligent Offline Fallback
  const triggerRemarks =
    promptConfig.fallbackRemarks[situation.trigger] ||
    promptConfig.fallbackRemarks.GOAL_DIVERGENCE ||
    [];

  const remark =
    triggerRemarks.length > 0
      ? triggerRemarks[Math.floor(Math.random() * triggerRemarks.length)]
      : undefined;

  const shouldTriggerEffect = situation.trigger === 'GOAL_DIVERGENCE';

  return {
    shouldReact: situation.trigger !== 'NONE',
    state: situation.recommendedState,
    remark,
    triggerEffect: shouldTriggerEffect,
    intensity: situation.confidence,
  };
}
