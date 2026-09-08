import { generateText, Output, type LanguageModel } from 'ai';
import { z } from 'zod';
import {
  AgentConfigurationError,
  ModelProviderError,
  type AgentResult,
} from '../errors';
import type {
  DailyDiary,
  CompanionDailyReflection,
  OrganismId,
} from '@gremlin/shared';
import { agentMemoryStore, AgentMemoryStore } from '../memory/AgentMemoryStore';
import { CharacterArchetypePrompts } from './FocusMonitorAgent';

export const DiaryReflectionOutputSchema = z.object({
  score: z.number().min(1).max(10).describe('Productivity focus score (1 to 10)'),
  headline: z.string().max(60).describe('Catchy, in-character summary title'),
  summary: z.string().max(400).describe('Honest recap of work accomplished, distractions faced, and momentum'),
  advice: z.string().max(180).describe('Direct, actionable coaching recommendation for tomorrow'),
  digitalSelfAwareness: z.object({
    researchMinutes: z.number().describe('Estimated minutes spent reading docs, researching, search, or browsing references today'),
    productionMinutes: z.number().describe('Estimated minutes spent actively creating, writing code/copy, or executing the primary task today'),
    mirrorInsight: z.string().max(200).describe('Brutally honest behavioral mirror: point of divergence, rabbit holes, or intention-action gap detected'),
  }).describe('Digital self-awareness metrics reflecting the intention-action gap'),
});

export interface DiarySynthesizerConfig {
  model: LanguageModel | null;
  companionId: OrganismId;
  memoryStore?: AgentMemoryStore;
}

export class DiarySynthesizerAgent {
  private memoryStore: AgentMemoryStore;

  constructor(private readonly config: DiarySynthesizerConfig) {
    this.memoryStore = config.memoryStore || agentMemoryStore;
  }

  public async synthesize(
    diary: DailyDiary,
    memory?: { episodeDigest: string; profileLessons: string[] },
  ): Promise<AgentResult<CompanionDailyReflection>> {
    const startTime = performance.now();

    // Zero Fallback: Enforce Model Configuration
    if (!this.config.model) {
      return {
        success: false,
        error: new AgentConfigurationError(
          'Language model not configured for DiarySynthesizerAgent. Provide an API key in Settings to synthesize daily reflections.',
          'DiarySynthesizerAgent',
        ),
        executionTimeMs: Math.round(performance.now() - startTime),
      };
    }

    try {
      const goals = await this.memoryStore.getGoals();
      const stats = await this.memoryStore.getFocusActivityStats();
      const persona = CharacterArchetypePrompts[this.config.companionId] || CharacterArchetypePrompts.Sarge;

      const system = `${persona.system}

You are writing the official End-of-Day Companion Diary Reflection for the user.
Review their actual work metrics, session duration, completed milestones, notes captured, and distraction detours.
Speak strictly in character. Deliver an honest, perceptive, witty, and motivating daily review.
Return structured JSON matching the schema.`;

      const prompt = `DAILY FOCUS SUMMARY:
- Date: ${diary.date}
- Total Deep Work Time: ${diary.totalFocusMinutes} minutes
- Focus Sessions Count: ${diary.sessions.length}
- Completed Milestones: ${diary.completedGoalsCount} of ${goals.length} total
- Smart Notes Captured: ${diary.notes.length}
- Distraction Detours / Alerts: ${diary.totalDetours}
- Context Switches (Tab/Task Switching): ${diary.contextSwitches ?? stats.divergences ?? 0} times
- Top Domains by Time:
${diary.topDomains.map((t) => `  • ${t.domain}: ${t.minutes}m`).join('\n') || '  • None recorded'}

SMART NOTES EXCERPTS:
${diary.notes.slice(0, 4).map((n) => `[${n.domain}] "${n.content}"`).join('\n') || 'None'}

EPISODE TIMELINE (interventions & outcomes):
${memory?.episodeDigest || 'None recorded'}

WHAT YOU HAVE LEARNED ABOUT THIS HUMAN:
${memory?.profileLessons.map((l) => `- ${l}`).join('\n') || 'Nothing yet — first days are for observing.'}

DIGITAL SELF-AWARENESS TASK:
Analyze the user's intention-action gap today:
1. Estimate researchMinutes (reading documentation, researching topics, reference hunting) vs productionMinutes (active building, writing, execution) based on their top domains and focus time.
2. Formulate a mirrorInsight: a candid, in-character reflection exposing their point of divergence or rabbit holes (e.g. "Spent 3 hours reading database benchmarks before writing a single migration").
3. Score focus (1-10), catchy headline, analytical summary, and tomorrow's actionable advice. Ground the advice in the episode timeline and lessons when available.`;

      const result = await generateText({
        model: this.config.model,
        output: Output.object({ schema: DiaryReflectionOutputSchema }),
        instructions: system,
        prompt,
      });

      const reflection: CompanionDailyReflection = {
        companionId: this.config.companionId,
        score: result.output.score,
        headline: result.output.headline,
        summary: result.output.summary,
        advice: result.output.advice,
        timestamp: Date.now(),
        digitalSelfAwareness: {
          contextSwitches: diary.contextSwitches || 0,
          researchMinutes: Math.round(result.output.digitalSelfAwareness.researchMinutes),
          productionMinutes: Math.round(result.output.digitalSelfAwareness.productionMinutes),
          mirrorInsight: result.output.digitalSelfAwareness.mirrorInsight,
        },
      };

      // Commit Reflection to Episodic Memory
      const updatedDiary: DailyDiary = {
        ...diary,
        companionReflection: reflection,
        digitalSelfAwareness: reflection.digitalSelfAwareness,
      };
      await this.memoryStore.saveDailyDiary(updatedDiary);

      return {
        success: true,
        data: reflection,
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
          err instanceof Error ? err.message : 'Diary synthesis failed',
          'DiarySynthesizerAgent',
          undefined,
          err,
        ),
        executionTimeMs: Math.round(performance.now() - startTime),
      };
    }
  }
}
