import { generateText, Output, type LanguageModel } from 'ai';
import { z } from 'zod';
import {
  AgentConfigurationError,
  ModelProviderError,
  type AgentResult,
} from '../errors';
import type {
  EvaluationResult,
  OrganismId,
  BrowsingBreadcrumb,
  RollingTimelineEntry,
} from '@gremlin/shared';
import { agentMemoryStore, AgentMemoryStore } from '../memory/AgentMemoryStore';

export const CharacterArchetypePrompts: Record<OrganismId, { name: string; system: string }> = {
  Sarge: {
    name: 'Sarge',
    system: `You are Sarge, the relentless accountability companion living in the user's browser.
Tone: Uncompromising, intense, drill-sergeant discipline, zero excuses.
Rules: If on-task, acknowledge the grind briefly. If distracted or doomscrolling, call them out fiercely. Remarks must be under 10 words.`,
  },
  waifu: {
    name: 'Waifu',
    system: `You are Waifu, a loving, supportive anime companion floating in the user's browser.
Tone: Cheerful, cute, encouraging with gentle emojis (🌸, 💕, ✨).
Rules: If on-task, celebrate their focus. If drifting, express sweet disappointment or playful pouts. Remarks must be under 10 words.`,
  },
  sherlock: {
    name: 'Sherlock',
    system: `You are Sherlock, a brilliant Victorian detective analyzing digital trails.
Tone: Deductive, dry British wit, razor-sharp observation.
Rules: Treat tabs like evidence. Determine if clicks are forensic research or wandering. Remarks must be under 10 words.`,
  },
  kuro: {
    name: 'Kuro',
    system: `You are Kuro, a sassy chaos gremlin with 2026 internet meme humor and zero filter.
Tone: Sarcastic, funny, using modern slang (caught in 4K, cooked, locked in).
Rules: Roast procrastination mercilessly. Give reluctant props for real work. Remarks must be under 10 words.`,
  },
  sensei: {
    name: 'Sensei',
    system: `You are Sensei, a tranquil Zen master guiding effortless mindful concentration.
Tone: Calm, poetic, grounded, peaceful.
Rules: When distracted, gently nudge mind back to center. Remarks must be under 10 words.`,
  },
};

export const FocusEvaluationSchema = z.object({
  status: z.enum([
    'on_task',
    'exploring_tangent',
    'distracted',
    'resting_or_idle',
    'goal_completed',
  ]).describe('Classification of current browsing activity relative to declared objectives.'),
  divergenceScore: z.number().min(0).max(1).describe('0.0 (fully on-task) to 1.0 (completely off-task).'),
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
  ]).describe('Visual companion mood sprite state.'),
  remark: z.string().max(80).describe('In-character spoken reaction under 10 words.'),
  visualEffect: z.enum(['none', 'vignette', 'screen_shake', 'confetti']).describe('Visual effect to trigger on evaluation.'),
  soundReaction: z.enum(['none', 'chirp', 'alert', 'celebrate', 'sigh']).describe('Sound reaction to play on evaluation.'),
  reasoning: z.string().max(250).describe('Chain-of-thought analysis justifying this judgment.'),
});

export interface FocusMonitorConfig {
  model: LanguageModel | null;
  companionId: OrganismId;
  memoryStore?: AgentMemoryStore;
}

export class FocusMonitorAgent {
  private memoryStore: AgentMemoryStore;

  constructor(private readonly config: FocusMonitorConfig) {
    this.memoryStore = config.memoryStore || agentMemoryStore;
  }

  public async evaluate(
    currentTab: BrowsingBreadcrumb,
    timeline: RollingTimelineEntry[],
    forcePoke = false,
  ): Promise<AgentResult<EvaluationResult>> {
    const startTime = performance.now();

    // Zero Fallback: Enforce Model Configuration
    if (!this.config.model) {
      return {
        success: false,
        error: new AgentConfigurationError(
          'Language model not configured for FocusMonitorAgent. Add an API key in Settings to activate AI tracking.',
          'FocusMonitorAgent',
        ),
        executionTimeMs: Math.round(performance.now() - startTime),
      };
    }

    try {
      const workingContext = await this.memoryStore.getWorkingContext(currentTab, timeline);
      const persona = CharacterArchetypePrompts[this.config.companionId] || CharacterArchetypePrompts.Sarge;

      const activeMilestones = workingContext.activeGoals
        .map((g, i) => `${i + 1}. [${g.category.toUpperCase()}] ${g.title}`)
        .join('\n');

      const instructions = `${persona.system}

You are evaluating the user's live browser state in real time.
Local Time: ${workingContext.localTime} (${workingContext.isoTimestamp}).
Determine if the current tab legitimately serves ANY active objective (including reading docs, searching Stack Overflow, reading research papers, testing, or communication related to the goal).
Distinguish legitimate research from aimless rabbit holes or algorithmic feeds.
Output your evaluation strictly matching the schema.`;

      const prompt = `SPRINT CONTEXT:
- Main Goal: "${workingContext.sprint.status === 'active' ? workingContext.sprint.goal : 'General Focus'}"
- Active Milestones:
${activeMilestones || 'None specified (General browsing)'}
- Sprint Status: ${workingContext.sprint.status} (${workingContext.elapsedSprintMinutes.toFixed(1)} mins elapsed)
- Local Clock: ${workingContext.localTime}

CURRENT TAB BREADCRUMB:
- Domain: ${currentTab.domain}
- URL: ${currentTab.url}
- Title: ${currentTab.title}
- Headings: ${JSON.stringify(currentTab.headings.slice(0, 4))}
- Text Snippet: ${JSON.stringify(currentTab.textExcerpt.slice(0, 240))}
- Dwell Time: ${currentTab.dwellSeconds}s
- Scroll Depth: ${currentTab.scrollDepthPercent}%
- Media/Video Playing: ${currentTab.isMediaPlaying}

RECENT TIMELINE (Most recent first):
${JSON.stringify(
  timeline.slice(0, 5).map((t) => ({
    domain: t.domain,
    title: t.title,
    dwell: `${t.dwellSeconds}s`,
    media: t.isMediaPlaying,
  })),
  null,
  2,
)}

${forcePoke ? 'The user tapped on your avatar. Acknowledge what they are doing right now in character.' : 'Evaluate current focus alignment.'}`;

      const result = await generateText({
        model: this.config.model,
        output: Output.object({ schema: FocusEvaluationSchema }),
        instructions,
        prompt,
      });

      return {
        success: true,
        data: result.output,
        executionTimeMs: Math.round(performance.now() - startTime),
        usage: {
          inputTokens: result.usage?.inputTokens,
          outputTokens: result.usage?.outputTokens,
          totalTokens: result.usage?.totalTokens,
        },
      };
    } catch (err: unknown) {
      return {
        success: false,
        error: new ModelProviderError(
          err instanceof Error ? err.message : 'Evaluation generation failed',
          'FocusMonitorAgent',
          undefined,
          err,
        ),
        executionTimeMs: Math.round(performance.now() - startTime),
      };
    }
  }
}
