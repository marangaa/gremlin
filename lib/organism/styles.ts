export const ORGANISM_SHADOW_CSS = /* css */ `
:host {
  position: fixed;
  z-index: 2147483647;
  pointer-events: none;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  user-select: none;
}

/* Docking Configurations */
:host([data-dock="bottom-right"]) {
  right: 24px;
  bottom: 20px;
}
:host([data-dock="bottom-left"]) {
  left: 24px;
  bottom: 20px;
}
:host([data-dock="top-right"]) {
  right: 24px;
  top: 20px;
}

.organism-root {
  position: relative;
  width: 90px;
  height: 90px;
  --pupil-x: 0px;
  transition: transform 0.28s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.28s ease;
}

/* Base Floating / Hover */
.organism-avatar {
  width: 90px;
  height: 90px;
  pointer-events: auto;
  cursor: grab;
  will-change: transform;
  filter: drop-shadow(0 8px 18px rgba(0, 0, 0, 0.45));
}
.organism-avatar:active {
  cursor: grabbing;
}

.organism-svg {
  width: 100%;
  height: 100%;
  display: block;
}

/* ————— Orbital Rings Animation (Nexus) ————— */
.org-orbital-1 {
  transform-origin: 50px 50px;
  animation: org-spin 12s linear infinite;
}
.org-orbital-2 {
  transform-origin: 50px 50px;
  animation: org-spin-reverse 8s linear infinite;
}
@keyframes org-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
@keyframes org-spin-reverse {
  from { transform: rotate(360deg); }
  to { transform: rotate(0deg); }
}

/* ————— State Animations ————— */

/* 1. Idle Hover */
.organism-root.state-idle .organism-avatar,
.organism-root.state-watching .organism-avatar {
  animation: org-hover 3.2s ease-in-out infinite;
}
@keyframes org-hover {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-5px); }
}

/* 2. Peek (Peeking from screen border) */
.organism-root.state-peek {
  transform: translateY(12px) scale(0.95);
}
.organism-root.state-peek .organism-avatar {
  animation: org-peek-pulse 2s ease-in-out infinite;
}
@keyframes org-peek-pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.04); }
}

/* 3. Curious / Head Tilt */
.organism-root.state-curious .organism-avatar {
  animation: org-curious 1.8s ease-in-out infinite;
}
@keyframes org-curious {
  0%, 100% { transform: rotate(0deg) translateY(0); }
  50% { transform: rotate(6deg) translateY(-4px); }
}

/* 4. Suspicious / Scan */
.organism-root.state-suspicious .organism-avatar {
  animation: org-suspicious 1.5s ease-in-out infinite;
}
@keyframes org-suspicious {
  0%, 100% { transform: scale(1, 0.95); }
  50% { transform: scale(1.05, 0.92) translateY(2px); }
}

/* 5. Annoyed / Jitter */
.organism-root.state-annoyed .organism-avatar {
  animation: org-jitter 0.4s ease-in-out 3;
}
@keyframes org-jitter {
  0%, 100% { transform: translate(0, 0) rotate(0deg); }
  25% { transform: translate(-3px, -2px) rotate(-3deg); }
  75% { transform: translate(3px, 0) rotate(3deg); }
}

/* 6. Celebrating / Victory Bounce */
.organism-root.state-celebrating .organism-avatar {
  animation: org-celebrate 0.65s ease-in-out infinite;
}
@keyframes org-celebrate {
  0%, 100% { transform: translateY(0) scale(1); }
  50% { transform: translateY(-16px) scale(1.08) rotate(4deg); }
}

/* 7. Shocked / Recoil */
.organism-root.state-shocked .organism-avatar {
  animation: org-shock 0.5s cubic-bezier(0.2, 0.8, 0.3, 1) 1;
}
@keyframes org-shock {
  0% { transform: scale(1.15, 0.85); }
  40% { transform: translateY(-22px) scale(0.92, 1.1); }
  70% { transform: translateY(0) scale(1.06, 0.94); }
  100% { transform: translateY(0); }
}

/* 8. Thinking */
.organism-root.state-thinking .organism-avatar {
  animation: org-think 2.4s ease-in-out infinite;
}
@keyframes org-think {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  50% { transform: translateY(-3px) rotate(-5deg); }
}

/* 9. Sleeping */
.org-eyes-closed { display: none; }
.organism-root.state-sleeping .org-eyes-open { display: none; }
.organism-root.state-sleeping .org-eyes-closed { display: block; }
.organism-root.state-sleeping .organism-avatar {
  opacity: 0.7;
  transform: translateY(6px);
}

/* 10. Hidden */
.organism-root.state-hidden {
  opacity: 0;
  transform: translateY(40px) scale(0.8);
  pointer-events: none;
}

/* ————— Pupil Gaze Tracking ————— */
.org-pupil {
  transform-box: fill-box;
  transform-origin: center;
  transform: translateX(var(--pupil-x, 0px));
  transition: transform 0.08s ease-out;
}

/* ————— Glassmorphic Thought Pill ————— */
.thought-pill {
  position: absolute;
  bottom: calc(100% + 12px);
  right: 50%;
  transform: translateX(50%) translateY(8px) scale(0.92);
  background: rgba(15, 23, 42, 0.92);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.14);
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
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(0, 0, 0, 0.2);
  pointer-events: auto;
  cursor: pointer;
  opacity: 0;
  transition: all 0.24s cubic-bezier(0.16, 1, 0.3, 1);
  z-index: 100;
}

.thought-pill.is-visible {
  opacity: 1;
  transform: translateX(50%) translateY(0) scale(1);
}

.thought-pill::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  border-width: 6px 6px 0 6px;
  border-style: solid;
  border-color: rgba(15, 23, 42, 0.92) transparent transparent transparent;
}
`;
