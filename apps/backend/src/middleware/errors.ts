import type { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { ZodError } from 'zod';
import type { AppEnv } from '../types/env';

/**
 * Standardized JSON Error Response Envelope.
 */
export interface ErrorEnvelope {
  success: false;
  error: {
    code: string;
    message: string;
    status: number;
    details?: unknown;
  };
}

/**
 * Global Hono Error Handler for uncaught exceptions and HTTP errors.
 */
export function handleGlobalError(err: Error, c: Context<AppEnv>): Response {
  if (err instanceof ZodError) {
    return c.json<ErrorEnvelope>(
      {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request payload failed schema validation.',
          status: 400,
          details: err.issues,
        },
      },
      400
    );
  }

  if (err instanceof HTTPException) {
    const status = err.status;
    return c.json<ErrorEnvelope>(
      {
        success: false,
        error: {
          code: `HTTP_${status}`,
          message: err.message,
          status,
        },
      },
      status
    );
  }

  console.error('[Unhandled Backend Exception]:', err.stack || err.message);

  return c.json<ErrorEnvelope>(
    {
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected server error occurred.',
        status: 500,
      },
    },
    500
  );
}

/**
 * Global 404 Not Found Handler for unmapped routes.
 */
export function handleNotFound(c: Context<AppEnv>): Response {
  return c.json<ErrorEnvelope>(
    {
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: `Route '${c.req.method} ${c.req.path}' was not found.`,
        status: 404,
      },
    },
    404
  );
}
