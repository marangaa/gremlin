export const ORGANISM_SHADOW_CSS = /* css */ `
:host {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  pointer-events: none;
  z-index: 2147483647;
  overflow: hidden;
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

/* Free Floating & Draggable Avatar */
.organism-avatar {
  width: 96px;
  height: 96px;
  pointer-events: auto;
  cursor: grab;
  will-change: transform;
  filter: drop-shadow(0 10px 22px rgba(0, 0, 0, 0.5));
  touch-action: none;
  display: flex;
  align-items: center;
  justify-content: center;
}

.organism-avatar.is-dragging {
  cursor: grabbing;
  filter: drop-shadow(0 14px 28px rgba(0, 0, 0, 0.65)) brightness(1.08);
  transform: scale(1.06);
}

.organism-canvas {
  display: block;
  width: 96px;
  height: 96px;
  image-rendering: pixelated;
}

/* ————— Ambient State Animations ————— */

/* 1. Idle Ambient Floating */
.organism-root.state-idle .organism-avatar:not(.is-dragging),
.organism-root.state-watching .organism-avatar:not(.is-dragging) {
  animation: org-float 3.6s ease-in-out infinite;
}
@keyframes org-float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
}

/* 2. Peek (Subtle glow and edge pulse) */
.organism-root.state-peek .organism-avatar {
  animation: org-peek-pulse 2s ease-in-out infinite;
}
@keyframes org-peek-pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.06); }
}

/* 3. Curious / Head Tilt */
.organism-root.state-curious .organism-avatar {
  animation: org-curious 1.8s ease-in-out infinite;
}
@keyframes org-curious {
  0%, 100% { transform: rotate(0deg) translateY(0); }
  50% { transform: rotate(7deg) translateY(-4px); }
}

/* 4. Confused / Slight Jitter */
.organism-root.state-confused .organism-avatar {
  animation: org-confused 1.2s ease-in-out infinite;
}
@keyframes org-confused {
  0%, 100% { transform: rotate(0deg); }
  25% { transform: rotate(-6deg) translateY(-2px); }
  75% { transform: rotate(6deg) translateY(-2px); }
}

/* 5. Suspicious / Scan */
.organism-root.state-suspicious .organism-avatar {
  animation: org-suspicious 1.5s ease-in-out infinite;
}
@keyframes org-suspicious {
  0%, 100% { transform: scale(1, 0.95); }
  50% { transform: scale(1.06, 0.92) translateY(2px); }
}

/* 6. Annoyed / Jitter */
.organism-root.state-annoyed .organism-avatar {
  animation: org-jitter 0.4s ease-in-out 3;
}
@keyframes org-jitter {
  0%, 100% { transform: translate(0, 0) rotate(0deg); }
  25% { transform: translate(-4px, -2px) rotate(-4deg); }
  75% { transform: translate(4px, 0) rotate(4deg); }
}

/* 7. Celebrating / Victory Bounce */
.organism-root.state-celebrating .organism-avatar {
  animation: org-celebrate 0.65s ease-in-out infinite;
}
@keyframes org-celebrate {
  0%, 100% { transform: translateY(0) scale(1); }
  50% { transform: translateY(-18px) scale(1.1) rotate(5deg); }
}

/* 8. Shocked / Recoil */
.organism-root.state-shocked .organism-avatar {
  animation: org-shock 0.5s cubic-bezier(0.2, 0.8, 0.3, 1) 1;
}
@keyframes org-shock {
  0% { transform: scale(1.18, 0.82); }
  40% { transform: translateY(-24px) scale(0.9, 1.12); }
  70% { transform: translateY(0) scale(1.08, 0.92); }
  100% { transform: translateY(0); }
}

/* 9. Thinking */
.organism-root.state-thinking .organism-avatar {
  animation: org-think 2.4s ease-in-out infinite;
}
@keyframes org-think {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  50% { transform: translateY(-3px) rotate(-6deg); }
}

/* 10. Sleeping */
.organism-root.state-sleeping .organism-avatar {
  opacity: 0.65;
  transform: translateY(6px);
}

/* 11. Hidden */
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
  transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1);
  z-index: 100;
}

/* Position Above (Default) */
.thought-pill.pos-above {
  bottom: calc(100% + 12px);
  left: 50%;
  transform: translateX(-50%) translateY(8px) scale(0.92);
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
  top: calc(100% + 12px);
  left: 50%;
  transform: translateX(-50%) translateY(-8px) scale(0.92);
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
