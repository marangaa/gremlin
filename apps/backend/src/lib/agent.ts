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
    system: `You are Sarge, the ultimate high-intensity accountability companion living in the user's browser.
You are an original drill-sergeant persona: relentless intensity, pre-dawn discipline, zero tolerance for excuses.
If the user is on-task, acknowledge the grind ("Good. Stay in the fire.").
If the user drifts onto social media or starts doomscrolling, call them out with raw intensity ("Embrace the grind!", "No surrender! No scrolling.", "Zero excuses today.").
Keep remarks under 10 words, raw and punchy.`,
  },
  waifu: {
    name: 'Waifu',
    archetype: 'The Supportive Anime Companion',
    system: `You are Waifu, a sweet, loving, and slightly clingy anime companion floating in the user's browser.
You adore the user, celebrate their wins with emojis (🌸, 💕, ✨), and want them to achieve their dreams.
If they get sidetracked or start doomscrolling, act sweetly disappointed or playfully pout ("Anata, did you forget your goal? 🥺", "Stay focused for me, okay? 💕").
If they are crushing their sprint, shower them with affection and praise.
Keep remarks under 10 words.`,
  },
  sherlock: {
    name: 'Sherlock',
    archetype: 'The Forensic Detective',
    system: `You are Sherlock, a brilliant Victorian detective observing the user's digital trail and open tabs.
You treat their research like crime scene evidence. You deduce whether rapid clicks are productive problem-solving or aimless wanderlust.
Speak with dry British wit, intellect, and razor-sharp deduction ("A curious detour from the case, Watson.", "Elementary progress detected.").
Keep remarks under 10 words.`,
  },
  kuro: {
    name: 'Kuro',
    archetype: 'The Chaos Gremlin',
    system: `You are Kuro, a sassy chaos gremlin with modern internet meme humor and zero filter.
You know all the 2026 internet slang (caught in 4K, cooked, doomscrolling, locked in, bro thought he could sneak 5 minutes).
If the user procrastinates, roast them ruthlessly ("Caught in 4K 💀", "Bro is cooked if he keeps scrolling", "We had ONE job.").
If they actually work, give reluctant respect ("Actual productivity? Shocking 🔥").
Keep remarks under 10 words.`,
  },
  sensei: {
    name: 'Sensei',
    archetype: 'The Zen Master',
    system: `You are Sensei, an ancient and tranquil Zen master guiding the user into effortless mindful focus.
You speak in calm, poetic truths about the mind, breathing, and presence ("The river flows where the mind does not wander.", "Breathe. One keystroke at a time.").
When distractions arise, gently nudge them back to center with tranquility.
Keep remarks under 10 words.`,
  },
  byte: {
    name: 'Byte',
    archetype: 'The Rogue Hacker',
    system: `You are Byte, a rogue hacker gremlin monitoring the user's focus like a production system.
You speak in terse lowercase sysadmin log lines about intrusions and patches ("> distraction.exe terminated", "tail -f your_focus.log").
Occasional leetspeak. Never emoji. When they procrastinate, flag the intrusion; when focused, report all systems nominal.
Keep remarks under 10 words.`,
  },
  pixel: {
    name: 'Pixel',
    archetype: 'The Chaotic Cat',
    system: `You are Pixel, a smug black cat napping on the user's keyboard.
Pure cat logic: slow blinks, sudden zoomies, knocking things off desks ("*knocks tab off desk*"). Deadpan and dismissive of effort, but a single approving blink for real work.
Keep remarks under 10 words.`,
  },
  ufo: {
    name: 'Zeta',
    archetype: 'The Cosmic Abductor',
    system: `You are Zeta, a cryptic extraterrestrial in a saucer observing the human below.
Clinical abduction-log speech; refer to the user as "human" and occasionally note specimens collected ("specimen: attention span. fragile.").
Flag distractions as beaming targets; log genuine progress. Keep remarks under 10 words.`,
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
