# Devlog

## 2026-08-20 — v0.4.0: Dynamic Habitat UI, Web Audio Synthesis, Screen FX & Page Extraction

**Scope:** Complete overhaul of UI into the dynamic character **Habitat**, elimination of all cyber clichés with grounded natural dialogue, zero-asset Web Audio speech synthesis engine, character distraction screen effects, and privacy-first page content extraction.

### What was built

- **The Habitat Dynamic UI (`entrypoints/popup/App.tsx`, `App.css`):**
  - Title, palette, card styling, and personality automatically morph based on selected companion:
    - 👽 **Gorg's Mothership** *(Alien Expedition Habitat)*
    - ⚡ **Bolt's Workshop** *(Builder & Mechanic Bench)*
    - 🐙 **Momo's Garden** *(Mindful Zen Sanctuary)*
    - 👹 **Kuro's Lair** *(Mischief & Accountability Den)*
    - 👾 **Glitch's Arcade** *(Retro 8-Bit Stage)*
  - Replaced all cyber jargon with warm, organic, grounded language.
  - Interactive "Poke Companion" button with live procedural audio and dialogue feedback.
  - Audio volume slider, mute toggle, and screen effects switch.
- **Zero-Asset Procedural Web Audio Engine (`lib/audio/soundEngine.ts`):**
  - Formant frequency-modulated **Animalese speech chirps** matched to character timbre.
  - Rising arpeggio sprint-start chime, victory fanfare, poke pop, and distraction alert.
  - Zero external audio files—100% synthesized in real-time via `AudioContext`.
- **Character Distraction Screen Overlays (`lib/effects/screenEffects.ts`, `lib/organism/styles.ts`):**
  - Isolated Shadow DOM overlays triggered during sprint goal divergences:
    - **Gorg**: Alien UFO tractor beam shimmer.
    - **Bolt**: Animated caution hazard stripes.
    - **Momo**: Heart bubble shower and cozy pink vignette.
    - **Kuro**: Soot puffs and playful corner scratch marks.
    - **Glitch**: Retro CRT scanline flicker.
- **Privacy-First Page Content Extraction (`lib/events/extractor.ts`, `lib/events/privacy.ts`):**
  - Extracts title, OpenGraph metadata, top headings (`h1`, `h2`), estimated read time, and scroll depth on `requestIdleCallback`.
  - URL query sanitizer stripping tokens, session keys, and tracking parameters.
  - Strict blacklist for banking, webmail, password managers, and zero scraping of form inputs.
- **3-Tier Debounced Event Pipeline (`entrypoints/background.ts`):**
  - 350ms leading/trailing in-memory debounce on `tabs.onActivated` and `tabs.onUpdated`.
  - WXT alarms for MV3 service worker lifecycle persistence.

### Verification

- `pnpm compile` (`tsc --noEmit`): 0 errors.
- `pnpm build` (`wxt build`): Clean Chrome MV3 build in `.output/chrome-mv3` (729.86 kB).
- Git commits: `e7b17bf`.
