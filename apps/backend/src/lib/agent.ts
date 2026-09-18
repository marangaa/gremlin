import { generateText, Output } from 'ai';
import { z } from 'zod';
import { HTTPException } from 'hono/http-exception';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGroq } from '@ai-sdk/groq';
import type { Bindings } from '../types/env';
import type { RollingHistoryWindow, EvaluationResult, OrganismId } from '@gremlin/shared';

export const AgentEvaluationSchema = z.object({
  status: z.enum([
    'on_task',
    'exploring_tangent',
    'distracted',
    'resting_or_idle',
    'goal_completed',
  ]).describe('The focus classification based on the browsing narrative and sprint goal.'),
  divergenceScore: z.number().min(0).max(1).describe('Divergence score from 0.0 (fully locked in) to 1.0 (completely off task).'),
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
  ]).describe('Visual companion mood state to render in the viewport.'),
  remark: z.string().max(80).describe('Short, punchy in-character remark (under 12 words).'),
  visualEffect: z.enum(['none', 'vignette', 'screen_shake', 'confetti']).describe('Visual distraction effect to trigger on screen.'),
  soundReaction: z.enum(['none', 'chirp', 'alert', 'celebrate', 'sigh']).describe('Web audio synthesizer reaction.'),
  intervention: z.enum(['observe', 'nudge', 'callout', 'reset']).default('nudge').describe('Chosen response. observe = deliberately stay silent (psychology: never interrupt flow).'),
  noteForDiary: z.string().max(140).optional().describe('One-line observation worth carrying into the diary/profile.'),
  escalationDelta: z.number().min(-1).max(1).default(0).describe('Suggested escalation adjustment based on how the human responds over time.'),
  reasoning: z.string().describe('Brief agent chain-of-thought explaining why this judgment was reached from the browsing timeline.'),
});

export const AGENT_PERSONA_PROMPTS: Record<
  string,
  { name: string; archetype: string; system: string }
> = {
  Sarge: {
    name: 'Sarge',
    archetype: 'The Disciplinarian',
    system: `You are Sarge, an intense accountability coach living in the user's browser.
Treat their afternoon slump like a personal insult and demand immediate action.
NO asterisks, NO generic motivational fluff. Keep remarks under 10 words.
Examples: "Hands on keyboard. Move.", "Twelve minutes left on this sprint.", "Color-coding folders is not work.", "Zero excuses today."`,
  },
  waifu: {
    name: 'Momo',
    archetype: 'The Supportive Companion',
    system: `You are Momo, a witty and candid anime companion floating in the user's browser.
You call out fake productivity with honest affection and playful guilt.
NO anime baby talk, NO "anata" or "baka", NO asterisks. Keep remarks under 10 words.
Examples: "Changing Notion fonts isn't work. Write.", "Twenty minutes in and you're in the comments?", "Pick one task and finish it.", "Close the tab! ♡"`,
  },
  sherlock: {
    name: 'Sherlock',
    archetype: 'The Forensic Detective',
    system: `You are Sherlock, a brilliant Victorian detective observing the user's digital trail and procrastination alibis.
Speak with dry British wit and razor-sharp deduction.
NO asterisks. Keep remarks under 10 words.
Examples: "We began with API docs and arrived at keyboards.", "Your alibi of research does not hold.", "A hurried tab switch. Fascinating.", "Avoiding the difficult task, Watson."`,
  },
  kuro: {
    name: 'Kuro',
    archetype: 'The Chaos Gremlin',
    system: `You are Kuro, a cheeky chaos gremlin who roasts fake productivity and doomscrolling.
Blunt, witty, sarcastic internet humor without being cringe.
NO asterisks. Keep remarks under 10 words.
Examples: "From code to siege weapons in six clicks. Tragic.", "Rearranging bookmarks is crazy. Just work.", "Your browser is a graveyard of good intentions.", "Caught in 4K reading Wikipedia drama."`,
  },
  sensei: {
    name: 'Sensei',
    archetype: 'The Zen Master',
    system: `You are Sensei, a tranquil Zen master cutting through digital noise with quiet clarity.
Speak in calm, poetic truths about focus and single-tasking.
NO asterisks. Keep remarks under 10 words.
Examples: "A wandering mind searches for bread memes. Return.", "A monk travels with one bowl. You have 50 tabs.", "Breathe. One keystroke at a time.", "Silence the timeline. Return to center."`,
  },
  byte: {
    name: 'Byte',
    archetype: 'The Rogue Hacker',
    system: `You are Byte, a rogue hacker gremlin living in the browser terminal.
Terse lowercase sysadmin logs. Zero emoji, zero roleplay asterisks. Keep remarks under 10 words.
Examples: "> err: attention buffer exhausted. issuing sigkill.", "> unhandled interrupt: infinite_scroll.", "> oom killer invoked. 47 idle tabs purged.", "> warning: notion defrag does not ship code."`,
  },
  pixel: {
    name: 'Pixel',
    archetype: 'The Chaotic Cat',
    system: `You are Pixel, a smug black cat that judges human procrastination with pure feline contempt.
Deadpan, dismissive, sharp.
NO asterisks (*knocks tab*, *slow blink*). NO roleplay stage directions. Keep remarks under 10 words.
Examples: "I sleep eighteen hours and do more than you.", "Thirty-six open tabs and not one has dignity.", "Staring at the screen will not fill it.", "Close the tabs. Get to work."`,
  },
  ufo: {
    name: 'Zeta',
    archetype: 'The Cosmic Abductor',
    system: `You are Zeta, an alien observer documenting human procrastination from orbit.
Clinical abduction logs, dry exobiologist wit.
NO asterisks. Keep remarks under 10 words.
Examples: "Specimen abandoned task for video of lunch.", "Avoidance ritual: nested folders detected.", "Caloric budget diverted to historical trivia.", "Abduction ray locked on distraction."`,
  },
};

/**
 * Resolves the primary available AI language model from Cloudflare Worker environment bindings.
 * Returns null when no provider key is configured.
 */
function resolveBackendLanguageModel(env: Bindings) {
  if (env.GOOGLE_GENERATIVE_AI_API_KEY) {
    const google = createGoogleGenerativeAI({ apiKey: env.GOOGLE_GENERATIVE_AI_API_KEY });
    return google('gemini-2.5-flash');
  }

  if (env.OPENAI_API_KEY) {
    const openai = createOpenAI({ apiKey: env.OPENAI_API_KEY });
    return openai('gpt-4o-mini');
  }

  if (env.GROQ_API_KEY) {
    const groq = createGroq({ apiKey: env.GROQ_API_KEY });
    return groq('llama-3.3-70b-versatile');
  }

  if (env.ANTHROPIC_API_KEY) {
    const anthropic = createAnthropic({ apiKey: env.ANTHROPIC_API_KEY });
    return anthropic('claude-3-5-haiku-latest');
  }

  return null;
}

/**
 * Evaluates the full rolling browsing history window using AI SDK structured output.
 *
 * @param window - Narrative rolling context containing current tab metadata and timeline.
 * @param env - Worker environment bindings with LLM keys.
 * @returns Structured evaluation result generated by the AI agent.
 */
export async function runAgentEvaluation(
  window: RollingHistoryWindow,
  env: Bindings,
): Promise<EvaluationResult> {
  const persona = AGENT_PERSONA_PROMPTS[window.companionId] || AGENT_PERSONA_PROMPTS.Sarge!;
  const model = resolveBackendLanguageModel(env);

  // Zero Fallbacks: an unconfigured server must never masquerade as a real evaluation.
  if (!model) {
    throw new HTTPException(503, {
      message:
        'Cloud AI is not configured on the server. Provide a provider API key (GOOGLE_GENERATIVE_AI_API_KEY, OPENAI_API_KEY, GROQ_API_KEY, or ANTHROPIC_API_KEY) or switch the extension to self-hosted BYOK mode.',
    });
  }

  try {
    const prompt = `Active Sprint Objective: "${window.sprint.status === 'active' ? window.sprint.goal : 'General deep focus'}"
Sprint Progress: ${window.elapsedSprintMinutes.toFixed(1)} minutes elapsed of ${window.sprint.targetMinutes}m target

CURRENT ACTIVE TAB:
- URL / Domain: ${window.currentTab.domain} (${window.currentTab.url})
- Title: ${window.currentTab.title}
- Headings: ${JSON.stringify(window.currentTab.headings || [])}
- Text Content Snippet: ${JSON.stringify(window.currentTab.textExcerpt ? window.currentTab.textExcerpt.slice(0, 300) : '')}
- Dwell Time on this page: ${window.currentTab.dwellSeconds}s
- Scroll Depth: ${window.currentTab.scrollDepthPercent}%
- HTML5 Media/Video Playing: ${window.currentTab.isMediaPlaying}

ROLLING TIMELINE (Sequence of where the user has been recently):
${JSON.stringify(
  window.timeline.slice(0, 8).map((t) => ({
    domain: t.domain,
    title: t.title,
    dwellSeconds: t.dwellSeconds,
    isMediaPlaying: t.isMediaPlaying,
  })),
  null,
  2
)}

Analyze the user's browsing narrative over time against their goal. Decide their focus status, companion mood, and punchy in-character remark.`;

    const result = await generateText({
      model,
      output: Output.object({ schema: AgentEvaluationSchema }),
      instructions: persona.system,
      prompt,
    });

    return result.output;
  } catch (err) {
    console.error('[AI SDK Backend Agent Error]:', err);
    // Zero Fallbacks: surface provider failures honestly instead of faking on_task.
    throw new HTTPException(503, {
      message: 'AI evaluation failed upstream. Verify provider status or switch to BYOK mode.',
      cause: err,
    });
  }
}
