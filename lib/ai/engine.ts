import { generateObject } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { z } from 'zod';
import { ORGANISM_MODELS, type OrganismId } from '../personalities/types';
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
  remark: z.string().max(50).optional(),
  intensity: z.number().min(0).max(1),
});

export type OrganismDecision = z.infer<typeof OrganismDecisionSchema>;

const FALLBACK_REMARKS: Record<
  OrganismId,
  Record<string, string[]>
> = {
  nexus: {
    GOAL_DIVERGENCE: ['Divergence logged on Reddit.', 'Workflow vector compromised.', 'Sub-optimal task detour.'],
    GOAL_RETURN: ['Primary sprint restored.', 'Execution cycle resumed.', 'Vector aligned.'],
    TAB_THRASHING: ['Context thrashing detected.', 'Consolidate active tabs.', 'Buffer overflow incoming.'],
    PROLONGED_FOCUS: ['Flow state verified: 100%.', 'High execution efficiency.', 'Sprint holding steady.'],
    HABITUAL_DISTRACTION: ['Telemetry indicates casual browsing.', 'Detour logged.'],
    MANUAL_POKE: ['Core active. Monitoring telemetry.', 'Diagnostic ping acknowledged.'],
  },
  cipher: {
    GOAL_DIVERGENCE: ['A suspicious detour.', 'Clues point to procrastination.', 'Noted in the casefile.'],
    GOAL_RETURN: ['The suspect returns to the task.', 'Resuming investigation.', 'Case back on track.'],
    TAB_THRASHING: ['Frantic search patterns detected.', 'Looking for an elusive clue?'],
    PROLONGED_FOCUS: ['Solid focus observed.', 'A clean line of inquiry.'],
    HABITUAL_DISTRACTION: ['A familiar destination.', 'Pattern recognized.'],
    MANUAL_POKE: ['What is the meaning of this intrusion?', 'Investigating your query.'],
  },
  aero: {
    GOAL_DIVERGENCE: ['Gentle reminder: your goal awaits 🌱', 'Let us take a mindful breath.'],
    GOAL_RETURN: ['Welcome back! You got this 💖', 'Flow state feels wonderful.'],
    TAB_THRASHING: ['One thought at a time ✨', 'Take it easy, breathe.'],
    PROLONGED_FOCUS: ['Beautiful sprint! Remember water 💧', 'Deep calm focus.'],
    HABITUAL_DISTRACTION: ['Exploring quietly.'],
    MANUAL_POKE: ['Greetings friend! 💕', 'Flowing alongside you.'],
  },
  kuro: {
    GOAL_DIVERGENCE: ['Reddit again? Really?', 'Caught red-handed.', 'We had ONE job.'],
    GOAL_RETURN: ['Look who decided to code.', 'Back to business, mortal.', 'Finally.'],
    TAB_THRASHING: ['Slow down, wizard.', 'Tab avalanche!', 'Are we lost?'],
    PROLONGED_FOCUS: ['Actual productivity? Shocking.', 'Look at you lock in!'],
    HABITUAL_DISTRACTION: ['Interesting scroll.', 'Wandering again?'],
    MANUAL_POKE: ['Hey! Stop poking me!', '👹 Rawr! Focus!'],
  },
  atlas: {
    GOAL_DIVERGENCE: ['Sprint timeline compromised.', 'Action item: return to objective.', 'Deviation noted.'],
    GOAL_RETURN: ['KPI trajectory restored.', 'Proceeding with deliverables.'],
    TAB_THRASHING: ['Context switching degrades efficiency.', 'Consolidate bandwidth.'],
    PROLONGED_FOCUS: ['Efficiency rating at 98%.', 'Exceeding target metrics.'],
    HABITUAL_DISTRACTION: ['Non-operational browsing detected.'],
    MANUAL_POKE: ['Protocol acknowledged. Ready for tasks.'],
  },
};

export async function decideOrganismReaction(
  ctx: BrowserContext,
  sprint: FocusSprint,
  config: OrganismConfig,
  situation: SituationEvaluation,
): Promise<OrganismDecision> {
  const model = ORGANISM_MODELS[config.organismId] || ORGANISM_MODELS.nexus;

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
        organism: model.name,
        archetype: model.archetype,
        currentSprint: sprint.status === 'active' ? sprint.goal : undefined,
        currentDomain: ctx.currentDomain,
        currentTitle: ctx.currentTitle.slice(0, 50),
        timeOnCurrentDomainSec: ctx.timeOnCurrentDomainSec,
        recentDomains: ctx.recentDomains,
        situationTrigger: situation.trigger,
        situationReason: situation.reason,
      };

      const prompt = `Context:
${JSON.stringify(compactContext, null, 2)}

Provide structured JSON matching the schema.
Keep remarks razor-sharp (under 8 words), characteristic of ${model.name}.`;

      const result = await generateObject({
        model: aiModel,
        schema: OrganismDecisionSchema,
        system: model.systemPrompt,
        prompt,
      });

      return result.object;
    } catch (err) {
      console.warn('[AI Organism] Inference failed, using heuristic fallback:', err);
    }
  }

  // 2. Intelligent Offline Fallback
  const triggerRemarks =
    FALLBACK_REMARKS[config.organismId]?.[situation.trigger] ||
    FALLBACK_REMARKS.nexus[situation.trigger] ||
    [];

  const remark =
    triggerRemarks.length > 0
      ? triggerRemarks[Math.floor(Math.random() * triggerRemarks.length)]
      : undefined;

  return {
    shouldReact: situation.trigger !== 'NONE',
    state: situation.recommendedState,
    remark,
    intensity: situation.confidence,
  };
}
