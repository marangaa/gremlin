import type { LanguageModel } from 'ai';
import { AgentMemoryStore, agentMemoryStore } from './memory/AgentMemoryStore';
import { GoalDecomposerAgent } from './agents/GoalDecomposerAgent';
import { FocusMonitorAgent } from './agents/FocusMonitorAgent';
import { DiarySynthesizerAgent } from './agents/DiarySynthesizerAgent';
import { PsychologistAgent } from './agents/PsychologistAgent';
import { resolveLanguageModel } from './modelFactory';
import { configStorage, type OrganismConfig } from '../storage';
import type { OrganismId } from '@gremlin/shared';

export class AgentOrchestrator {
  public readonly memoryStore: AgentMemoryStore = agentMemoryStore;

  public async getResolvedModel(config?: OrganismConfig): Promise<LanguageModel | null> {
    const cfg = config || (await configStorage.getValue());
    const apiKey = cfg.byokApiKey || cfg.selfHostedApiKey;
    const endpoint = cfg.byokEndpoint || cfg.selfHostedEndpoint;
    const model = cfg.byokModel || cfg.selfHostedModel;

    const hasKeyOrEndpoint =
      Boolean(apiKey?.trim()) ||
      (cfg.provider === 'ollama' && Boolean(endpoint?.trim()));

    if (!hasKeyOrEndpoint) {
      return null;
    }

    try {
      return resolveLanguageModel({
        provider: cfg.provider || 'google',
        apiKey,
        endpoint,
        model,
      });
    } catch (err) {
      console.warn('[AgentOrchestrator] Error resolving model:', err);
      return null;
    }
  }

  public async getGoalDecomposer(): Promise<GoalDecomposerAgent> {
    const model = await this.getResolvedModel();
    return new GoalDecomposerAgent({
      model,
      memoryStore: this.memoryStore,
    });
  }

  public async getFocusMonitor(companionId?: OrganismId): Promise<FocusMonitorAgent> {
    const cfg = await configStorage.getValue();
    const model = await this.getResolvedModel(cfg);
    return new FocusMonitorAgent({
      model,
      companionId: companionId || cfg.organismId || 'Sarge',
      memoryStore: this.memoryStore,
    });
  }

  public async getDiarySynthesizer(companionId?: OrganismId): Promise<DiarySynthesizerAgent> {
    const cfg = await configStorage.getValue();
    const model = await this.getResolvedModel(cfg);
    return new DiarySynthesizerAgent({
      model,
      companionId: companionId || cfg.organismId || 'Sarge',
      memoryStore: this.memoryStore,
    });
  }

  public async getPsychologist(): Promise<PsychologistAgent> {
    const cfg = await configStorage.getValue();
    const model = await this.getResolvedModel(cfg);
    return new PsychologistAgent({ model });
  }
}

export const agentOrchestrator = new AgentOrchestrator();
