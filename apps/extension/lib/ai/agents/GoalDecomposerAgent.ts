import { generateText, Output, type LanguageModel } from 'ai';
import { z } from 'zod';
import { agentMemoryStore, AgentMemoryStore } from '../memory/AgentMemoryStore';
import {
  AgentConfigurationError,
  ContextValidationError,
  ModelProviderError,
  type AgentResult,
} from '../errors';
import type { DecomposedGoal } from '@gremlin/shared';

export const MilestoneSchema = z.object({
  title: z.string().min(2).max(100).describe('Actionable sub-goal or milestone description'),
  category: z.string().describe('Dynamic domain or category tag defined by the agent (e.g. backend, frontend, design, research, review, etc.)'),
  estimatedMinutes: z.number().int().min(5).max(180).describe('Estimated focus duration in minutes'),
});

export const GoalDecompositionOutputSchema = z.object({
  strategicOverview: z.string().max(300).describe('Brief strategic overview of the gameplan'),
  subGoals: z.array(MilestoneSchema).min(1).max(8).describe('Dynamic list of actionable milestones defined by the agent'),
});

export interface GoalDecomposerConfig {
  model: LanguageModel | null;
  memoryStore?: AgentMemoryStore;
}

export class GoalDecomposerAgent {
  private memoryStore: AgentMemoryStore;

  constructor(private readonly config: GoalDecomposerConfig) {
    this.memoryStore = config.memoryStore || agentMemoryStore;
  }

  public async decompose(rawUserIntent: string): Promise<AgentResult<DecomposedGoal[]>> {
    const startTime = performance.now();
    const trimmedIntent = rawUserIntent.trim();

    // 1. Zero Fallback: Enforce Valid Input
    if (!trimmedIntent) {
      return {
        success: false,
        error: new ContextValidationError(
          'Cannot decompose empty goal. Please provide a clear sprint intention.',
          'GoalDecomposerAgent',
        ),
        executionTimeMs: Math.round(performance.now() - startTime),
      };
    }

    // 2. Zero Fallback: Enforce Model Configuration
    if (!this.config.model) {
      return {
        success: false,
        error: new AgentConfigurationError(
          'No AI Language Model configured for GoalDecomposerAgent. Add an API key in Settings.',
          'GoalDecomposerAgent',
        ),
        executionTimeMs: Math.round(performance.now() - startTime),
      };
    }

    try {
      const system = `You are an expert executive focus coach and project architect.
Your job is to analyze the user's high-level workday goal and decompose it into distinct, sequential, highly actionable milestones.
You can define dynamic categories and tags suited to the user's workflow (e.g., backend, frontend, devops, research, writing, admin, testing).
Keep milestone titles punchy, professional, and clear.`;

      const prompt = `Decompose this focus intention into structured sub-goals:
"${trimmedIntent}"`;

      const result = await generateText({
        model: this.config.model,
        output: Output.object({ schema: GoalDecompositionOutputSchema }),
        instructions: system,
        prompt,
      });

      const now = Date.now();
      const decomposedGoals: DecomposedGoal[] = result.output.subGoals.map((sg, index) => ({
        id: `goal_${now}_${index}_${Math.random().toString(36).slice(2, 6)}`,
        title: sg.title,
        category: sg.category || 'general',
        estimatedMinutes: sg.estimatedMinutes || 25,
        isActive: true,
        completed: false,
        createdAt: now,
      }));

      // Commit to Memory
      await this.memoryStore.saveGoals(decomposedGoals);

      return {
        success: true,
        data: decomposedGoals,
        executionTimeMs: Math.round(performance.now() - startTime),
        usage: {
          inputTokens: result.usage?.inputTokens,
          outputTokens: result.usage?.outputTokens,
          totalTokens: result.usage?.totalTokens,
        },
      };
    } catch (err: unknown) {
      const error =
        err instanceof Error
          ? new ModelProviderError(err.message, 'GoalDecomposerAgent', undefined, err)
          : new ModelProviderError('Decomposition generation failed', 'GoalDecomposerAgent', undefined, err);

      return {
        success: false,
        error,
        executionTimeMs: Math.round(performance.now() - startTime),
      };
    }
  }
}
