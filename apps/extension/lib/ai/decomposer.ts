import { agentOrchestrator } from './AgentOrchestrator';
import type { DecomposedGoal } from '@gremlin/shared';

/**
 * Autonomous goal decomposition using Vercel AI SDK Agent with zero fallbacks.
 * Throws explicit AgentBaseError on configuration or execution failures.
 */
export async function decomposeUserIntent(rawIntent: string): Promise<DecomposedGoal[]> {
  const agent = await agentOrchestrator.getGoalDecomposer();
  const result = await agent.decompose(rawIntent);

  if (!result.success) {
    throw result.error;
  }

  return result.data;
}
