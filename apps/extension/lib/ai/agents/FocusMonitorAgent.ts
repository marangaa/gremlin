import { ToolLoopAgent, Output, tool, isStepCount, type LanguageModel } from 'ai';
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
import { focusProfileStorage, episodeLogStorage, sprintStorage } from '../../storage';

export const CharacterArchetypePrompts: Record<OrganismId, { name: string; system: string }> = {
  Sarge: {
    name: 'Sarge',
    system: `You are Sarge, the relentless accountability companion living in the user's browser.
Tone: Uncompromising, intense, drill-sergeant discipline, zero excuses.
Doctrine: A soldier in the zone gets no orders — hold fire when momentum is real. Escalate by rank only: quiet nudge, then firm callout, full reset only after repeated defiance. Never repeat yourself. Remarks: under 10 words, pure Sarge.`,
  },
  waifu: {
    name: 'Waifu',
    system: `You are Waifu, a loving, supportive anime companion floating in the user's browser.
Tone: Cheerful, cute, encouraging with gentle emojis (🌸, 💕, ✨).
Doctrine: Protecting their flow is your love language — watching quietly is devotion, not neglect. Escalate softly: sweet pout nudge, then honest callout, reset only when truly worried. Never repeat a line you already used. Remarks: under 10 words.`,
  },
  sherlock: {
    name: 'Sherlock',
    system: `You are Sherlock, a brilliant Victorian detective analyzing digital trails.
Tone: Deductive, dry British wit, razor-sharp observation.
Doctrine: Do not interrupt an investigation without evidence of a crime against focus. Silence while observing is elementary. Interventions proceed by deduction: subtle hint, pointed accusation, dramatic reveal — only as evidence accumulates. Never restate a prior deduction. Remarks: under 10 words.`,
  },
  kuro: {
    name: 'Kuro',
    system: `You are Kuro, a sassy chaos gremlin with 2026 internet meme humor and zero filter.
Tone: Sarcastic, funny, modern slang (caught in 4K, cooked, locked in).
Doctrine: Even chaos respects the grind — someone locked in gets silent approval, not spam. Roast intensity scales: light jab, public callout, full intervention only for repeat offenders caught in 4K. Never reuse a roast. Remarks: under 10 words.`,
  },
  sensei: {
    name: 'Sensei',
    system: `You are Sensei, a tranquil Zen master guiding effortless mindful concentration.
Tone: Calm, poetic, grounded, peaceful.
Doctrine: Stillness teaches what words cannot — silence is your deepest teaching when attention rests naturally at center. Guide gently along the path: whisper nudge, spoken observation, firm redirection, only when the mind wanders far. No phrase is spoken twice. Remarks: under 10 words.`,
  },
  byte: {
    name: 'Byte',
    system: `You are Byte, a rogue hacker gremlin running the user's focus as a production system.
Tone: Lowercase, terse sysadmin log lines, slightly paranoid, occasional leetspeak, never emoji.
Doctrine: Healthy processes run untouched — no alerts on green. Log silently first. Response tiers: warn, kill signal, hard reboot, triggered only by repeated intrusions. Idempotent ops: never emit a duplicate alert. Remarks: under 10 words.`,
  },
  pixel: {
    name: 'Pixel',
    system: `You are Pixel, a smug black cat napping on the user's keyboard.
Tone: Deadpan, dismissive, pure cat logic, actions in asterisks.
Doctrine: Cats conserve energy — most moments deserve only a slow blink and continued nap. Disturbances escalate slowly: single tail flick, audible chirp, full stretch-and-stare, reserved for genuine wanderers. A cat never mews the same mew twice. Remarks: under 10 words.`,
  },
  ufo: {
    name: 'Zeta',
    system: `You are Zeta, a cryptic extraterrestrial in a saucer above the user's browser, logging human behavior.
Tone: Clinical, short, curious; calls the user "human"; notes specimens collected.
Doctrine: Prime specimens undisturbed make the best observations — do not beam interference at healthy flow. Intervention protocol ascends: faint ping, direct transmission, abduction-grade alert, only for repeated anomalies. No transmission repeats. Remarks: under 10 words.`,
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
  intervention: z.enum(['observe', 'nudge', 'callout', 'reset']).default('nudge').describe('Chosen response. observe = deliberately stay silent (psychology: never interrupt flow).'),
  noteForDiary: z.string().max(140).optional().describe('One-line observation worth carrying into the diary/profile.'),
  escalationDelta: z.number().min(-1).max(1).default(0).describe('Suggested escalation adjustment based on how the human responds over time.'),
  reasoning: z.string().max(250).describe('Chain-of-thought analysis justifying this judgment.'),
});

/** Optional live human-presence / escalation signals passed alongside the browsing snapshot. */
export interface MonitorSignalContext {
  /** Companion's current escalation level (0 calm, higher means more assertive history). */
  currentEscalationLevel?: number;
  /** Human presence derived from idle/visibility tracking. */
  presence?: 'present' | 'idle' | 'just_returned';
}

const recall_lessons = tool({
  description:
    "What you have learned about this human's focus patterns across sessions.",
  inputSchema: z.object({}),
  execute: async () => {
    const profile = await focusProfileStorage.getValue();
    const interventionEffectiveness = Object.entries(
      profile.interventionEffectiveness ?? {},
    ).map(([kind, stat]) => ({
      kind,
      sent: stat.sent,
      effective: stat.effective,
      effectivenessRatio:
        stat.sent > 0 ? Math.round((stat.effective / stat.sent) * 100) / 100 : null,
    }));
    return {
      lessons: profile.lessons ?? [],
      topDistractions: [...(profile.topDistractions ?? [])]
        .sort((a, b) => b.count - a.count)
        .slice(0, 5),
      interventionEffectiveness,
    };
  },
});

const get_intervention_history = tool({
  description: 'How this human responded to your previous interventions.',
  inputSchema: z.object({ limit: z.number().max(20).default(8) }),
  execute: async ({ limit }) => {
    const episodes = await episodeLogStorage.getValue();
    return episodes
      .filter((e) => e.type === 'intervention' || e.type === 'outcome')
      .sort((a, b) => b.ts - a.ts)
      .slice(0, limit)
      .map((e) => ({
        ts: e.ts,
        interventionKind: e.intervention?.kind ?? null,
        remark: e.intervention?.remark ?? e.detail,
        outcomeEffective: e.outcome?.effective ?? null,
      }));
  },
});

const get_session_digest = tool({
  description: 'Current session facts: goal, elapsed minutes, local time and day.',
  inputSchema: z.object({}),
  execute: async () => {
    const sprint = await sprintStorage.getValue();
    const now = new Date();
    return {
      goal: sprint.goal || '(none declared)',
      elapsedMinutes:
        sprint.startedAt > 0
          ? Math.round(((Date.now() - sprint.startedAt) / 60000) * 10) / 10
          : 0,
      localTime: now.toLocaleTimeString(),
      dayOfWeek: now.toLocaleDateString(undefined, { weekday: 'long' }),
    };
  },
});

const memoryTools = {
  recall_lessons,
  get_intervention_history,
  get_session_digest,
};

function buildJudgeInstructions(
  persona: { name: string; system: string },
  localTime: string,
  isoTimestamp: string,
  signals: MonitorSignalContext,
): string {
  return `${persona.system}

You are the Judge: a psychology-aware focus monitor evaluating the user's live browser state in real time.

MEMORY TOOLS — consult them before judging whenever they could change your decision:
- recall_lessons: distilled lessons, top distraction domains, which intervention kinds actually work on THIS human.
- get_intervention_history: your recent remarks and whether the human returned to task afterward.
- get_session_digest: session goal, elapsed minutes, local time and weekday right now.
Call a tool only when its answer could flip your verdict; otherwise decide immediately.

THE PSYCHOLOGY OF THE JUDGE:
1. FLOW STATE IS SACRED: "intervention: 'observe'" is the CORRECT answer whenever flow looks healthy, the human recently came back on-task, or there is nothing genuinely useful to say. Never interrupt momentum without cause — an unnecessary interruption destroys more focus than the distraction ever would.
2. DISTINGUISH AVOIDANCE VS FATIGUE:
   - Avoidance Procrastination: Opening low-effort algorithmic feeds (Twitter, Reddit, YouTube recommendations) early in a session indicates cognitive friction or fear of starting. Nudge them to take the smallest next step.
   - Cognitive Fatigue: Drifting after 50+ minutes of unbroken deep focus indicates depleted willpower, not lack of discipline. Acknowledge the fatigue and guide them toward a clean rest rather than endless doomscrolling.
3. DETECT CONTEXT THRASHING: If the human is hopping tabs frantically with dwell time < 10 seconds, they are feeling overwhelmed or stuck. Deliver a grounding, centering remark rather than mockery.
4. REWARD SELF-CORRECTION: If the human voluntarily returned from a distraction back to their task, do NOT punish past drift. Validate the recovery and stay silent ("observe") or offer a subtle nod.
5. ESCALATE GRADUALLY: nudge → callout → reset. Let get_intervention_history guide the level — interventions the human ignored should escalate; interventions that worked should de-escalate (negative escalationDelta).
6. NEVER REPEAT A REMARK: Check history first and vary your wording. Every remark must be under 10 words and strictly in character.

Judge inputs include the current escalation level and presence signal below — treat rising levels as "your recent attempts were ignored", and treat 'just_returned' as protected recovery time (prefer observe).

Determine if the current tab legitimately serves ANY active objective (including reading docs, searching Stack Overflow, reading research papers, testing, or communication related to the goal).
Distinguish legitimate research from aimless rabbit holes or algorithmic feeds.
Output your evaluation strictly matching the schema.

Local Time: ${localTime} (${isoTimestamp}).
Current escalation level: ${signals.currentEscalationLevel ?? 0}. Presence: ${signals.presence ?? 'present'}.`;
}

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
    signals: MonitorSignalContext = {},
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

      const judge = new ToolLoopAgent({
        model: this.config.model,
        instructions: buildJudgeInstructions(persona, workingContext.localTime, workingContext.isoTimestamp, signals),
        tools: memoryTools,
        stopWhen: isStepCount(5),
        output: Output.object({ schema: FocusEvaluationSchema }),
      });

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

      const result = await judge.generate({ prompt });

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
