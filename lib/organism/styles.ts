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

/* Free Floating & Draggable Avatar (Stable, No Bouncing) */
.organism-avatar {
  width: 96px;
  height: 96px;
  pointer-events: auto;
  cursor: grab;
  will-change: transform;
  filter: drop-shadow(0 8px 18px rgba(0, 0, 0, 0.45));
  touch-action: none;
  display: flex;
  align-items: center;
  justify-content: center;
}

.organism-avatar.is-dragging {
  cursor: grabbing;
  filter: drop-shadow(0 14px 28px rgba(0, 0, 0, 0.65)) brightness(1.08);
  transform: scale(1.05);
}

.organism-canvas {
  display: block;
  width: 96px;
  height: 96px;
  image-rendering: pixelated;
  image-rendering: crisp-edges;
}

/* ————— Ambient State Styles (Calm & Grounded) ————— */

.organism-root.state-peek .organism-avatar {
  opacity: 0.95;
}

.organism-root.state-sleeping .organism-avatar {
  opacity: 0.65;
}

.organism-root.state-hidden {
  opacity: 0;
  pointer-events: none;
}

/* ————— Viewport-Smart Thought Pill ————— */
.thought-pill {
  position: absolute;
  background: rgba(15, 23, 42, 0.94);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border: 1px solid rgba(255, 255, 255, 0.16);
  color: #f8fafc;
  padding: 8px 14px;
  border-radius: 14px;
  font-size: 12px;
  font-weight: 500;
  line-height: 1.4;
  white-space: normal;
  max-width: 220px;
  min-width: 110px;
  text-align: center;
  box-shadow: 0 14px 32px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(0, 0, 0, 0.25);
  pointer-events: auto;
  cursor: pointer;
  opacity: 0;
  transform: scale(0.92);
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  z-index: 100;
}

/* Position Above (Default) */
.thought-pill.pos-above {
  bottom: calc(100% + 10px);
  left: 50%;
  transform: translateX(-50%) translateY(6px) scale(0.92);
}
.thought-pill.pos-above.is-visible {
  opacity: 1;
  transform: translateX(-50%) translateY(0) scale(1);
}
.thought-pill.pos-above::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  border-width: 6px 6px 0 6px;
  border-style: solid;
  border-color: rgba(15, 23, 42, 0.94) transparent transparent transparent;
}

/* Position Below (when near top of viewport) */
.thought-pill.pos-below {
  top: calc(100% + 10px);
  left: 50%;
  transform: translateX(-50%) translateY(-6px) scale(0.92);
}
.thought-pill.pos-below.is-visible {
  opacity: 1;
  transform: translateX(-50%) translateY(0) scale(1);
}
.thought-pill.pos-below::after {
  content: '';
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  border-width: 0 6px 6px 6px;
  border-style: solid;
  border-color: transparent transparent rgba(15, 23, 42, 0.94) transparent;
}
`;
