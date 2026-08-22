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
   - Content scripts listen to `ctx.onInvalidated()`. When the extension is uninstalled or disabled in Chrome, all `requestAnimationFrame` loops, audio contexts, storage watchers, messaging listeners, and injected DOM nodes are purged immediately.

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
* `entrypoints/sidepanel/SidepanelApp.tsx`: Focus Diary sidepanel sharing the paper shell. The AI telemetry drawer is fully lazy: its chunk is `React.lazy`-split and both the trace array read and its `telemetryStorage.watch()` subscription are deferred until the drawer is first opened, so panel startup never deserializes telemetry history.
* Unit tests live beside sources (`*.test.ts`) and run on the `WxtVitest()` plugin with `fakeBrowser` (`pnpm --filter @gremlin/extension test`).

---

## 3. Backend & Cloud Architecture (`apps/backend`)

> **Status (v1 launch): DORMANT.** The extension ships BYOK-only — cloud sign-in is hidden from the UI (`userSessionStorage` stays defined for schema stability, but nothing reads it). All server-side infrastructure remains deployed and intact for reintroduction: Better Auth routes, `/api/sprint/*` sync endpoints, plan tiers on `user.additionalFields`, and the extension's `config.mode === 'cloud'` evaluation branch in `lib/ai/engine.ts`. To re-enable: surface an auth row in the Model tab (`authClient.getSession()` → flip mode), restore the popup session watch, and ship billing.

### Tech Stack
* **Framework:** [Hono v4](https://hono.dev) deployed on **Cloudflare Workers**.
* **Database:** [Neon Serverless Postgres](https://neon.tech) via `@neondatabase/serverless` (single memoized pool shared by Better Auth and sprint persistence).
* **Authentication:** [Better Auth](https://better-auth.com) with email/password and session cookies configured for browser extensions (`chrome-extension://` origins via env-driven allowlists).
  * `session.cookieCache` (5 min signed cookie) avoids a Postgres round trip on every service-worker wake-up.
  * Rate limiting persists in the `rate_limit` table (`storage: 'database'`) — in-memory counters are meaningless across isolates.
  * Client IP resolution uses `cf-connecting-ip`.
  * Plan tier (`free`/`pro`) lives on `user.additionalFields.plan` with `input: false` so it can only be mutated server-side (billing webhooks/admins).
* **AI Ingestion:** [Vercel AI SDK v7](https://sdk.vercel.ai) (`@ai-sdk/google`, `@ai-sdk/openai`, `@ai-sdk/anthropic`, `@ai-sdk/groq`). Structured output uses `generateText` + `Output.object({ schema })` (`generateObject` is deprecated). **Zero Fallbacks:** an unconfigured or failing provider surfaces an honest `503` error envelope instead of faking an `on_task` result.

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
