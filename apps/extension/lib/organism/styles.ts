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

/* ————— Sleek Tactile Neobrutalist Speech Bubble ————— */
.thought-pill {
  position: absolute;
  background: #0d111a;
  border: 2px solid #22c55e;
  color: #f8fafc;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 11.5px;
  font-weight: 500;
  line-height: 1.4;
  white-space: normal;
  max-width: 230px;
  min-width: 120px;
  text-align: left;
  box-shadow: 4px 4px 0px #000000;
  pointer-events: auto;
  cursor: pointer;
  opacity: 0;
  transform: scale(0.92);
  transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1);
  z-index: 100;
  display: flex;
  flex-direction: column;
  gap: 4px;
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
  color: #22c55e;
  letter-spacing: 0.05em;
}

.thought-pill .pill-body {
  font-size: 11.5px;
  color: #f1f5f9;
  line-height: 1.35;
}

/* Position Above (Default) */
.thought-pill.pos-above {
  bottom: calc(100% + 8px);
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
  border-color: #22c55e transparent transparent transparent;
}

/* Position Below (when near top of viewport) */
.thought-pill.pos-below {
  top: calc(100% + 8px);
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
  border-color: transparent transparent #22c55e transparent;
}

/* ————— 3D & ATMOSPHERIC CHARACTER SCREEN EFFECTS CONTAINER ————— */
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

/* ================= 1. Sarge: GRAVITY OVERLOAD HUD ================= */
.Sarge-gravity-hud {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding-top: 5vh;
  z-index: 10;
  animation: Sarge-rumble 0.45s ease-in-out;
}

@keyframes Sarge-rumble {
  0%, 100% { transform: translateY(0); }
  20% { transform: translateY(8px) rotateX(4deg); }
  40% { transform: translateY(-4px) rotateX(-2deg); }
  60% { transform: translateY(5px); }
  80% { transform: translateY(-2px); }
}

.Sarge-hazard-banner {
  background: #000000;
  border: 3px solid #f97316;
  border-radius: 8px;
  box-shadow: 0 0 40px rgba(249, 115, 22, 0.4), 8px 8px 0px #000000;
  overflow: hidden;
  max-width: 600px;
  width: 92vw;
  transform: perspective(600px) rotateX(4deg);
}

.hazard-stripe {
  height: 10px;
  background: repeating-linear-gradient(
    -45deg,
    #f97316,
    #f97316 14px,
    #000000 14px,
    #000000 28px
  );
}

.hazard-content {
  padding: 16px 24px;
  text-align: center;
}

.hazard-badge {
  display: inline-block;
  background: rgba(249, 115, 22, 0.2);
  border: 1px solid #f97316;
  color: #fed7aa;
  font-family: monospace;
  font-size: 11px;
  font-weight: 800;
  padding: 3px 10px;
  border-radius: 4px;
  letter-spacing: 0.06em;
  margin-bottom: 8px;
}

.hazard-title {
  font-size: 16px;
  font-weight: 900;
  color: #ffffff;
  letter-spacing: 0.03em;
  margin-bottom: 10px;
  text-transform: uppercase;
}

.hazard-countdown {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: rgba(249, 115, 22, 0.12);
  border-radius: 4px;
  padding: 4px 12px;
}

.cd-label {
  font-family: monospace;
  font-size: 11px;
  font-weight: 700;
  color: #fb923c;
}

.cd-digits {
  font-family: monospace;
  font-size: 16px;
  font-weight: 900;
  color: #ffffff;
  text-shadow: 0 0 10px #f97316;
}

/* ================= 2. SHERLOCK: 1940s DOSSIER STAMP ================= */
.sherlock-dossier-stamp {
  position: absolute;
  top: 6vh;
  left: 50%;
  transform: translateX(-50%) rotate(-2deg);
  z-index: 10;
  width: 90vw;
  max-width: 520px;
}

.dossier-card {
  background: rgba(12, 14, 20, 0.95);
  border: 2px solid #ef4444;
  border-radius: 6px;
  padding: 18px 24px;
  box-shadow: 0 0 35px rgba(239, 68, 68, 0.35), 6px 6px 0px #000000;
  text-align: center;
}

.dossier-tag {
  display: inline-block;
  background: rgba(239, 68, 68, 0.2);
  border: 1px solid rgba(239, 68, 68, 0.6);
  color: #fca5a5;
  font-family: monospace;
  font-size: 11px;
  font-weight: 800;
  padding: 3px 10px;
  border-radius: 4px;
  margin-bottom: 8px;
}

.dossier-title {
  font-size: 15px;
  font-weight: 900;
  color: #ffffff;
  letter-spacing: 0.02em;
  margin-bottom: 10px;
}

.dossier-evidence {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-family: monospace;
  font-size: 11.5px;
  font-weight: 600;
  color: #94a3b8;
}

/* ================= 3. WAIFU: POPUP CARDS ================= */
.waifu-popup-card {
  user-select: none;
}
.waifu-popup-card:hover {
  transform: scale(1.04) !important;
}

/* ================= 4. KURO: CYBER DE-REZ GLITCH HUD ================= */
.kuro-derez-hud {
  position: absolute;
  top: 8vh;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
  width: 92vw;
  max-width: 540px;
}

.kuro-glitch-box {
  background: rgba(14, 5, 16, 0.95);
  border: 2px solid #ef4444;
  border-radius: 6px;
  padding: 20px 26px;
  box-shadow: 0 0 40px rgba(239, 68, 68, 0.45), 6px 6px 0px #000000;
  text-align: center;
  animation: kuro-glitch-jitter 0.25s infinite alternate;
}

@keyframes kuro-glitch-jitter {
  0% { transform: skew(0deg); }
  50% { transform: skew(0.5deg, -0.2deg); }
  100% { transform: skew(-0.5deg, 0.2deg); }
}

.kuro-glitch-badge {
  display: inline-block;
  background: rgba(239, 68, 68, 0.2);
  border: 1px solid #ef4444;
  color: #fca5a5;
  font-family: monospace;
  font-size: 11px;
  font-weight: 800;
  padding: 3px 10px;
  border-radius: 4px;
  margin-bottom: 8px;
}

.kuro-glitch-text {
  font-size: 15px;
  font-weight: 900;
  color: #ffffff;
  letter-spacing: 0.03em;
  margin-bottom: 6px;
}

.kuro-glitch-sub {
  font-family: monospace;
  font-size: 11px;
  font-weight: 700;
  color: #ef4444;
}

/* ================= 5. SENSEI: ZEN SEAL ================= */
.sensei-zen-seal {
  position: absolute;
  bottom: 8vh;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
  width: 92vw;
  max-width: 520px;
}

.zen-seal-plate {
  background: rgba(8, 18, 14, 0.95);
  border: 2px solid #10b981;
  border-radius: 12px;
  padding: 20px 28px;
  box-shadow: 0 0 40px rgba(16, 185, 129, 0.35), 6px 6px 0px #000000;
  text-align: center;
  transform: perspective(600px) rotateX(4deg);
}

.zen-seal-badge {
  display: inline-block;
  background: rgba(16, 185, 129, 0.2);
  border: 1px solid rgba(16, 185, 129, 0.6);
  color: #a7f3d0;
  font-family: monospace;
  font-size: 11px;
  font-weight: 700;
  padding: 3px 10px;
  border-radius: 999px;
  margin-bottom: 8px;
}

.zen-seal-title {
  font-size: 14.5px;
  font-weight: 800;
  color: #ffffff;
  line-height: 1.4;
  margin-bottom: 6px;
}

.zen-seal-sub {
  font-size: 12px;
  font-weight: 500;
  color: #6ee7b7;
}

/* ================= 6. IN-PAGE NOTE HUD ================= */
.note-hud {
  position: absolute;
  background: #0d111a;
  border: 2px solid #a3e635;
  color: #f8fafc;
  padding: 12px 14px;
  border-radius: 12px;
  width: 270px;
  box-shadow: 6px 6px 0px #000000;
  pointer-events: auto;
  opacity: 0;
  transform: scale(0.92);
  transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1);
  display: none;
  z-index: 100;
}

.note-hud.is-visible {
  display: block;
  opacity: 1;
  transform: scale(1);
}

.note-hud.pos-above {
  bottom: 104px;
  left: 50%;
  transform: translateX(-50%) scale(0.92);
}
.note-hud.pos-above.is-visible {
  transform: translateX(-50%) scale(1);
}

.note-hud.pos-below {
  top: 104px;
  left: 50%;
  transform: translateX(-50%) scale(0.92);
}
.note-hud.pos-below.is-visible {
  transform: translateX(-50%) scale(1);
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
  color: #a3e635;
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
  border-color: #a3e635;
}

.note-hud-snippet {
  font-size: 10.5px;
  font-family: monospace;
  color: #94a3b8;
  background: rgba(255, 255, 255, 0.04);
  border-left: 2px solid #a3e635;
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
