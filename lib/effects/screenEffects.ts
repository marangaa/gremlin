import { type OrganismId } from '../personalities/types';

export class ScreenEffectsManager {
  private effectContainer: HTMLDivElement | null = null;
  private currentTimeout: number | null = null;

  constructor(private shadowRoot: ShadowRoot) {
    this.createContainer();
  }

  private createContainer() {
    this.effectContainer = document.createElement('div');
    this.effectContainer.className = 'organism-screen-fx';
    this.shadowRoot.appendChild(this.effectContainer);
  }

  /**
   * Trigger character-specific screen distraction effect
   */
  public triggerEffect(organismId: OrganismId, durationMs = 3500) {
    if (!this.effectContainer) return;
    if (this.currentTimeout) clearTimeout(this.currentTimeout);

    this.effectContainer.innerHTML = '';
    this.effectContainer.className = `organism-screen-fx active fx-${organismId}`;

    switch (organismId) {
      case 'nexus': // Gorg (Alien Abduction Beam)
        this.renderGorgBeam();
        break;
      case 'cipher': // Bolt (Hazard Caution Stripe)
        this.renderBoltCaution();
        break;
      case 'aero': // Momo (Heart Bubble Shower)
        this.renderMomoBubbles();
        break;
      case 'kuro': // Kuro (Soot Puff & Scratch)
        this.renderKuroMischief();
        break;
      case 'atlas': // Glitch (CRT Scanlines & Glitch)
      default:
        this.renderGlitchCRT();
        break;
    }

    this.currentTimeout = window.setTimeout(() => {
      if (this.effectContainer) {
        this.effectContainer.className = 'organism-screen-fx';
        this.effectContainer.innerHTML = '';
      }
      this.currentTimeout = null;
    }, durationMs);
  }

  public clear() {
    if (this.currentTimeout) clearTimeout(this.currentTimeout);
    if (this.effectContainer) {
      this.effectContainer.className = 'organism-screen-fx';
      this.effectContainer.innerHTML = '';
    }
  }

  // --- 1. Gorg Beam ---
  private renderGorgBeam() {
    if (!this.effectContainer) return;
    this.effectContainer.innerHTML = /* html */ `
      <div class="fx-gorg-beam">
        <div class="ufo-saucer">🛸</div>
        <div class="light-cone"></div>
        <div class="fx-banner">ALIEN ABDUCTION ALERT: DETOUR DETECTED!</div>
      </div>
    `;
  }

  // --- 2. Bolt Caution ---
  private renderBoltCaution() {
    if (!this.effectContainer) return;
    this.effectContainer.innerHTML = /* html */ `
      <div class="fx-bolt-caution">
        <div class="hazard-stripe top">⚠️ CAUTION: WORKFLOW DIVERGENCE • RETURN TO SPRINT OBJECTIVE ⚠️</div>
        <div class="hazard-stripe bottom">⚠️ CAUTION: WORKFLOW DIVERGENCE • RETURN TO SPRINT OBJECTIVE ⚠️</div>
      </div>
    `;
  }

  // --- 3. Momo Bubbles ---
  private renderMomoBubbles() {
    if (!this.effectContainer) return;
    let bubbles = '';
    for (let i = 0; i < 12; i++) {
      const left = Math.round(10 + Math.random() * 80);
      const delay = (Math.random() * 1.5).toFixed(2);
      const size = Math.round(20 + Math.random() * 24);
      bubbles += `<div class="fx-bubble" style="left: ${left}%; animation-delay: ${delay}s; font-size: ${size}px;">🌸</div>`;
    }
    this.effectContainer.innerHTML = /* html */ `
      <div class="fx-momo-garden">
        <div class="momo-vignette"></div>
        ${bubbles}
        <div class="momo-banner">Gentle nudge: Your sprint goal is waiting! 💕</div>
      </div>
    `;
  }

  // --- 4. Kuro Mischief ---
  private renderKuroMischief() {
    if (!this.effectContainer) return;
    this.effectContainer.innerHTML = /* html */ `
      <div class="fx-kuro-soot">
        <div class="kuro-claw top-left">🐾</div>
        <div class="kuro-claw top-right">🐾</div>
        <div class="kuro-banner">🔥 CAUGHT RED-HANDED! FOCUS! 🔥</div>
      </div>
    `;
  }

  // --- 5. Glitch CRT ---
  private renderGlitchCRT() {
    if (!this.effectContainer) return;
    this.effectContainer.innerHTML = /* html */ `
      <div class="fx-glitch-crt">
        <div class="crt-scanlines"></div>
        <div class="glitch-banner">[SYSTEM DETOUR] SPRINT TIMER PAUSED</div>
      </div>
    `;
  }
}
