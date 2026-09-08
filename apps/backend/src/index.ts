import { Hono } from 'hono';
import { logger } from 'hono/logger';
import type { ApplyGlobalResponse } from 'hono/client';
import { dynamicCors } from './middleware/cors';
import { handleGlobalError, handleNotFound, type ErrorEnvelope } from './middleware/errors';
import { authRoutes } from './routes/auth';
import { userRoutes } from './routes/user';
import { sprintRoutes } from './routes/sprint';
import { memoryRoutes } from './routes/memory';
import { syncRoutes } from './routes/memory.sync';
import { billingRoutes } from './routes/billing';
import { waitlistRoutes } from './routes/waitlist';
import type { AppEnv } from './types/env';

/**
 * Main Hono Application instance configured for Cloudflare Workers runtime.
 */
const app = new Hono<AppEnv>();

// 1. Global Middleware
app.use('*', logger());
app.use('*', dynamicCors);

// 2. Global Exception & 404 Handlers
app.onError(handleGlobalError);
app.notFound(handleNotFound);

// 3. Root & Health Check Endpoints
app.get('/', (c) => c.text('Gremlin API — Running on Hono & Cloudflare Workers'));
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    service: 'gremlin-api',
    runtime: 'cloudflare-workers',
    timestamp: Date.now(),
  });
});

// 4. Method Chaining for Full RPC Type Inference
const routes = app
  .route('/api/auth', authRoutes)
  .route('/api/user', userRoutes)
  .route('/api/sprint', sprintRoutes)
  .route('/api/memory', memoryRoutes)
  .route('/api/memory', syncRoutes)
  .route('/api/billing', billingRoutes)
  .route('/api/waitlist', waitlistRoutes);

/**
 * Exported AppType representing the composite API schema for Hono Client (`hc<AppType>`).
 * `ApplyGlobalResponse` folds the global error envelope into client response unions so
 * `res.status === 401/400/500` narrows `res.json()` to `ErrorEnvelope` on the extension side.
 */
export type AppType = ApplyGlobalResponse<
  typeof routes,
  {
    400: { json: ErrorEnvelope };
    401: { json: ErrorEnvelope };
    500: { json: ErrorEnvelope };
    503: { json: ErrorEnvelope };
  }
>

export default app;
