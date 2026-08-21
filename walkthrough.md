# Monorepo, Telemetry & AI Evaluation Architecture Walkthrough

## Overview
We built an end-to-end focus companion architecture inside a Turborepo monorepo:
1. **`packages/shared` (`@gremlin/shared`)**: Shared types for companion states, sprint sessions, browsing breadcrumbs, and AI evaluation payloads.
2. **`apps/backend` (`@gremlin/backend`)**: Hono + Better Auth + Neon PostgreSQL backend with dynamic Chrome Extension CORS and an AI evaluation endpoint (`POST /api/sprint/evaluate`).
3. **`apps/extension` (`@gremlin/extension`)**: WXT browser extension capturing deep DOM signals, HTML5 media states, rolling 45s breadcrumb buffer, and 15s grace timer on distraction domains.

---

## 1. Monorepo Structure

```
gremlin/
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
├── packages/
│   └── shared/                      # @gremlin/shared
│       ├── package.json
│       ├── tsconfig.json
│       └── src/index.ts             # OrganismState, BrowsingBreadcrumb, EvaluationBatch, EvaluationResult
└── apps/
    ├── backend/                     # @gremlin/backend (Hono + Better Auth + Neon)
    │   ├── src/
    │   │   ├── types/env.ts         # AppEnv & Cloudflare Worker Bindings
    │   │   ├── lib/auth.ts          # Memoized Better Auth + Neon Serverless Pool
    │   │   ├── middleware/
    │   │   │   ├── cors.ts          # Dynamic Chrome Extension CORS validator
    │   │   │   ├── auth.ts          # requireAuth & optionalAuth middleware
    │   │   │   └── errors.ts        # Global error & 404 handler
    │   │   ├── routes/
    │   │   │   ├── auth.ts          # Better Auth endpoints & session introspection
    │   │   │   ├── user.ts          # User profile & preferences
    │   │   │   └── sprint.ts        # Sprints & AI evaluation (/api/sprint/evaluate)
    │   │   ├── schema.sql           # Neon PostgreSQL DDL migration
    │   │   └── index.ts             # Main Hono app exporting AppType
    │   └── wrangler.jsonc           # nodejs_compat enabled
    └── extension/                   # @gremlin/extension (WXT + React)
        ├── entrypoints/
        │   ├── background.ts        # Service worker telemetry & alarm loop
        │   ├── content.ts           # Shadow DOM companion controller
        │   └── popup/               # Console HUD & Character select
        └── lib/
            ├── api/client.ts        # Type-safe RPC client (hc<AppType>)
            ├── events/extractor.ts  # DOM heading, excerpt & HTML5 media detector
            └── ai/engine.ts         # Cloud RPC vs Local BYOK AI dispatcher
```

---

## 2. Telemetry & AI Evaluation Architecture

```
[ Active Web Page (DOM) ]
        |
        | (Content Script extracts headings, meta tags, text excerpt, scroll depth, media state
        |  on idle + SPA navigation, and relays via typed 'pageSignal' RPC)
        v
[ Background Service Worker (WXT) ]
        | - Rolling history: last 20 domain entries persisted across SW restarts
        | - Page signals keyed by domain (15 min TTL) feed real page context to the AI
        | - 45s minimum interval between LLM evaluations; manual pokes bypass throttle
        v
    +---+---+
    |       |
    v       v
[ CLOUD MODE ]                              [ LOCAL BYOK MODE ]
POST /api/sprint/evaluate (Hono)             Direct on-device AI SDK inference
  - zod-validated request body               - Gemini / Claude / OpenAI / Groq / Ollama
  - Honest 503 when server key missing       - Zero telemetry leaves the browser
  - Sprints persisted in Neon (cross-device) |
    +-------------------+-------------------+
                        |
                        v
              [ Live Client Reaction ]
              - Mood sprite change in corner
              - Character speech bubble quip
              - Vignette / screen shake if divergent
              - Web Audio procedural chirp
```

---

## 3. Verification & Build Results

- **Typecheck (`turbo compile`)**: 4/4 tasks successful across `@gremlin/shared`, `@gremlin/backend`, `@gremlin/extension`, and `@gremlin/web` (0 TypeScript errors).
- **Unit tests**: extension vitest suite (WxtVitest + fakeBrowser) — tracker behaviors covered, 7/7 passing.
- **Production Build (`turbo build`)**: 4/4 tasks successful; produced production Chrome MV3 bundle in `apps/extension/.output/chrome-mv3`.
- **Schema**: applied to Neon — `user.plan`, `account.issuer` (+ compound unique index), `sprints.organismId`, and the `rate_limit` table are live.
