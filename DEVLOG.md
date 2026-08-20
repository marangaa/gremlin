# Devlog

## 2026-08-20 — v0.3.2: Fixed Viewport Scroll Isolation, Kenney Pixel Sprites & Motion Grounding

**Scope:** Resolved page scrolling movement issue by locking light-DOM and shadow-DOM host styling, purged sidebar references, removed vertical sine bobbing/wobbling, and implemented authentic Kenney-style pixel character models.

### What was resolved

- **Fixed Viewport Scroll Stability (`entrypoints/content.ts`, `lib/organism/styles.ts`):**
  - Configured inline `host.style.cssText` on the light DOM container alongside `:host` with `position: fixed !important; inset: 0 !important; pointer-events: none !important; z-index: 2147483647 !important;`.
  - The organism is now permanently pinned to the browser viewport (window) and never scrolls or shifts when the webpage is scrolled.
- **Removed Bouncing / Wobbling Animations:**
  - Removed all `translateY` sine-wave bobbing in CSS (`@keyframes org-float`) and canvas rendering loops.
  - The organism remains calm, grounded, stationary, and non-distracting while idling.
- **Purged All Sidebar / Sidepanel References:**
  - Completely cleaned out `entrypoints/sidepanel` directory and associated manifest permissions.
- **Authentic Kenney-Style Pixel Characters (`lib/organism/spriteEngine.ts`, `lib/personalities/types.ts`):**
  - **Gorg** 👽 (Kenney Green Alien with antenna sensors, belly patch, and expressive gaze)
  - **Bolt** ⚡ (Kenney Cyber Bot with yellow chassis and scanning cyber visor)
  - **Momo** 🐙 (Kenney Pink Puff with floppy ears, blushing cheeks, and blinking gaze)
  - **Kuro** 👹 (Kenney Red Imp with crimson horns and cute fangs)
  - **Glitch** 👾 (Kenney Blue Ghost with pixel shades and wavy skirt)

### Verification

- `pnpm compile` (`tsc --noEmit`): 0 errors.
- `pnpm build` (`wxt build`): Clean Chrome MV3 build in `.output/chrome-mv3` (711.88 kB).
- Git commits: `a288762`.
