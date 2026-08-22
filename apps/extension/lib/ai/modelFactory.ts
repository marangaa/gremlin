import { type LanguageModel } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import { createGroq } from '@ai-sdk/groq';
import { SUPPORTED_PROVIDERS, type SupportedAiProvider } from './providers';

export function resolveLanguageModel(options: {
  provider: SupportedAiProvider;
  apiKey?: string;
  endpoint?: string;
  model?: string;
}): LanguageModel {
  const provider = options.provider || 'google';
  const modelId = options.model?.trim() || SUPPORTED_PROVIDERS[provider].defaultModel;
  const apiKey = options.apiKey?.trim() || '';

  switch (provider) {
    case 'google': {
      const google = createGoogleGenerativeAI({
        apiKey: apiKey || 'dummy-key',
      });
      return google(modelId);
    }

    case 'anthropic': {
      const anthropic = createAnthropic({
        apiKey: apiKey || 'dummy-key',
      });
      return anthropic(modelId);
    }

    case 'groq': {
      const groq = createGroq({
        apiKey: apiKey || 'dummy-key',
      });
      return groq(modelId);
    }

    case 'openai': {
      const openai = createOpenAI({
        apiKey: apiKey || 'dummy-key',
        baseURL: options.endpoint?.trim() || undefined,
      });
      return openai(modelId);
    }

    case 'ollama': {
      const openai = createOpenAI({
        apiKey: 'ollama',
        baseURL: options.endpoint?.trim() || 'http://localhost:11434/v1',
      });
      return openai(modelId);
    }

    case 'custom':
    default: {
      const openai = createOpenAI({
        apiKey: apiKey || 'dummy-key',
        baseURL: options.endpoint?.trim() || 'http://localhost:8000/v1',
      });
      return openai(modelId);
    }
  }
}
