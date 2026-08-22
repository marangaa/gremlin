import type { Session, User } from '../lib/auth';

/**
 * Cloudflare Worker Environment Bindings injected per-request via `c.env`.
 */
export interface Bindings {
  /** Neon PostgreSQL connection string. */
  DATABASE_URL: string;
  /** Secret key used by Better Auth to sign session cookies and tokens. */
  BETTER_AUTH_SECRET: string;
  /** Canonical base URL of the backend API (e.g., https://gremlin-backend.rchdmaranga-b12.workers.dev). */
  BETTER_AUTH_URL?: string;
  /** Google Gemini API Key for server-side AI agent evaluation. */
  GOOGLE_GENERATIVE_AI_API_KEY?: string;
  /** OpenAI API Key for server-side AI agent evaluation. */
  OPENAI_API_KEY?: string;
  /** Anthropic API Key for server-side AI agent evaluation. */
  ANTHROPIC_API_KEY?: string;
  /** Groq API Key for server-side AI agent evaluation. */
  GROQ_API_KEY?: string;
  /**
   * Comma-separated Chrome extension IDs permitted to call the API.
   * Example: "abcdefghijklmnopabcdefghijklmnop,zyxwvutsrqponmlkjihgfedcba"
   * Required in production; when unset outside production any chrome-extension://
   * origin is tolerated for local development convenience.
   */
  ALLOWED_EXTENSION_IDS?: string;
  /**
   * Comma-separated additional allowed origins (exact scheme://host[:port]).
   * Example: "https://gremlin.fasihi.xyz,https://staging.gremlin.fasihi.xyz"
   */
  ALLOWED_ORIGINS?: string;
  /** Runtime environment marker ("production" locks down permissive dev defaults). */
  NODE_ENV?: string;
  /** Optional Cloudflare Workers AI binding for on-edge inference. */
  AI?: unknown;
}

/**
 * Request-scoped Hono Context Variables populated across middleware lifecycles.
 */
export interface Variables {
  /** Authenticated Better Auth session record, or null if unauthenticated. */
  session: Session | null;
  /** Authenticated Better Auth user record, or null if unauthenticated. */
  user: User | null;
}

/**
 * Composite environment type for Hono application instances and middleware.
 */
export interface AppEnv {
  Bindings: Bindings;
  Variables: Variables;
}
