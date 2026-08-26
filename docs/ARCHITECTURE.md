# Gremlin — Technical Architecture & Developer Handbook

> Comprehensive architectural reference for Gremlin, designed for engineers and autonomous AI coding agents working on the codebase.

---

## 1. System Overview & Monorepo Topology

Gremlin is built as a TypeScript Turborepo monorepo structured into 4 packages/apps:

```
gremlin/
├── apps/
│   ├── extension/       # Chrome Manifest V3 Extension (WXT + React 19 + Tailwind v4)
│   ├── web/             # Marketing, Docs & Cloud Dashboard (Vite + React 19 + Tailwind + Three.js)
│   └── backend/         # Edge REST API & AI Gateway (Hono + Better Auth + Cloudflare Workers + Neon)
├── packages/
│   └── shared/          # Shared TypeScript interfaces, Zod schemas & AI prompt types
└── docs/
    └── ARCHITECTURE.md  # System specification and development handbook (this document)
```

### High-Level Data Flow

```mermaid
graph TD
    User([User in Chrome]) -->|Browses Web| ContentScript[Content Script: /entrypoints/content.ts]
    ContentScript -->|Tracks Title/Headings/Scroll/Media on Idle| PageExtractor[Page Extractor]
    PageExtractor -->|RPC: pageSignal snapshots| BackgroundSW[Background Service Worker: /entrypoints/background.ts]
    ContentScript -->|wxt:locationchange & DOM snapshots| BackgroundSW
    
    Popup[Extension Popup: /entrypoints/popup/App.tsx] -->|wxt/storage: configStorage.setValue| Storage[(Browser Storage Local)]
    Storage -->|configStorage.watch| ContentScript
    Storage -->|configStorage.watch| BackgroundSW
    
    BackgroundSW -->|Active Sprint & Context + pageSignal| AIReasoning[AI Decision Engine: /lib/ai/engine.ts]
    AIReasoning -->|BYOK: Direct Client Fetch| Gemini[Google AI Studio / OpenAI / Ollama]
    AIReasoning -->|Cloud Mode: Session RPC| EdgeAPI[Backend: apps/backend]
    EdgeAPI -->|Better Auth + Neon DB| CloudDB[(Neon Serverless Postgres)]
    
    AIReasoning -->|Decision: State, Remark, Audio| BackgroundSW
    BackgroundSW -->|Typed RPC: sendMessage 'triggerReaction'| ContentScript
    ContentScript -->|SpriteEngine / AudioContext| ShadowDOM[(Isolated Shadow DOM Viewport)]
```

---

## 2. Browser Extension Architecture (`apps/extension`)

### Core Principles
1. **Manifest V3 Native Lifecycle:** Powered by [WXT (Next-gen Web Extension Framework)](https://wxt.dev).
2. **Consent-Gated Injection:** Content scripts mount NOTHING and extract NO page context until `onboardedStorage` flips true (first-run disclosure accepted in the popup). This matters because storage fallbacks (`enabled: true`, default companion) would otherwise wake the companion pre-consent on a fresh install; the content script defers its entire start sequence via an `onboardedStorage.watch()` and only then mounts the UI and begins relaying page signals.
3. **Shadow DOM Isolation:** The companion widget is injected into an isolated Shadow DOM (`gremlin-organism-viewport`) via `createShadowRootUi(ctx)`. Webpage styles and CSS frameworks cannot pollute or break the companion UI.
4. **Reactive State Synchronization (`wxt/storage`):**
   - Uses `storage.defineItem` wrappers (`configStorage`, `sprintStorage`, `organismStateStorage`, `activityStorage`).
   - Content scripts use `configStorage.watch()` to reactively update the companion avatar, audio volume, and dock position in real time across **all open browser tabs** without requiring a page refresh.
5. **Retroactive Script Injection:**
   - On install or extension reload, `browser.runtime.onInstalled` in `background.ts` queries all open HTTP/HTTPS tabs and executes `browser.scripting.executeScript` to inject `/content-scripts/content.js` dynamically.
6. **Zero-Leak Lifecycle Invalidation:**
   - Content scripts listen to `ctx.onInvalidated()`. When the extension is uninstalled or disabled in Chrome, all `requestAnimationFrame` loops, audio contexts, and injected DOM nodes are purged immediately.
   - Because WXT detects invalidation lazily (the `runtime.id` check lives inside the `ctx.isInvalid` getter) and its active events only cover reload/update, each content script runs a `ctx.setInterval` heartbeat so uninstalls also trip full teardown through the framework's abort signal.
   - **Teardown is DOM-only by design:** invalidation handlers never call extension-binding methods (`removeListener`, etc.) — those throw `Extension context invalidated.` on orphaned scripts, which both spams the console and can abort cleanup midway. Storage watchers and messaging listeners are intentionally left to die with the page: Chrome stops dispatching events to orphans, so removal is unnecessary, and memory is reclaimed at navigation/unload.
   - **Fire-and-forget sends acknowledge rejection:** content→background `pageSignal` pushes use `.catch(() => {})` on the `@webext-core/messaging` promise. During extension reloads a freshly injected script can outrun the booting service worker (`Could not establish connection. Receiving end does not exist.`), and mid-send invalidations race the invalidation guard — both are expected, harmless drops of ephemeral telemetry (the next navigation re-pushes). User-initiated sends elsewhere remain un-caught so genuine failures surface.
   - Messaging runs on `@webext-core/messaging` v4 (callback-style transport); content-side sends are guarded by `ctx.isInvalid` reads immediately before dispatch.

### Key Directories & Files
* `entrypoints/content.ts`: Mounts the Shadow DOM container, handles SPA `wxt:locationchange` events, manages the active `OrganismController`, and relays privacy-filtered page snapshots to the service worker.
* `entrypoints/background.ts`: Service worker tracking tab switches (`tabs.onActivated`, `tabs.onUpdated`), running debounced + throttled evaluation alarms (45s minimum interval between LLM calls; manual pokes bypass), and handling typed RPC messages including inbound `pageSignal` deliveries.
* `entrypoints/popup/App.tsx`: Cardless paper UI — hierarchy comes from typography, dashed hairline rules, and skin-accent fills instead of nested boxes (the popup is 380px wide; containers are reserved for the single primary action per view):
  - **Startup is a single batched read:** all persisted state is hydrated via one WXT `storage.getItems([...])` call (one underlying `browser.storage.local.get`) instead of per-item `getValue()` round trips; `storage.watch()` subscriptions keep it live afterwards.
  - **Navigation:** bare companion sprite strip (selected = full opacity + accent underline) above underline-style tabs (accent 3px indicator on a shared coal rule).
  - **Focus tab:** underline goal input + inline "Decompose" text action, pill duration selector (∞ flow supported), and one brutal START button. Active sprints render flat — display-font tabular countdown, hairline progress bar (indeterminate drift in flow mode), accent pull-quote remark, inline stats, solid-coal Finish bar. A 1 Hz interval tick re-renders the clock only while a sprint is active.
  - **Prefs tab:** flat settings rows separated by dashed rules (diary shortcut row, chirps toggle + volume slider, glitch toggle, preview action).
  - **Model tab:** radio-list provider picker (name + micro-blurb per row), underline key/endpoint/model fields, popular-model quick links, one Save button + inline test status.
  - Companion strip, sound/enable controls, and the first-run consent screen share the same paper palette with each character's skin color reserved for accents.
* `lib/organism/controller.ts`: Coordinates coordinate math, drag physics, sprite render loops, and thought pill speech bubbles.
* `lib/organism/spriteEngine.ts`: Standalone, procedural Canvas2D pixel animator supporting idle, peek, surprised, annoyed, sleeping, and celebrating states.
* `lib/audio/soundEngine.ts`: Pure Web Audio API procedural synthesizer for Animalese speech chirps, alert beeps, and start/finish chimes with zero external audio assets.
* `lib/events/tracker.ts` & `extractor.ts`: The extractor captures page titles, meta tags, headings, article snippets, scroll depth, and HTML5 media state using `requestIdleCallback`; content scripts push snapshots to the background via the typed `pageSignal` RPC. The tracker keys signals by domain (TTL 15 min, capacity 30) and exposes the fresh signal for the current domain inside `BrowserContext.pageSignal`, where it feeds real page context (headings/excerpt/media/scroll) into both cloud and BYOK AI evaluation breadcrumbs.
* `lib/storage/index.ts`: All persisted state defined via `storage.defineItem` with `fallback` defaults; imports flow through WXT's canonical `#imports`.
* `lib/ai/providers.ts`: Pure provider catalog (names, default/popular models, key requirements, endpoints) with zero SDK imports — safe to pull into lightweight surfaces like the popup. `resolveLanguageModel` lives in `lib/ai/modelFactory.ts`, which owns the `@ai-sdk/*` imports; only the background-side engine/orchestrator (and the popup's dynamically imported test-connection path) touch it. This keeps the popup bundle ~31 KB instead of dragging every provider SDK into it.
* `entrypoints/sidepanel/SidepanelApp.tsx`: Focus Diary sidepanel sharing the paper shell (today's metrics, reflection synthesis, domain breakdown, notes stream).

### AI SDK DevTools (development only)

Every judge call is observable in **AI SDK DevTools** — the SDK's official observability UI. In dev builds (`wxt dev`), `lib/ai/devtools.ts` registers `DevToolsTelemetry` from `@ai-sdk/devtools`; all `generateText`/`ToolLoopAgent` calls then stream runs & steps (full prompts, structured outputs, memory-tool round-trips, token usage) to a local viewer.

```bash
npx @ai-sdk/devtools@latest   # serves http://localhost:4983
pnpm --filter @gremlin/extension dev
```

The dynamic import + `import.meta.env.DEV` gate keep the package out of release bundles, and the `localhost:4983` host permission is injected into the manifest only by the `build:manifestGenerated` hook when `NODE_ENV !== 'production'`. The legacy in-extension telemetry trace list was removed — DevTools supersedes it.
* Unit tests live beside sources (`*.test.ts`) and run on the `WxtVitest()` plugin with `fakeBrowser` (`pnpm --filter @gremlin/extension test`).

---

## 3. Backend & Cloud Architecture (`apps/backend`)

> **Status: LIVE.** The extension ships BYOK by default but Gremlin Cloud is fully wired — inline sign-in in the popup's Model tab, `mode === 'cloud'` evaluation through `/api/sprint/evaluate`, and memory mirroring via `/api/memory/*` (see Memory Loop section). Billing/plan enforcement is the only unbuilt piece.

### Auth & Sessions

Better Auth (email/password) issues a session cookie scoped to the **backend domain**. Three clients talk to it:

| Client | Cookie jar | Notes |
|---|---|---|
| Web (`gremlin.fasihi.xyz/auth`) | Browser jar for backend domain | Real `signUp.email` / `signIn.email` since the mock was removed. Account rows live in Neon. |
| Popup | Extension fetches share the browser cookie jar for the request URL | Inline sign-in form; also **probes `authClient.getSession()` on open** — so signing in on the website auto-signs the extension on next popup open (empirically verify SameSite behavior per Chrome version). |
| Service worker | Same shared jar via `credentials: include` | Powers `decideOrganismReaction`'s cloud branch and memory sync; no separate login needed once any session exists. |

There is no token handoff or device-code flow — one cookie domain, three consumers.

### Data-flow when switching Local ↔ Cloud

`config.mode` answers exactly one question: **who runs the LLM** — your key locally (`self-hosted`) or server keys via proxy (`cloud`). It does NOT control syncing.

Syncing is **account-scoped**: any signed-in human mirrors their episode log and focus profile to Neon, regardless of mode. Exactly one evaluation path runs per moment; memory is always recorded locally first and never pauses on network state.

| Data | No account | Signed in (either mode) |
|---|---|---|
| LLM judgment | local agent, your key | mode decides: your key locally, or server proxy |
| Episodes + focus profile | device-only | ✅ mirrored to Neon |
| Goals + milestones | device-only | ✅ mirrored (full-list upsert by id) |
| Smart notes | device-only | ✅ mirrored |
| Diaries | device-only | ✅ today's diary mirrored on finish/reflect |

Local-only without an account: everything stays on-device. Plan-tier enforcement (`free` vs `pro`) is not yet checked server-side — pending billing.

Full sync lives in `/api/memory/*` (`routes/memory.ts` for episodes/profile, `routes/memory.sync.ts` for goals/notes/diary). Push strategy is full-list upsert-by-id/date after every mutation and judged moment; boot-time pull unions missing ids/dates into local storage (server fills gaps, local wins conflicts).

### Tech Stack
* **Framework:** [Hono v4](https://hono.dev) deployed on **Cloudflare Workers**.
* **Database:** [Neon Serverless Postgres](https://neon.tech) via `@neondatabase/serverless` (single memoized pool shared by Better Auth and sprint persistence).
* **Authentication:** [Better Auth](https://better-auth.com) with email/password and session cookies configured for browser extensions (`chrome-extension://` origins via env-driven allowlists).
  * `session.cookieCache` (5 min signed cookie) avoids a Postgres round trip on every service-worker wake-up.
  * Rate limiting persists in the `rate_limit` table (`storage: 'database'`) — in-memory counters are meaningless across isolates.
  * Client IP resolution uses `cf-connecting-ip`.
  * Plan tier (`free`/`pro`) lives on `user.additionalFields.plan` with `input: false` so it can only be mutated server-side (billing webhooks/admins).
* **AI Ingestion:** [Vercel AI SDK v7](https://sdk.vercel.ai) (`@ai-sdk/google`, `@ai-sdk/openai`, `@ai-sdk/anthropic`, `@ai-sdk/groq`). Structured output uses `generateText` + `Output.object({ schema })` (`generateObject` is deprecated). **Zero Fallbacks:** an unconfigured or failing provider surfaces an honest `503` error envelope instead of faking an `on_task` result.

### Memory Loop & Judge Architecture

Sessions are **timerless**: the human sets a goal and works; there is no countdown (`targetMinutes` is always 0; popup shows only muted elapsed minutes). Judgment replaces scheduling.

The loop: `PERCEIVE → JUDGE → INTERVENE/OBSERVE → RECORD → OUTCOME → LEARN`.

* **Presence** — `chrome.idle` (60s detection) tracks active/idle/locked. Evaluations pause entirely when the human is absent; the companion never coaches an empty chair.
* **Judge** — `FocusMonitorAgent` runs as an AI SDK v7 `ToolLoopAgent` (`stopWhen: isStepCount(5)`) with three memory tools it may call mid-reasoning: `recall_lessons`, `get_intervention_history`, `get_session_digest`. Its output schema includes `intervention: observe|nudge|callout|reset` (**observe = deliberately silent**), `noteForDiary`, and `escalationDelta`. Per-character system prompts encode the doctrine: silence when flow is healthy, gradual escalation informed by history, never repeat a remark.
* **Episode store** — `lib/memory/episodeStore.ts`: append-only `local:episodeLog` (cap 300). Interventions open episodes; the **outcome watcher** inside `evaluateCurrentState` closes them — when a post-intervention evaluation classifies the human back `on_task`, the loop records an effective outcome and decays escalation.
* **Focus profile** — `lib/memory/focusProfile.ts`: rule-updated hour-of-day focus windows, top distraction domains, per-kind intervention effectiveness; mirrored best-effort to `sync:focusProfile` so identity survives reinstalls (chrome.storage.sync quotas are tight but the small profile fits; verify empirically).
* **Psychologist** — `PsychologistAgent.distillDaily()` condenses today's episodes + diary into ≤8 distilled lessons merged into the focus profile. *(Nightly trigger wiring pending.)*
* Planned persistence additions: user-owned Export/Import JSON backup button; Gremlin Cloud mirror reusing the dormant sprint-sync endpoints.

### Cloud Memory Sync (live)

Cloud mode is fully re-enabled: sign-in lives inline in the popup's Model tab (`authClient.signIn.email`), and `mode === 'cloud'` counts toward `isConfigured`. For signed-in users, the memory loop mirrors server-side via the **`/api/memory/*`** routes (Neon tables `memory_episodes` + `focus_profiles`, schema in `schema.sql`):

* `POST /api/memory/episodes` — upsert-by-id batch push
* `GET /api/memory/episodes?since&limit` — pull for cross-device merge
* `GET|PUT /api/memory/profile` — focus profile mirror

Extension-side sync is opportunistic and local-first (`lib/api/memoryClient.ts`): after each judged moment the newest episode + profile push fire-and-forget; at service-worker boot a newer remote profile is adopted by `updatedAt` comparison. Every failure is swallowed — network state never disrupts local behavior.

### Cloud API Routes
* `GET /health`: Health check and status ping.
* `ALL /api/auth/*`: Better Auth handler (sign-up, sign-in, sign-out, session validation).
* `GET /api/user/profile`: Authenticated profile incl. plan tier. `PATCH /api/user/profile`: display-name update.
* `POST /api/sprint/evaluate`: Authenticated cloud proxy for AI reasoning (for Pro subscribers without their own API keys). Request body validated with `@hono/zod-validator`; error envelopes are typed into `hc<AppType>` responses via hono's `ApplyGlobalResponse`.
* `POST /api/sprint/start` / `GET /api/sprint/current` / `POST /api/sprint/complete`: Cross-device sprint lifecycle persisted in Neon (`sprints` table) — state survives worker eviction, unlike the previous per-isolate in-memory Map.

### Origin Configuration
CORS and Better Auth `trustedOrigins` share one allowlist builder fed by worker bindings:
* `ALLOWED_EXTENSION_IDS` — comma-separated Chrome extension IDs (become `chrome-extension://<id>` entries). Required in production.
* `ALLOWED_ORIGINS` — extra exact web origins.
* Outside production (`NODE_ENV !== 'production'`), localhost any-port and a permissive `chrome-extension://*` wildcard are tolerated for local development.

---

## 4. Web Application & Landing Page (`apps/web`)

### Tech Stack
* **Framework:** React 19 + Vite 6 + Tailwind CSS v4.
* **3D Mascot:** `src/three/VoxelGremlin.tsx` — a procedural voxel gremlin (no model files) that floats free in the hero on a transparent canvas: it bobs, sways toward the cursor, and blinks via instanced-mesh eye scaling. It is **route-split behind `React.lazy`** so Three.js ships as its own chunk (`VoxelGremlin-*.js`) and never blocks first paint; the 2D pixel `Sprite` renders as the Suspense fallback. Dust particles use normal blending and a coal/lime/teal palette tuned for the light paper background.
* **Uniform Backdrop:** One global fixed backdrop (`CleanGridBackground.tsx`) — faint blueprint grid fading toward the bottom plus a soft lime top spotlight. The old dark-theme vignette is gone, so every section and page shares the same paper color end-to-end.
* **Interactive Simulations:**
  - `InteractiveComparisonSim.tsx`: Live interactive simulation contrasting rigid domain blockers vs Gremlin context-aware AI.
  - `InteractiveBento.tsx`: Mouse-spotlight interactive cards highlighting local privacy, procedural audio, and multi-device synchronization.
* **Pages:**
  - `/`: Landing page — floating 3D hero, companion roster with voice previews, three-step walkthrough, and a closing CTA that uses lime marker-highlights on the headline instead of a full-bleed color band (keeps the accent in the system's buttons/highlights).
  - `/pricing`: Tier breakdown (Free BYOK, $5/mo Pro, $49 Founder Pass) and FAQ.
  - `/auth`: Sign in / sign up portal for Gremlin Cloud.
  - `/privacy` & `/terms`: Full compliance and security disclosures for Chrome Web Store review.
* **Shared Chrome:** Floating pill navbar and a paper-brut footer (`bg-paper`, hard-shadow brand sticker, mono uppercase column heads, dashed bottom bar with back-to-top). Section eyebrows are straight-aligned label chips — no rotation — across Home, Pricing, and doc pages.

---

## 5. Monetization & Payment Processing Architecture

### Model Strategy

| Tier | Price | Who It's For | Tech Flow |
| :--- | :--- | :--- | :--- |
| **Free BYOK** | **$0 forever** | Developers & power users who bring their own API keys (Google Gemini, OpenAI, Claude, Groq, Ollama). | Direct client-side fetch from extension service worker. $0 server/LLM cost to us. |
| **Gremlin Pro** | **$5 / month** | Non-technical users, students, and professionals wanting 1-click zero-setup focus coaching. | Subscription via Stripe / Lemon Squeezy / Polar. Edge AI proxy on Cloudflare Workers. |
| **Founder Pass** | **$49 one-time** | Early supporters wanting lifetime cloud access + exclusive companion skins. | One-time checkout with permanent flag in Neon `user` table. |

### Stripe / Polar Integration Blueprint
1. Set up a Webhook route in `apps/backend/src/routes/billing.ts` listening for `checkout.session.completed` and `customer.subscription.deleted`.
2. When a user completes checkout, update `user.tier = 'pro'` in the Neon Postgres database.
3. Extension checks `/api/auth/get-session` on launch. If `user.tier === 'pro'`, the extension operates in managed cloud mode without requesting an API key.

---

## 6. Chrome Web Store Publishing Checklist

1. **Build Production Extension:**
   ```bash
   pnpm --filter @gremlin/extension build
   ```
   This generates the optimized production bundle in `apps/extension/.output/chrome-mv3`.
2. **Zip the Output:**
   ```bash
   pnpm --filter @gremlin/extension zip
   ```
   Produces `.output/<name>-<version>-chrome.zip` with `manifest.json` at the zip root.
3. **Automated Submission (WXT native):**
   WXT ships store automation — run `pnpm --filter @gremlin/extension submit:init` once to generate
   `.env.submit` (Chrome uses the CWS Publish API OAuth flow), then release new versions with:
   ```bash
   pnpm --filter @gremlin/extension submit          # add --dry-run to verify secrets first
   ```
   Required env/secrets: `CHROME_EXTENSION_ID`, `CHROME_CLIENT_ID`, `CHROME_CLIENT_SECRET`, `CHROME_REFRESH_TOKEN`.
4. **Chrome Web Store Developer Dashboard:**
   - Upload `gremlin-extension.zip`.
   - **Permissions Justification:**
     - `storage`: Save local user preferences and focus goals.
     - `tabs`: Read active tab title/URL during active sprints to detect distractions.
     - `alarms`: Periodic background check for active focus sprints.
     - `scripting`: Inject content scripts on open tabs upon install.
   - **Single Purpose Description:** "AI-powered desk companion that coaches your focus during sprints without rigid website blacklists."
   - **Privacy Policy:** Live at `https://gremlin.fasihi.xyz/privacy` (SPA rewrite via apps/web/vercel.json).
