import { API_BASE_URL } from '../api/client';

export type SupportedAiProvider =
  | 'google'
  | 'anthropic'
  | 'openai'
  | 'groq'
  | 'ollama'
  | 'custom';

export interface DiscoveredModelOption {
  id: string;
  name: string;
  description?: string;
  isRecommended?: boolean;
}

export interface ProviderOption {
  id: SupportedAiProvider;
  name: string;
  placeholderKey: string;
  defaultEndpoint?: string;
  requiresKey: boolean;
  helpUrl: string;
}

export const SUPPORTED_PROVIDERS: Record<SupportedAiProvider, ProviderOption> = {
  google: {
    id: 'google',
    name: 'Google Gemini',
    placeholderKey: 'AIzaSy...',
    requiresKey: true,
    helpUrl: 'https://aistudio.google.com/app/apikey',
  },
  anthropic: {
    id: 'anthropic',
    name: 'Anthropic Claude',
    placeholderKey: 'sk-ant-...',
    requiresKey: true,
    helpUrl: 'https://console.anthropic.com/settings/keys',
  },
  openai: {
    id: 'openai',
    name: 'OpenAI',
    placeholderKey: 'sk-proj-...',
    requiresKey: true,
    helpUrl: 'https://platform.openai.com/api-keys',
  },
  groq: {
    id: 'groq',
    name: 'Groq (Ultra-Fast)',
    placeholderKey: 'gsk_...',
    requiresKey: true,
    helpUrl: 'https://console.groq.com/keys',
  },
  ollama: {
    id: 'ollama',
    name: 'Local Ollama',
    placeholderKey: 'None needed',
    defaultEndpoint: 'http://localhost:11434/v1',
    requiresKey: false,
    helpUrl: 'https://ollama.com',
  },
  custom: {
    id: 'custom',
    name: 'Custom (OpenAI-Compatible)',
    placeholderKey: 'Optional API Key',
    defaultEndpoint: 'http://localhost:8000/v1',
    requiresKey: false,
    helpUrl: 'https://platform.openai.com/docs/api-reference',
  },
};

/**
 * Dynamically queries the backend /api/models endpoint to fetch the live list of models
 * currently supported and available for this provider & key.
 */
export async function fetchLiveProviderModels(options: {
  provider: SupportedAiProvider;
  apiKey?: string;
  endpoint?: string;
}): Promise<DiscoveredModelOption[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/models`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-requested-with': 'Gremlin-Browser-Extension',
      },
      body: JSON.stringify(options),
    });
    if (!res.ok) return [];
    const json = (await res.json()) as { success: boolean; data?: DiscoveredModelOption[] };
    return json.data || [];
  } catch {
    return [];
  }
}
