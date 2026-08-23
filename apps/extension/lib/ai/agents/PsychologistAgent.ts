import { generateText, Output, type LanguageModel } from 'ai';
import { z } from 'zod';
import {
  AgentConfigurationError,
  ModelProviderError,
  type AgentResult,
} from '../errors';
import type { SessionEpisode } from '@gremlin/shared';

export const PsychologistOutputSchema = z.object({
  lessons: z
    .array(z.string().max(160))
    .max(8)
    .describe('Up to 8 imperative, specific behavioral lessons distilled from the episode data'),
  headline: z.string().max(90).describe('Short headline capturing the day\'s behavioral pattern'),
});

export interface PsychologistConfig {
  model: LanguageModel | null;
}

function formatClock(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

function buildTranscript(episodes: SessionEpisode[]): string {
  const divergences = episodes.filter((e) => e.type === 'divergence');
  const onTask = episodes.filter((e) => e.type === 'on_task');
  const milestones = episodes.filter((e) => e.type === 'milestone');
  const interventions = episodes.filter((e) => e.type === 'intervention');
  const outcomes = episodes.filter((e) => e.type === 'outcome');

  const lines: string[] = [];

  lines.push(`DIVERGENCES (${divergences.length}):`);
  for (const e of divergences.slice(0, 20)) {
    lines.push(`- ${formatClock(e.ts)}${e.domain ? ` [${e.domain}]` : ''} ${e.detail}`);
  }

  lines.push(`ON-TASK STRETCHES (${onTask.length}):`);
  for (const e of onTask.slice(0, 20)) {
    lines.push(`- ${formatClock(e.ts)}${e.domain ? ` [${e.domain}]` : ''} ${e.detail}`);
  }

  lines.push(`MILESTONES (${milestones.length}):`);
  for (const e of milestones.slice(0, 10)) {
    lines.push(`- ${formatClock(e.ts)} ${e.detail}`);
  }

  lines.push(`INTERVENTIONS AND OUTCOMES (${interventions.length}):`);
  for (const iv of interventions.slice(0, 30)) {
    const outcome = outcomes.find(
      (o) => o.outcome !== undefined && o.detail.includes(iv.id),
    );
    const kind = iv.intervention?.kind ?? 'unknown';
    const level = iv.intervention?.level ?? '?';
    const remark = iv.intervention?.remark ? `"${iv.intervention.remark}" ` : '';
    let line = `- ${formatClock(iv.ts)} ${kind} L${level} ${remark}->`;
    if (outcome) {
      line += ` OUTCOME: effective=${outcome.outcome?.effective ?? 'unknown'}`;
      if (typeof outcome.outcome?.returnedWithinMin === 'number') {
        line += `, returned within ${outcome.outcome.returnedWithinMin} min`;
      }
    } else {
      line += ' OUTCOME: none recorded';
    }
    lines.push(line);
  }

  return lines.join('\n');
}

/**
 * Nightly distiller that turns the raw episode log into durable behavioral
 * lessons and a headline, stored on the focus profile.
 */
export class PsychologistAgent {
  constructor(private readonly config: PsychologistConfig) {}

  /**
   * Distills a day of episodes plus the diary summary into at most 8 lessons
   * and one headline. Fails loudly via {@link ModelProviderError}; no fallbacks.
   */
  public async distillDaily(input: {
    episodes: SessionEpisode[];
    diarySummary: string;
    currentLessons: string[];
  }): Promise<AgentResult<{ lessons: string[]; headline: string }>> {
    const startTime = performance.now();

    // Zero Fallback: Enforce Model Configuration
    if (!this.config.model) {
      return {
        success: false,
        error: new AgentConfigurationError(
          'Language model not configured for PsychologistAgent. Provide an API key in Settings to distill daily lessons.',
          'PsychologistAgent',
        ),
        executionTimeMs: Math.round(performance.now() - startTime),
      };
    }

    try {
      const system = `You are the companion's psychologist.
You study a full day of session episodes — divergences, on-task stretches, interventions with their outcomes, and milestones — plus the diary summary.
Distill behavioral patterns: what times of day focus holds, which intervention kinds actually work, what reliably derails this person.
Produce at most 8 imperative, specific, non-generic lessons (each under 160 characters), grounded strictly in the data provided.
Never invent events, domains, or patterns not present in the data.
Also produce one headline (under 90 characters) capturing today's dominant behavioral pattern.
Return structured JSON matching the schema.`;

      const prompt = `EPISODE TRANSCRIPT:
${buildTranscript(input.episodes)}

DIARY SUMMARY:
${input.diarySummary || 'None recorded'}

EXISTING LESSONS (already known; only keep if still supported by today's data):
${input.currentLessons.map((l) => `- ${l}`).join('\n') || 'None'}

Distill today's lessons and headline.`;

      const result = await generateText({
        model: this.config.model,
        output: Output.object({ schema: PsychologistOutputSchema }),
        instructions: system,
        prompt,
      });

      return {
        success: true,
        data: {
          lessons: result.output.lessons,
          headline: result.output.headline,
        },
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
          err instanceof Error ? err.message : 'Daily distillation failed',
          'PsychologistAgent',
          undefined,
          err,
        ),
        executionTimeMs: Math.round(performance.now() - startTime),
      };
    }
  }
}
