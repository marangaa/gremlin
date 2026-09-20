import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { AppEnv } from '../types/env';
import { fetchProviderModels } from '../lib/providers/discovery';

const queryModelsSchema = z.object({
  provider: z.enum(['google', 'openai', 'groq', 'anthropic', 'ollama', 'custom']),
  apiKey: z.string().optional(),
  endpoint: z.string().optional(),
});

export const modelsRoutes = new Hono<AppEnv>().post(
  '/',
  zValidator('json', queryModelsSchema),
  async (c) => {
    const { provider, apiKey, endpoint } = c.req.valid('json');

    const keyToUse = apiKey?.trim();
    if (!keyToUse && provider !== 'ollama') {
      return c.json({
        success: true as const,
        data: [],
      });
    }

    const models = await fetchProviderModels(provider, {
      apiKey: keyToUse,
      endpoint,
    });

    return c.json({
      success: true as const,
      data: models,
    });
  },
);
