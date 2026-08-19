# Devlog

## 2026-08-20 — v0.3.1: Canvas SpriteEngine Infrastructure & Viewport Root Injection

**Scope:** Implemented Canvas-based Sprite Animation Engine with multi-archetype frame rendering, gaze tracking, particle systems (sparks, zzz, scan lines), and restored `entrypoints/content.ts` with root `html` Shadow DOM mounting.

### What was built

- **Canvas SpriteEngine (`lib/organism/spriteEngine.ts`):**
  - High-performance HTML5 Canvas renderer with `imageSmoothingEnabled = false` for crisp, pixel-perfect rendering across all screen resolutions.
  - Multi-archetype frame generators for **Nexus-01** (gyroscope rings + HUD), **Cipher** (fedora silhouette + amber monocle), **Aero** (ethereal wisp + sprout), **Kuro** (shadow imp + fangs), and **Atlas** (segmented pauldrons + reactor core).
  - Dynamic 2D cursor gaze tracking calculating normalized gaze vectors and updating optical pupils.
  - Real-time particle system supporting ambient sleeping `z` bubbles, victory celebration sparks, and diagnostic scan lines.
- **Root Overlay Mounting (`entrypoints/content.ts`):**
  - Re-anchored WXT `createShadowRootUi` to `'html'` / `document.documentElement` with `position: 'overlay'`, ensuring the organism is never clipped by `body { overflow: hidden; }` or CSS layout transformations on third-party sites.
- **Viewport Draggable Controller (`lib/organism/controller.ts`):**
  - Viewport coordinate calculation with boundary clamping and storage persistence across pages.
  - Smart vertical thought-pill orientation flipping (`.pos-above` vs `.pos-below`).

### Verification

- `pnpm compile` (`tsc --noEmit`): 0 errors.
- `pnpm build` (`wxt build`): Chrome MV3 bundle built in 3.8s in `.output/chrome-mv3`.
- Git commits: `92528e3`.
