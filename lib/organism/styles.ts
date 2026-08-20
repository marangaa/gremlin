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

/* Free Floating & Draggable Avatar */
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

/* ————— Character Screen Distraction Effects ————— */
.organism-screen-fx {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  pointer-events: none;
  z-index: 90;
  opacity: 0;
  transition: opacity 0.3s ease;
}
.organism-screen-fx.active {
  opacity: 1;
}

/* 1. Gorg Beam */
.fx-gorg-beam {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding-top: 30px;
}
.fx-gorg-beam .ufo-saucer {
  font-size: 48px;
  animation: ufo-hover 1.2s ease-in-out infinite;
}
@keyframes ufo-hover {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}
.fx-gorg-beam .light-cone {
  width: 220px;
  height: 320px;
  background: linear-gradient(180deg, rgba(34, 197, 94, 0.35) 0%, rgba(34, 197, 94, 0.02) 100%);
  clip-path: polygon(40% 0%, 60% 0%, 100% 100%, 0% 100%);
  margin-top: -10px;
}
.fx-gorg-beam .fx-banner {
  background: rgba(34, 197, 94, 0.92);
  color: #052e16;
  font-weight: 800;
  font-size: 13px;
  padding: 8px 18px;
  border-radius: 999px;
  margin-top: -40px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
  letter-spacing: 0.04em;
}

/* 2. Bolt Caution */
.fx-bolt-caution .hazard-stripe {
  position: absolute;
  left: 0;
  width: 100%;
  background: repeating-linear-gradient(
    -45deg,
    #fbbf24,
    #fbbf24 16px,
    #18181b 16px,
    #18181b 32px
  );
  color: #fbbf24;
  font-weight: 900;
  font-size: 11px;
  text-align: center;
  padding: 6px 0;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.8);
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.4);
}
.fx-bolt-caution .hazard-stripe.top { top: 0; }
.fx-bolt-caution .hazard-stripe.bottom { bottom: 0; }

/* 3. Momo Bubbles */
.fx-momo-garden {
  position: absolute;
  inset: 0;
}
.momo-vignette {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at center, transparent 60%, rgba(244, 114, 182, 0.25) 100%);
}
.fx-bubble {
  position: absolute;
  bottom: -40px;
  animation: bubble-float 3s ease-in forwards;
}
@keyframes bubble-float {
  0% { transform: translateY(0) scale(0.6); opacity: 0; }
  20% { opacity: 1; }
  100% { transform: translateY(-100vh) scale(1.1); opacity: 0; }
}
.momo-banner {
  position: absolute;
  bottom: 40px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(244, 114, 182, 0.94);
  color: #831843;
  font-weight: 700;
  font-size: 12px;
  padding: 8px 18px;
  border-radius: 999px;
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.35);
}

/* 4. Kuro Soot & Mischief */
.fx-kuro-soot {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at center, transparent 50%, rgba(239, 68, 68, 0.22) 100%);
}
.kuro-claw {
  position: absolute;
  font-size: 44px;
}
.kuro-claw.top-left { top: 20px; left: 20px; transform: rotate(-30deg); }
.kuro-claw.top-right { top: 20px; right: 20px; transform: rotate(30deg); }
.kuro-banner {
  position: absolute;
  top: 30px;
  left: 50%;
  transform: translateX(-50%);
  background: #dc2626;
  color: #ffffff;
  font-weight: 800;
  font-size: 12px;
  padding: 8px 20px;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(220, 38, 38, 0.5);
  letter-spacing: 0.05em;
}

/* 5. Glitch CRT */
.fx-glitch-crt {
  position: absolute;
  inset: 0;
}
.crt-scanlines {
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    0deg,
    rgba(0, 0, 0, 0.12),
    rgba(0, 0, 0, 0.12) 1px,
    transparent 1px,
    transparent 3px
  );
}
.glitch-banner {
  position: absolute;
  top: 40px;
  left: 50%;
  transform: translateX(-50%);
  background: #0284c7;
  color: #f0f9ff;
  font-family: monospace;
  font-weight: 700;
  font-size: 12px;
  padding: 8px 16px;
  border-radius: 4px;
  box-shadow: 0 8px 20px rgba(2, 132, 199, 0.4);
  letter-spacing: 0.08em;
}
`;
