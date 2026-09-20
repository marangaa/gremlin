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

.organism-avatar.is-beaming {
  animation: none !important;
  filter: drop-shadow(0 0 10px rgba(139, 92, 246, 0.75));
  transform: scale(1.04);
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

/* ================= IN-PAGE NOTE CARD =================
   Tactile, character-themed card design anchored to the companion, moving in lockstep. */
.note-hud {
  --pill-accent: #a3e635;
  position: fixed;
  background: #0d111a;
  color: #f8fafc;
  border: 2px solid #000000;
  border-top: 3.5px solid var(--pill-accent);
  border-radius: 8px;
  width: 280px;
  padding: 10px 12px;
  box-shadow: 4px 4px 0px #000000, 0 14px 28px -4px rgba(0, 0, 0, 0.75);
  pointer-events: auto;
  opacity: 0;
  transform: translateY(4px) scale(0.96);
  transition: opacity 0.18s cubic-bezier(0.16, 1, 0.3, 1), transform 0.18s cubic-bezier(0.16, 1, 0.3, 1);
  display: none;
  z-index: 2147483647;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}

.note-hud.is-visible {
  display: block;
  opacity: 1;
  transform: translateY(0) scale(1);
}

.note-hud.is-dragging,
.thought-pill.is-dragging {
  transition: none !important;
}

/* Tail pointing DOWN (note card sits above the companion) */
.note-hud.tail-below::after {
  content: '';
  position: absolute;
  top: 100%;
  left: var(--tail-x, 50%);
  transform: translateX(-50%);
  border-width: 7px 7px 0 7px;
  border-style: solid;
  border-color: #0d111a transparent transparent transparent;
  filter: drop-shadow(0 2px 0 #000000);
}

/* Tail pointing UP (note card sits below the companion) */
.note-hud.tail-above::after {
  content: '';
  position: absolute;
  bottom: 100%;
  left: var(--tail-x, 50%);
  transform: translateX(-50%);
  border-width: 0 7px 7px 7px;
  border-style: solid;
  border-color: transparent transparent #0d111a transparent;
  filter: drop-shadow(0 -2px 0 #000000);
}

.note-hud-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
  padding-bottom: 7px;
  border-bottom: 1px dashed rgba(255, 255, 255, 0.15);
}

.note-hud-title-group {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  flex: 1;
}

.note-hud-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.14);
  padding: 1.5px 6px;
  border-radius: 4px;
  flex-shrink: 0;
}

.note-hud-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--pill-accent);
  box-shadow: 0 0 5px var(--pill-accent);
  flex-shrink: 0;
}

.note-hud-title {
  font-family: monospace;
  font-size: 10.5px;
  font-weight: 700;
  color: #f8fafc;
  text-transform: capitalize;
}

.note-hud-domain {
  font-family: monospace;
  font-size: 9.5px;
  color: #94a3b8;
  background: rgba(0, 0, 0, 0.35);
  padding: 2px 6px;
  border-radius: 3px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 110px;
}

.note-hud-close {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #94a3b8;
  width: 18px;
  height: 18px;
  border-radius: 3px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  line-height: 1;
  cursor: pointer;
  padding: 0;
  flex-shrink: 0;
  transition: background 0.12s ease, border-color 0.12s ease, color 0.12s ease;
}
.note-hud-close:hover {
  background: rgba(239, 68, 68, 0.18);
  border-color: rgba(239, 68, 68, 0.45);
  color: #fca5a5;
}

.note-hud-snippet {
  font-size: 10.5px;
  font-family: monospace;
  color: #cbd5e1;
  background: #080c14;
  border: 1px solid #1e293b;
  border-left: 3px solid var(--pill-accent);
  padding: 5px 8px;
  margin-bottom: 8px;
  border-radius: 0 4px 4px 0;
  line-height: 1.4;
  max-height: 42px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-style: italic;
}

.note-hud-input-wrap {
  margin-bottom: 8px;
}

.note-hud-textarea {
  width: 100%;
  box-sizing: border-box;
  background: #060910;
  border: 1.5px solid #1e293b;
  border-radius: 5px;
  color: #f8fafc;
  font-size: 11.5px;
  font-family: inherit;
  padding: 7px 9px;
  resize: none;
  min-height: 56px;
  outline: none;
  line-height: 1.45;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.5);
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}
.note-hud-textarea::placeholder {
  color: #475569;
}
.note-hud-textarea:focus {
  border-color: var(--pill-accent);
  box-shadow: 0 0 0 1px var(--pill-accent), inset 0 2px 4px rgba(0, 0, 0, 0.5);
}

.note-hud-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.note-hud-hint {
  font-family: monospace;
  font-size: 9px;
  color: #64748b;
  user-select: none;
}

.note-hud-btn-save {
  background: var(--pill-accent);
  color: #0c1017;
  font-family: monospace;
  font-size: 11px;
  font-weight: 700;
  border: 1.5px solid #000000;
  border-radius: 4px;
  padding: 4px 11px;
  cursor: pointer;
  box-shadow: 2px 2px 0px #000000;
  transition: transform 0.08s ease, box-shadow 0.08s ease, filter 0.08s ease;
}
.note-hud-btn-save:hover {
  filter: brightness(1.08);
  transform: translate(-0.5px, -0.5px);
  box-shadow: 2.5px 2.5px 0px #000000;
}
.note-hud-btn-save:active {
  transform: translate(1px, 1px);
  box-shadow: 0px 0px 0px #000000;
}
`;
