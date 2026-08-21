import { type LanguageModel } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import { createGroq } from '@ai-sdk/groq';

export type SupportedAiProvider =
  | 'google'
  | 'anthropic'
  | 'openai'
  | 'groq'
  | 'ollama'
  | 'custom';

export interface ProviderOption {
  id: SupportedAiProvider;
  name: string;
  defaultModel: string;
  popularModels: string[];
  placeholderKey: string;
  defaultEndpoint?: string;
  requiresKey: boolean;
}

export const SUPPORTED_PROVIDERS: Record<SupportedAiProvider, ProviderOption> = {
  google: {
    id: 'google',
    name: 'Google Gemini',
    defaultModel: 'gemini-2.5-flash',
    popularModels: ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-1.5-flash', 'gemini-1.5-pro'],
    placeholderKey: 'AIzaSy...',
    requiresKey: true,
  },
  anthropic: {
    id: 'anthropic',
    name: 'Anthropic Claude',
    defaultModel: 'claude-3-5-haiku-latest',
    popularModels: ['claude-3-5-haiku-latest', 'claude-3-5-sonnet-latest', 'claude-3-opus-latest'],
    placeholderKey: 'sk-ant-...',
    requiresKey: true,
  },
  openai: {
    id: 'openai',
    name: 'OpenAI',
    defaultModel: 'gpt-4o-mini',
    popularModels: ['gpt-4o-mini', 'gpt-4o', 'gpt-4.1-mini', 'o3-mini'],
    placeholderKey: 'sk-proj-...',
    requiresKey: true,
  },
  groq: {
    id: 'groq',
    name: 'Groq (Ultra-Fast)',
    defaultModel: 'llama-3.3-70b-versatile',
    popularModels: ['llama-3.3-70b-versatile', 'deepseek-r1-distill-llama-70b', 'llama-3.1-8b-instant'],
    placeholderKey: 'gsk_...',
    requiresKey: true,
  },
  ollama: {
    id: 'ollama',
    name: 'Local Ollama',
    defaultModel: 'llama3.2',
    popularModels: ['llama3.2', 'mistral', 'phi4', 'qwen2.5', 'deepseek-r1:8b'],
    placeholderKey: 'None needed',
    defaultEndpoint: 'http://localhost:11434/v1',
    requiresKey: false,
  },
  custom: {
    id: 'custom',
    name: 'Custom (OpenAI-Compatible)',
    defaultModel: 'llama3',
    popularModels: ['custom-model'],
    placeholderKey: 'Optional API Key',
    defaultEndpoint: 'http://localhost:8000/v1',
    requiresKey: false,
  },
};

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
