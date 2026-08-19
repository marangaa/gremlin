import { ORGANISM_SHADOW_CSS } from './styles';
import { getOrganismSvg } from './sprites';
import { type OrganismId, type OrganismState } from '../personalities/types';
import { type DockPosition } from '../storage';

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

export interface ControllerOptions {
  organismId: OrganismId;
  name: string;
  dockPosition: DockPosition;
  initialState?: OrganismState;
}

export class OrganismController {
  private rootEl!: HTMLDivElement;
  private avatarEl!: HTMLDivElement;
  private thoughtPill!: HTMLDivElement;

  private organismId: OrganismId;
  private state: OrganismState = 'idle';
  private dockPosition: DockPosition;
  private speechTimeoutId: number | null = null;
  private destroyed: boolean = false;
  private rafId: number = 0;
  private cursorX: number = window.innerWidth / 2;

  constructor(
    private shadowRoot: ShadowRoot,
    private host: HTMLElement,
    options: ControllerOptions,
  ) {
    this.organismId = options.organismId;
    this.dockPosition = options.dockPosition || 'bottom-right';
    this.state = options.initialState || 'idle';
  }

  public mount() {
    this.adoptStyles();
    this.renderDOM();
    this.bindEvents();

    this.rafId = requestAnimationFrame(this.tick);
  }

  public destroy() {
    this.destroyed = true;
    cancelAnimationFrame(this.rafId);
    if (this.speechTimeoutId) clearTimeout(this.speechTimeoutId);

    window.removeEventListener('pointermove', this.onPointerMove);
    this.rootEl?.remove();
  }

  public setOrganism(id: OrganismId) {
    if (this.organismId === id) return;
    this.organismId = id;
    if (this.avatarEl) {
      this.avatarEl.innerHTML = getOrganismSvg(this.organismId);
    }
  }

  public setDockPosition(pos: DockPosition) {
    this.dockPosition = pos;
    this.host.setAttribute('data-dock', pos);
  }

  public setState(nextState: OrganismState) {
    if (this.destroyed || this.state === nextState) return;
    this.rootEl.classList.remove(`state-${this.state}`);
    this.state = nextState;
    this.rootEl.classList.add(`state-${nextState}`);
  }

  public showRemark(message: string, durationMs = 5000) {
    if (this.destroyed || !message) return;
    if (this.speechTimeoutId) clearTimeout(this.speechTimeoutId);

    this.thoughtPill.textContent = message;
    this.thoughtPill.classList.add('is-visible');

    this.speechTimeoutId = window.setTimeout(() => {
      this.thoughtPill.classList.remove('is-visible');
      this.speechTimeoutId = null;
    }, durationMs);
  }

  private adoptStyles() {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(ORGANISM_SHADOW_CSS);
    this.shadowRoot.adoptedStyleSheets = [sheet];
    this.host.setAttribute('data-dock', this.dockPosition);
  }

  private renderDOM() {
    this.rootEl = document.createElement('div');
    this.rootEl.className = `organism-root state-${this.state}`;

    this.rootEl.innerHTML = /* html */ `
      <div class="thought-pill"></div>
      <div class="organism-avatar">
        ${getOrganismSvg(this.organismId)}
      </div>
    `;

    this.shadowRoot.appendChild(this.rootEl);

    this.avatarEl = this.rootEl.querySelector('.organism-avatar') as HTMLDivElement;
    this.thoughtPill = this.rootEl.querySelector('.thought-pill') as HTMLDivElement;

    this.thoughtPill.addEventListener('click', (e) => {
      e.stopPropagation();
      this.thoughtPill.classList.remove('is-visible');
    });

    this.avatarEl.addEventListener('click', (e) => {
      e.stopPropagation();
      this.setState('curious');
      this.showRemark('Observation protocol active.', 2500);
    });
  }

  private bindEvents() {
    window.addEventListener('pointermove', this.onPointerMove, { passive: true });
  }

  private onPointerMove = (e: PointerEvent) => {
    this.cursorX = e.clientX;
  };

  private tick = () => {
    if (this.destroyed) return;

    if (this.avatarEl) {
      const rect = this.avatarEl.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const offset = clamp((this.cursorX - centerX) / 90, -1, 1) * 3;
      this.rootEl.style.setProperty('--pupil-x', `${offset}px`);
    }

    this.rafId = requestAnimationFrame(this.tick);
  };
}
