# 👾 Gremlin

> **A retro pixel desk companion that lives in your browser and roasts you when you start doomscrolling.**

Traditional site blockers are clumsy. They ban whole domains with blunt regexes, break your flow when you're just trying to read a documentation page on Reddit or watch a coding walkthrough on YouTube, and make you feel like you're fighting your own computer.

**Gremlin works differently.** Instead of a rigid blacklist, an AI companion sits in the corner of your screen. It watches your browsing trajectory over a rolling timeline to understand *what you're actually doing*. If you're solving a bug on StackOverflow, it leaves you in peace. If you drift into 45 minutes of meme rabbit holes while on an active sprint, it steps in.

---

## 🎭 The Roster

Pick the personality that keeps you honest:

| Companion | Vibe | Typical Reaction |
| :--- | :--- | :--- |
| **Sarge** | Unstoppable drill sergeant | *"Drop and give me twenty focus minutes. Zero excuses."* |
| **Waifu** | Sweet & clingy cheerleader | *"Anata, why are we doomscrolling? Stay focused for me, okay? 💕"* |
| **Sherlock** | Victorian detective | *"A curious detour from the case, Watson. The trail grows cold."* |
| **Kuro** | Sarcastic chaos gremlin | *"Caught in 4K 💀 Bro thought he could sneak 5 minutes of scrolling."* |
| **Sensei** | Zen master | *"Breathe. One keystroke at a time. Return to center."* |

---

## 🛠 How It Works

- **Narrative Rolling Window:** Gremlin looks at where you've been over the last few minutes (page titles, dwell times, video playback, and headings) rather than judging a single URL in a vacuum.
- **Vercel AI SDK:** Decisions are powered by structured LLM reasoning (`generateObject`), returning in-character remarks and companion moods.
- **Procedural 8-bit Audio:** Animalese speech chirps and victory fanfares are synthesized dynamically with the browser's `AudioContext`—no heavy MP3s or network audio assets required.
- **Dual Mode (Cloud or Air-Gapped BYOK):**
  - **Cloud:** Syncs your sprints with Better Auth + Cloudflare Workers.
  - **Self-Hosted / BYOK:** Runs 100% on-device inside the extension service worker with your own Gemini/Claude/OpenAI/Ollama key. Zero data leaves your machine.

---

## 📁 Repository Structure

Built as a clean Turborepo monorepo:

```
gremlin/
├── apps/
│   ├── extension/     # Chrome MV3 extension (WXT + React 19 + Tailwind v4)
│   ├── web/           # Landing page & dashboard (Vite + React 19 + Three.js)
│   └── backend/       # Edge API (Hono + Better Auth + Neon Postgres + AI SDK)
├── packages/
│   └── shared/        # Shared TypeScript interfaces & Zod schemas
└── docs/
    └── ARCHITECTURE.md # Detailed technical architecture & developer handbook
```

---

## ⚡ Quick Start (Local Setup)

### 1. Install dependencies
```bash
pnpm install
```

### 2. Copy environment configs
```bash
cp apps/extension/.env.example apps/extension/.env
cp apps/backend/.env.example apps/backend/.env
```

### 3. Spin up dev servers
```bash
# Run all workspaces concurrently
pnpm dev

# Or run them individually
pnpm dev:ext   # Launches live-reloading Chrome with extension pre-loaded
pnpm dev:web   # Runs marketing web app on http://localhost:5173
pnpm dev:api   # Runs Hono backend on http://localhost:8787
```

---

## 🏗 Building for Production

```bash
# Compile and type-check all packages
pnpm compile

# Build all production bundles
pnpm build
```

The extension bundle will be available in `apps/extension/.output/chrome-mv3` ready for Chrome Web Store packaging.

---

## 📖 Architecture & Documentation

For an in-depth technical breakdown of the WXT lifecycle, Shadow DOM isolation, procedural Web Audio synthesizer, Better Auth backend routes, and monetization architecture, see [**docs/ARCHITECTURE.md**](file:///c:/Users/rchdm/Desktop/gremlin/docs/ARCHITECTURE.md).
