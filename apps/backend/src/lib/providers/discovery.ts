export interface DiscoveredModel {
  id: string;
  name: string;
  description?: string;
  isRecommended?: boolean;
}

interface CacheEntry {
  timestamp: number;
  models: DiscoveredModel[];
}

const modelCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Generates a cache key based on provider, key hash, and custom endpoint.
 */
function getCacheKey(provider: string, apiKey?: string, endpoint?: string): string {
  const keyPart = apiKey ? apiKey.slice(-6) : 'none';
  return `${provider}:${endpoint || 'default'}:${keyPart}`;
}

/**
 * Fetches the live list of models directly from a provider's official REST endpoint.
 */
export async function fetchProviderModels(
  provider: string,
  options: { apiKey?: string; endpoint?: string } = {},
): Promise<DiscoveredModel[]> {
  const cacheKey = getCacheKey(provider, options.apiKey, options.endpoint);
  const cached = modelCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.models;
  }

  let models: DiscoveredModel[] = [];

  try {
    switch (provider) {
      case 'google': {
        const apiKey = options.apiKey?.trim();
        if (!apiKey) break;

        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`,
        );
        if (!res.ok) {
          throw new Error(`Google Models API returned ${res.status}: ${res.statusText}`);
        }
        const json = (await res.json()) as {
          models?: Array<{
            name: string;
            displayName?: string;
            description?: string;
            supportedGenerationMethods?: string[];
          }>;
        };

        if (json.models && Array.isArray(json.models)) {
          // Filter for models that support text/chat content generation
          const generationModels = json.models.filter((m) =>
            m.supportedGenerationMethods?.includes('generateContent'),
          );

          models = generationModels.map((m) => {
            const rawId = m.name.replace(/^models\//, '');
            const isLatestFlash = rawId === 'gemini-flash-latest' || rawId.includes('flash');
            return {
              id: rawId,
              name: m.displayName || rawId,
              description: m.description,
              isRecommended: isLatestFlash,
            };
          });

          // Sort so recommended flash models appear first
          models.sort((a, b) => {
            if (a.id === 'gemini-flash-latest') return -1;
            if (b.id === 'gemini-flash-latest') return 1;
            if (a.isRecommended && !b.isRecommended) return -1;
            if (!a.isRecommended && b.isRecommended) return 1;
            return a.id.localeCompare(b.id);
          });
        }
        break;
      }

      case 'openai': {
        const apiKey = options.apiKey?.trim();
        const base = (options.endpoint?.trim() || 'https://api.openai.com/v1').replace(/\/+$/, '');
        const res = await fetch(`${base}/models`, {
          headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
        });
        if (!res.ok) {
          throw new Error(`OpenAI Models API returned ${res.status}: ${res.statusText}`);
        }
        const json = (await res.json()) as {
          data?: Array<{ id: string; object?: string; owned_by?: string }>;
        };

        if (json.data && Array.isArray(json.data)) {
          // Filter for chat/reasoning models
          const chatModels = json.data.filter((m) =>
            /^(gpt-|o1|o3|chatgpt)/i.test(m.id) && !/(embedding|audio|transcription|moderation|tts)/i.test(m.id),
          );

          models = chatModels.map((m) => {
            const isMini = m.id.includes('mini');
            return {
              id: m.id,
              name: m.id,
              description: m.owned_by ? `Owned by ${m.owned_by}` : undefined,
              isRecommended: isMini,
            };
          });

          models.sort((a, b) => {
            if (a.isRecommended && !b.isRecommended) return -1;
            if (!a.isRecommended && b.isRecommended) return 1;
            return a.id.localeCompare(b.id);
          });
        }
        break;
      }

      case 'groq': {
        const apiKey = options.apiKey?.trim();
        if (!apiKey) break;

        const res = await fetch('https://api.groq.com/openai/v1/models', {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        if (!res.ok) {
          throw new Error(`Groq Models API returned ${res.status}: ${res.statusText}`);
        }
        const json = (await res.json()) as {
          data?: Array<{ id: string; active?: boolean; context_window?: number }>;
        };

        if (json.data && Array.isArray(json.data)) {
          const activeModels = json.data.filter((m) => m.active !== false && !m.id.includes('whisper'));
          models = activeModels.map((m) => ({
            id: m.id,
            name: m.id,
            description: m.context_window ? `${m.context_window} tokens context` : undefined,
            isRecommended: m.id.includes('versatile') || m.id.includes('instant'),
          }));

          models.sort((a, b) => {
            if (a.isRecommended && !b.isRecommended) return -1;
            if (!a.isRecommended && b.isRecommended) return 1;
            return a.id.localeCompare(b.id);
          });
        }
        break;
      }

      case 'anthropic': {
        const apiKey = options.apiKey?.trim();
        if (!apiKey) break;

        const res = await fetch('https://api.anthropic.com/v1/models', {
          headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
          },
        });
        if (!res.ok) {
          throw new Error(`Anthropic Models API returned ${res.status}: ${res.statusText}`);
        }
        const json = (await res.json()) as {
          data?: Array<{ id: string; display_name?: string; type?: string }>;
        };

        if (json.data && Array.isArray(json.data)) {
          models = json.data.map((m) => ({
            id: m.id,
            name: m.display_name || m.id,
            isRecommended: m.id.includes('haiku'),
          }));

          models.sort((a, b) => {
            if (a.isRecommended && !b.isRecommended) return -1;
            if (!a.isRecommended && b.isRecommended) return 1;
            return a.id.localeCompare(b.id);
          });
        }
        break;
      }

      case 'ollama': {
        const base = (options.endpoint?.trim() || 'http://localhost:11434').replace(/\/+$/, '');
        const res = await fetch(`${base}/api/tags`);
        if (!res.ok) {
          throw new Error(`Ollama API returned ${res.status}: ${res.statusText}`);
        }
        const json = (await res.json()) as {
          models?: Array<{ name: string; size?: number }>;
        };

        if (json.models && Array.isArray(json.models)) {
          models = json.models.map((m) => ({
            id: m.name,
            name: m.name,
            description: m.size ? `${(m.size / (1024 * 1024 * 1024)).toFixed(1)} GB` : undefined,
            isRecommended: true,
          }));
        }
        break;
      }

      case 'custom': {
        const base = (options.endpoint?.trim() || 'http://localhost:8000/v1').replace(/\/+$/, '');
        const headers: Record<string, string> = {};
        if (options.apiKey?.trim()) {
          headers.Authorization = `Bearer ${options.apiKey.trim()}`;
        }
        const res = await fetch(`${base}/models`, { headers });
        if (!res.ok) {
          throw new Error(`Custom Models endpoint returned ${res.status}: ${res.statusText}`);
        }
        const json = (await res.json()) as {
          data?: Array<{ id: string }>;
        };

        if (json.data && Array.isArray(json.data)) {
          models = json.data.map((m) => ({
            id: m.id,
            name: m.id,
            isRecommended: true,
          }));
        }
        break;
      }

      default:
        break;
    }
  } catch (err) {
    console.warn(`[Dynamic Model Discovery] Failed to query ${provider}:`, err);
  }

  if (models.length > 0) {
    modelCache.set(cacheKey, { timestamp: Date.now(), models });
  }

  return models;
}

/**
 * Dynamically resolves the best active model ID for a given provider and credentials.
 * If preferredModel is provided and non-empty, adopts it directly.
 * Otherwise, queries the provider's live models endpoint and picks the primary model.
 */
export async function resolveModelId(
  provider: string,
  options: { apiKey?: string; endpoint?: string; preferredModel?: string } = {},
): Promise<string> {
  const preferred = options.preferredModel?.trim();
  if (preferred && preferred.length > 0 && preferred !== 'auto') {
    return preferred;
  }

  // Dynamically discover models from provider endpoint
  const available = await fetchProviderModels(provider, options);
  if (available.length > 0) {
    // Pick the top recommended model from the provider's live list
    const top = available.find((m) => m.isRecommended) || available[0];
    if (top) {
      return top.id;
    }
  }

  throw new Error(
    `Unable to discover active models from ${provider}. Please specify a model explicitly or check credentials.`,
  );
}
