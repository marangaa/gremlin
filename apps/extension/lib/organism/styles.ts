export const ORGANISM_SHADOW_CSS = /* css */ `
:host {
  position: fixed !important;
  top: 0px !important;
  left: 0px !important;
  width: 100vw !important;
  height: 100vh !important;
  pointer-events: none !important;
  z-index: 2147483647 !important;
  overflow: visible !important;
  margin: 0 !important;
  padding: 0 !important;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  user-select: none;
}

.organism-root {
  position: absolute;
  top: 0;
  left: 0;
  width: 96px;
  height: 96px;
  will-change: transform;
  pointer-events: none;
  transition: opacity 0.28s ease;
}

/* ————— Crisp Floating & Draggable Avatar ————— */
.organism-avatar {
  width: 96px;
  height: 96px;
  pointer-events: auto;
  cursor: grab;
  will-change: transform;
  touch-action: none;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: organism-float 3.5s ease-in-out infinite;
  transition: transform 0.15s ease;
}

@keyframes organism-float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-4px); }
}

.organism-avatar:hover {
  transform: scale(1.04);
}

.organism-avatar.is-dragging {
  cursor: grabbing;
  animation: none;
  transform: scale(1.08);
}

.organism-canvas {
  display: block;
  width: 96px;
  height: 96px;
  image-rendering: pixelated;
  image-rendering: crisp-edges;
}

/* ————— Ambient Mood States ————— */
.organism-root.state-peek .organism-avatar {
  opacity: 0.95;
}

.organism-root.state-sleeping .organism-avatar {
  opacity: 0.7;
}

.organism-root.state-hidden {
  opacity: 0;
  pointer-events: none;
}

/* ————— Speech Bubble —————
   Anchored in viewport coordinates by the controller (left/top set inline)
   so it can be clamped to the screen instead of clipped at viewport edges.
   Accent color flows through --pill-accent, set per-character from JS. */
.thought-pill {
  --pill-accent: #22c55e;
  position: fixed;
  background: #0d111a;
  border: 2px solid var(--pill-accent);
  color: #f8fafc;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 11.5px;
  font-weight: 500;
  line-height: 1.4;
  white-space: normal;
  width: max-content;
  max-width: 240px;
  min-width: 120px;
  text-align: left;
  box-shadow: 4px 4px 0px #000000;
  pointer-events: auto;
  cursor: pointer;
  opacity: 0;
  transform: translateY(6px) scale(0.92);
  transform-origin: center bottom;
  transition: opacity 0.22s cubic-bezier(0.16, 1, 0.3, 1), transform 0.22s cubic-bezier(0.16, 1, 0.3, 1);
  z-index: 100;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.thought-pill.is-visible {
  opacity: 1;
  transform: translateY(0) scale(1);
}

.thought-pill .pill-header {
  display: flex;
  align-items: center;
  gap: 5px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding-bottom: 3px;
}

.thought-pill .pill-badge {
  font-family: monospace;
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--pill-accent);
  letter-spacing: 0.05em;
}

.thought-pill .pill-body {
  font-size: 11.5px;
  color: #f1f5f9;
  line-height: 1.35;
}

/* Tail pointing DOWN (bubble sits above the companion) */
.thought-pill.tail-below::after {
  content: '';
  position: absolute;
  top: 100%;
  left: var(--tail-x, 50%);
  transform: translateX(-50%);
  border-width: 6px 6px 0 6px;
  border-style: solid;
  border-color: var(--pill-accent) transparent transparent transparent;
}

/* Tail pointing UP (bubble sits below the companion) */
.thought-pill.tail-above::after {
  content: '';
  position: absolute;
  bottom: 100%;
  left: var(--tail-x, 50%);
  transform: translateX(-50%);
  border-width: 0 6px 6px 6px;
  border-style: solid;
  border-color: transparent transparent var(--pill-accent) transparent;
}

/* ————— Screen FX stage (effects render here; manager toggles .active) ————— */
.organism-screen-fx {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  pointer-events: none;
  z-index: 90;
  opacity: 0;
  transition: opacity 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  perspective: 1000px;
}
.organism-screen-fx.active {
  opacity: 1;
}

/* ================= IN-PAGE NOTE HUD =================
   Same viewport-anchored, clamped placement strategy as the speech bubble. */
.note-hud {
  --pill-accent: #a3e635;
  position: fixed;
  background: #0d111a;
  border: 2px solid var(--pill-accent);
  color: #f8fafc;
  padding: 12px 14px;
  border-radius: 12px;
  width: 270px;
  box-shadow: 6px 6px 0px #000000;
  pointer-events: auto;
  opacity: 0;
  transform: translateY(6px) scale(0.92);
  transition: opacity 0.22s cubic-bezier(0.16, 1, 0.3, 1), transform 0.22s cubic-bezier(0.16, 1, 0.3, 1);
  display: none;
  z-index: 100;
}

.note-hud.is-visible {
  display: block;
  opacity: 1;
  transform: translateY(0) scale(1);
}

.note-hud-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  padding-bottom: 6px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
}

.note-hud-badge {
  font-family: monospace;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--pill-accent);
}

.note-hud-close {
  background: none;
  border: none;
  color: #94a3b8;
  font-size: 14px;
  cursor: pointer;
  padding: 0 4px;
}
.note-hud-close:hover {
  color: #ffffff;
}

.note-hud-textarea {
  width: 100%;
  box-sizing: border-box;
  background: #06080d;
  border: 1.5px solid rgba(255, 255, 255, 0.15);
  border-radius: 6px;
  color: #ffffff;
  font-size: 12px;
  font-family: inherit;
  padding: 6px 8px;
  resize: none;
  min-height: 52px;
  outline: none;
  margin-bottom: 6px;
}
.note-hud-textarea:focus {
  border-color: var(--pill-accent);
}

.note-hud-snippet {
  font-size: 10.5px;
  font-family: monospace;
  color: #94a3b8;
  background: rgba(255, 255, 255, 0.04);
  border-left: 2px solid var(--pill-accent);
  padding: 3px 6px;
  margin-bottom: 8px;
  border-radius: 0 4px 4px 0;
  max-height: 38px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.note-hud-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
}

.note-hud-btn-save {
  flex: 1;
  background: #a3e635;
  color: #000000;
  font-size: 11px;
  font-weight: 700;
  border: 1.5px solid #000000;
  border-radius: 6px;
  padding: 5px 8px;
  cursor: pointer;
  box-shadow: 2px 2px 0px #000000;
  transition: transform 0.1s ease;
}
.note-hud-btn-save:active {
  transform: translate(1px, 1px);
  box-shadow: 1px 1px 0px #000000;
}

.note-hud-btn-poke {
  background: #1e293b;
  color: #ffffff;
  font-size: 11px;
  font-weight: 600;
  border: 1.5px solid rgba(255, 255, 255, 0.15);
  border-radius: 6px;
  padding: 5px 8px;
  cursor: pointer;
}
.note-hud-btn-poke:hover {
  background: #334155;
}
`;
