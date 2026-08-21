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
  headline: z.string().max(40).describe('Catchy, in-character summary title'),
  summary: z.string().max(300).describe('Honest recap of work accomplished, distractions faced, and momentum'),
  advice: z.string().max(140).describe('Direct, actionable coaching recommendation for tomorrow'),
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

  public async synthesize(diary: DailyDiary): Promise<AgentResult<CompanionDailyReflection>> {
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
- Top Domains by Time:
${diary.topDomains.map((t) => `  • ${t.domain}: ${t.minutes}m`).join('\n') || '  • None recorded'}

SMART NOTES EXCERPTS:
${diary.notes.slice(0, 4).map((n) => `[${n.domain}] "${n.content}"`).join('\n') || 'None'}

Synthesize the in-character score (1-10), catchy headline, analytical summary, and tomorrow's advice.`;

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
      };

      // Commit Reflection to Episodic Memory
      const updatedDiary: DailyDiary = {
        ...diary,
        companionReflection: reflection,
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
