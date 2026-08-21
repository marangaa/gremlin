# 📓 Gremlin Development Log (Architectural Record)

> **Purpose:** A chronological technical ledger documenting architectural decisions, design philosophies, gotchas, and schema evolutions for developers and collaborating AI agents.

---

## 1. Project Genesis & Core Mission

- **Problem:** Existing website blockers (e.g. strict domain blacklists) are brittle, annoying, and easily bypassed. Real-world deep work involves reading documentation, watching tutorial videos, or researching solutions on Reddit/Twitter/YouTube. Hardcoded domain blacklists produce endless false positives.
- **Solution:** A pair-programming / desk companion living in the corner of your browser. Instead of rigid string matching, Gremlin feeds a **rolling narrative timeline** to an LLM agent (via Vercel AI SDK), determining in real time whether the user is on-task, exploring a technical tangent, or doomscrolling.

---

## 2. Monorepo Architecture (`turborepo` + `pnpm`)

We refactored the standalone extension and backend into a unified Turborepo monorepo:

```
gremlin/
├── apps/
│   ├── extension/       # Chrome Manifest V3 extension (WXT, React 19, Tailwind, Web Audio)
│   └── backend/         # Edge API & AI Worker (Hono, Better Auth, Neon Postgres, AI SDK)
├── packages/
│   └── shared/          # Shared TypeScript models, RPC schemas, companion types
├── package.json         # Root scripts & Turborepo task pipeline
├── turbo.json           # Remote cache & build graph
└── .env.example         # Template configuration for developers
```

### Key Architectural Invariants:
1. **Zero Hardcoded Domain Blacklists:** All judgment is delegated to the AI Agent (`generateObject` via AI SDK).
2. **Dual-Mode Air Gap:**
   - **Cloud Mode (`mode: 'cloud'`):** Sends the rolling window over typed Hono RPC (`api.sprint.evaluate.$post`) to Cloudflare Workers.
   - **Air-Gapped Local BYOK (`mode: 'self-hosted'`):** Executes `@ai-sdk` on-device inside the extension background service worker using the user's private key (Gemini, Claude, GPT, Groq, or local Ollama). Zero browsing telemetry leaves the client.
3. **Procedural Web Audio Synthesizer:** Animalese voice blips and chimes are synthesized directly with the browser's `AudioContext` (frequency-modulated formants + square/sawtooth oscillators), requiring zero audio asset network downloads.

---

## 3. Companion Personas & Archetypes

Companions are built with distinct identities, pitch profiles, and voice prompts:

1. **Goggins (`goggins`):** The Disciplinarian. Unstoppable, intense military accountability. (*"Who's gonna carry the boats? Zero excuses."*) — Low square-wave synth bark.
2. **Waifu (`waifu`):** The Supportive Cheerleader. Sweet, affectionate, encouraging with cute emojis. (*"Anata, did you forget your goal? 🥺 Stay focused for me! 💕"*) — High sine-wave chirp.
3. **Sherlock (`sherlock`):** The Forensic Detective. Dry British deduction analyzing your search trail as clues. (*"A curious detour from the case, Watson."*) — Crisp filtered square-wave.
4. **Kuro (`kuro`):** The Chaos Gremlin. Savage roaster armed with modern meme brainrot. (*"Caught in 4K 💀 Bro thought he could sneak 5 minutes of scrolling."*) — Raspy sawtooth growl.
5. **Sensei (`sensei`):** The Zen Master. Tranquil mindfulness, deep breathing, and presence. (*"Breathe. One keystroke at a time. Return to center."*) — Warm triangle-wave tone.

---

## 4. Backend Cloudflare Worker (`apps/backend`)

- **Framework:** Hono with strict TypeScript RPC bindings (`hc<AppType>`).
- **Authentication:** Better Auth on Cloudflare Workers with `@neondatabase/serverless` connection pooler.
- **AI Agent Engine:** `@ai-sdk/google`, `@ai-sdk/openai`, `@ai-sdk/anthropic`, `@ai-sdk/groq` using `generateObject` with Zod structured output.
- **Edge Performance:** ~80ms cold start on Cloudflare global edge network.

---

## 5. Gotchas & Lessons Learned

1. **pnpm deploy vs pnpm run deploy:** `pnpm deploy` is a reserved built-in CLI command for pruning/isolating monorepo packages. To run a package's `"deploy"` script, use `pnpm --filter @gremlin/backend run deploy` or top-level `pnpm deploy:api`.
2. **WXT Environment Variables:** Must be prefixed with `WXT_` (e.g. `WXT_API_URL`) to be statically bundled into the extension bundle via `import.meta.env.WXT_*`.
3. **Content Script Media Sniffing:** Detecting `<video>` / `<audio>` playback with `!media.paused && !media.ended && media.currentTime > 0` allows the agent to distinguish active YouTube video streaming from static research articles.
4. **fake-browser windows namespace:** `@webext-core/fake-browser` implements `tabs.*` but its internals call the *unimplemented* `windows.*` stubs through module-scope references — spying on `browser.windows.getCurrent` does NOT intercept them (and unmocked members throw rather than return undefined). Unit tests should stub `browser.tabs.query`/`browser.tabs.get` with an in-test registry instead of relying on fake tab state.

---

## 6. Framework Modernization & Honest AI Round (2026-08)

### AI SDK v4 → v7
- Migrated every LLM call site from deprecated `generateObject({ model, schema, system })` to `generateText({ model, output: Output.object({ schema }), instructions })`, reading `result.output`.
- **OpenAI strict JSON schema trap:** since v6 OpenAI defaults `strictJsonSchema: true`; `.optional()` / `.default()` on OUTPUT schemas break generation. Converted provider-bound fields to required enums/strings and applied code-level fallbacks post-parse. Request-validation schemas are unaffected (validation is local).
- Usage fields renamed: `promptTokens/completionTokens` → `inputTokens/outputTokens`; telemetry traces now record real usage via a new `AgentResult.usage` instead of hardcoded zeros.
- zod upgraded 3.24 → 4.x across the monorepo (required by AI SDK v7 and better-auth's `better-call` peer). Dropped `ollama-ai-provider` (V1-spec only); Ollama/custom endpoints run through `createOpenAI({ baseURL })`.

### WXT Modernization
- `storage.defineItem({ defaultValue })` → `{ fallback }` (deprecated rename); storage imports flow through `#imports`.
- First unit-test scaffold: `vitest.config.ts` + `WxtVitest()` plugin + `fakeBrowser`; tests live beside sources (`pnpm --filter @gremlin/extension test`). See gotcha #4 above for fake-browser pitfalls.

### Backend Hardening
- Routes validate bodies via `@hono/zod-validator`; global error envelope (`{ success:false, error }`) folded into `hc<AppType>` client types using hono 4.13's `ApplyGlobalResponse`.
- CORS + Better Auth `trustedOrigins` share one env-driven allowlist builder: `ALLOWED_EXTENSION_IDS` / `ALLOWED_ORIGINS` bindings; permissive dev fallbacks (localhost any-port, `chrome-extension://*`) auto-disable when `NODE_ENV=production`.
- Better Auth: enabled `session.cookieCache` (5 min) so MV3 SW wake-ups skip Postgres; rate limiting moved to the `rate_limit` table (in-memory counters are per-isolate); client IP via `cf-connecting-ip`; plan tier modeled as `user.additionalFields.plan` with `input:false` (server-mutated only).
- **Better Auth 1.7 issuer semantics:** credential accounts use synthetic issuer `local:credential` (`createLocalAccountIssuer("credential")`). Schema migration adds `account.issuer` (+ compound unique index), backfills existing rows, plus `user.plan` and `sprints.organismId` columns and the `rate_limit` table. The issuer backfill is idempotent; rerunning schema.sql is always safe.

### Honest Cloud Fallbacks & Sprint Persistence
- Removed the backend's silent "on_task" fallback: an unconfigured or failing provider now returns an honest `503` error envelope so clients can fall through to BYOK mode with truthful messaging.
- Sprint lifecycle moved from a per-isolate in-memory Map into Neon (`sprints` table): `/start` inserts (superseding stale active rows), `/current` selects, `/complete` updates. State now survives worker eviction and syncs across devices.

### Page-Signal Pipeline & Evaluation Throttle
- Content scripts now relay privacy-filtered snapshots (headings, article excerpt, scroll depth, media state, clean URL) to the background via the typed `pageSignal` RPC on idle and SPA navigation. Previously these extractions were computed and discarded, starving both cloud and BYOK evaluations of page context (only domain/title/dwell were visible).
- Tracker stores signals keyed by domain (15 min TTL, capacity 30) and exposes the fresh signal as `BrowserContext.pageSignal`; the engine builds breadcrumbs from real signals.
- Added a 45-second minimum interval between AI evaluations (30s alarm ticks and tab-switch debounces no longer trigger redundant LLM calls); manual pokes bypass the throttle, and the observation timestamp persists even when no reaction fires.
