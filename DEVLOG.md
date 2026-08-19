# Devlog

## 2026-08-20 — v0.3.0: Dual Cloud & OSS Architecture, Multi-Archetype Sprites & Control Hub

**Scope:** Completed the overhaul from virtual pet to **Personal AI Organism**. Purged all tamagotchi metrics (happiness, pets, clicking-to-pet), built dual Cloud Managed + Self-Hosted inference architecture, multi-archetype vector sprites, and a futuristic Control Hub.

### What was built

- **Complete Purge of Virtual Pet Mechanics:**
  - Removed `happiness`, `pets`, clicking-to-pet counters, decay intervals, and heart particles.
  - Replaced with **Focus Sprints**, **Behavioral Divergence Detection**, and **Contextual AI Telemetry**.
- **Dual Cloud Offering vs. Self-Hosted OSS (`lib/storage/index.ts`, `lib/ai/engine.ts`):**
  - **Cloud Managed Mode**: Zero setup, connect to cloud gateway / managed inference, opt-in session sync.
  - **Self-Hosted OSS Mode**: Connect to local Ollama (`http://localhost:11434/v1`), LM Studio, or custom OpenAI-compatible server.
  - **Strict Privacy Architecture**: Ephemeral local storage for tab dwell buffer; zero storage of raw HTML, form inputs, passwords, or PII.
- **5 High-Fidelity Character Archetypes (`lib/organism/sprites.ts`, `lib/personalities/types.ts`):**
  - **Nexus-01** 💠 (Cybernetic AI Core with rotating orbital gyroscopes, telemetry pulses, digital HUD visor)
  - **Cipher** 🕵️ (Noir Investigator with amber optical scanner lens and silhouette fedora)
  - **Aero** 🍃 (Ethereal Spirit Wisp with glowing ambient auroras and luminous eyes)
  - **Kuro** 👾 (Shadow Gremlin with neon horns, cyber fangs, and playful remarks)
  - **Atlas** ⚙️ (Executive Automaton with segmented pauldrons and sapphire reactor lens)
- **Top Layer Viewport Presence (`lib/organism/styles.ts`, `lib/organism/controller.ts`):**
  - Subtle corner docking (`bottom-right`, `bottom-left`, `top-right`).
  - Edge-peeking animations, floating idle hover, `--pupil-x` cursor gaze tracking.
  - Glassmorphic Thought Pill with auto-dismiss.
- **Re-imagined Control Hub (`entrypoints/popup/App.tsx`, `App.css`):**
  - **Sprint Focus Center**: Objective input, duration presets (15m/25m/45m/60m), countdown timer.
  - **Archetype Selector Grid**: Visual selection cards for all 5 organism models.
  - **Telemetry Dashboard**: Daily focus minutes, divergence count, current state badge.
  - **Observation Timeline**: Real-time activity stream recording divergences, returns, and milestones.
  - **Infrastructure Settings Drawer**: Operating mode switcher, custom endpoint/model configuration, dock positioning, and chattiness slider (`quiet`, `balanced`, `chatty`).

### Verification

- `pnpm compile` (`tsc --noEmit`): Clean (0 errors).
- `pnpm build` (`wxt build`): Clean (713.72 kB Chrome MV3 bundle in `.output/chrome-mv3`).

---

## 2026-08-20 — v0.2.0: Personal AI Organism Production Architecture

**Scope:** Initial architectural restructuring based on `build.md`.
