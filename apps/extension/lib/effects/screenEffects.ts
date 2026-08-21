import { type OrganismId } from '../personalities/types';

/**
 * ScreenEffectsManager
 * Minimal, non-intrusive manager for screen-level feedback.
 * Heavy disruptive full-screen overlays have been disabled in favor of
 * focused, lightweight companion reactions and speech bubbles.
 */
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
   * Screen effects are currently disabled for a refined, distraction-free experience.
   */
  public triggerEffect(_organismId: OrganismId, _durationMs = 3000) {
    // Intentionally subtle / no-op to avoid jarring overlays
  }

  public clear() {
    if (this.currentTimeout) {
      clearTimeout(this.currentTimeout);
      this.currentTimeout = null;
    }
    if (this.effectContainer) {
      this.effectContainer.className = 'organism-screen-fx';
      this.effectContainer.innerHTML = '';
    }
  }
}
