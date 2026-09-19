# 👾 Gremlin

> **A retro pixel desk companion that lives in your browser and roasts you when you start doomscrolling.**

🌐 **Website:** [gremlin.fasihi.xyz](https://gremlin.fasihi.xyz) · 🐙 **Source:** [github.com/marangaa/gremlin](https://github.com/marangaa/gremlin)

Traditional site blockers are clumsy. They ban whole domains with blunt regexes, break your flow when you're just trying to read a documentation page on Reddit or watch a coding walkthrough on YouTube, and make you feel like you're fighting your own computer.

**Gremlin works differently.** Instead of a rigid blacklist, an AI companion sits in the corner of your screen. It watches your browsing trajectory over a rolling timeline to understand *what you're actually doing*. If you're solving a bug on StackOverflow, it leaves you in peace. If you drift into 45 minutes of meme rabbit holes while on an active sprint, it steps in.

---

## 🎭 The Roster

Pick the personality that keeps you honest:

| Companion | Vibe | Typical Reaction |
| :--- | :--- | :--- |
| **Sarge** | The drill instructor | *"You have twelve minutes left on this sprint and you're reading about watches. Hands on keyboard. Move."* |
| **Momo** | The cheerleader | *"Changing your Notion font for forty minutes isn't work. We both know it. Write the first line."* |
| **Sherlock** | The investigator | *"We began with API documentation ten minutes ago, and have arrived at vintage keyboards. Fascinating evasion."* |
| **Kuro** | The chaos gremlin | *"You went from debugging a payment flow to reading about medieval siege weapons in under six clicks. Tragic."* |
| **Sensei** | The zen master | *"A wandering mind searches for truth; your mind searches for memes about bread. Return to your purpose."* |
| **Byte** | The rogue hacker | `"> err: attention buffer exhausted on cat videos. allocating sigkill to non-essential threads."` |
| **Pixel** | The chaotic cat | *"I sleep eighteen hours a day and still contribute more to this household than you did this afternoon."* |
| **Zeta** | The cosmic abductor | *"Telemetry confirms specimen abandoned primary survival task to view compressed footage of stranger's lunch."* |

---

## 🛠 How It Works

- **Narrative Rolling Window:** Gremlin looks at where you've been over the last few minutes (page titles, dwell times, video playback, and headings) rather than judging a single URL in a vacuum.
- **Vercel AI SDK v7:** Decisions are powered by structured LLM reasoning (`generateText` + `Output.object`) and memory tools via an agentic loop, returning in-character remarks, moods, and screen effects.
- **Procedural 8-bit Audio:** Animalese speech chirps and victory fanfares are synthesized dynamically with the browser's `AudioContext`—no heavy MP3s or network audio assets required.
- **Dual Mode (Cloud or Air-Gapped BYOK):**
  - **Cloud:** Syncs your focus profile, diary, and Pro subscription with Better Auth + Polar.sh + Neon on Cloudflare Workers.
  - **Self-Hosted / BYOK:** Runs 100% on-device inside the extension service worker with your own Gemini/Claude/OpenAI/Ollama key. Zero data leaves your machine.

---

## 📁 Repository Structure

Built as a clean Turborepo monorepo:

```
gremlin/
├── apps/
│   ├── extension/     # Chrome MV3 extension (WXT + React 19 + Tailwind v4)
│   ├── web/           # Landing page & dashboard (Vite + React 19 + Three.js)
│   └── backend/       # Edge API (Hono + Better Auth + Polar.sh + Neon Postgres + AI SDK)
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
cp apps/backend/.env.example apps/backend/.dev.vars
```

### 3. Spin up dev servers
```bash
# Run all workspaces concurrently
pnpm dev

# Or run them individually
pnpm dev:ext   # Launches live-reloading Chrome with extension pre-loaded
pnpm dev:web   # Runs marketing web app on http://localhost:5173
pnpm dev:api   # Runs Hono backend on http://localhost:8700
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

For an in-depth technical breakdown of the WXT lifecycle, Shadow DOM isolation, procedural Web Audio synthesizer, Better Auth backend routes, and Polar.sh monetization architecture, see [**docs/ARCHITECTURE.md**](file:///c:/Users/rchdm/Desktop/gremlin/docs/ARCHITECTURE.md).
