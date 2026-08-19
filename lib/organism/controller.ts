import { ORGANISM_SHADOW_CSS } from './styles';
import { getOrganismSvg } from './sprites';
import { type OrganismId, type OrganismState } from '../personalities/types';
import { configStorage, type DockPosition } from '../storage';

const AVATAR_SIZE = 90;

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

export interface ControllerOptions {
  organismId: OrganismId;
  name: string;
  dockPosition: DockPosition;
  xFrac?: number;
  yFrac?: number;
  initialState?: OrganismState;
}

export class OrganismController {
  private rootEl!: HTMLDivElement;
  private avatarEl!: HTMLDivElement;
  private thoughtPill!: HTMLDivElement;

  private organismId: OrganismId;
  private state: OrganismState = 'idle';

  // Viewport Coordinates
  private x: number = 0;
  private y: number = 0;
  private xFrac: number = 0.90;
  private yFrac: number = 0.82;

  // Dragging State
  private isDragging: boolean = false;
  private dragStartX: number = 0;
  private dragStartY: number = 0;
  private initialDragX: number = 0;
  private initialDragY: number = 0;
  private hasDragged: boolean = false;

  private cursorX: number = window.innerWidth / 2;
  private speechTimeoutId: number | null = null;
  private destroyed: boolean = false;
  private rafId: number = 0;

  constructor(
    private shadowRoot: ShadowRoot,
    _host: HTMLElement,
    options: ControllerOptions,
  ) {
    this.organismId = options.organismId;
    this.state = options.initialState || 'idle';
    this.xFrac = options.xFrac ?? 0.90;
    this.yFrac = options.yFrac ?? 0.82;

    this.calculatePixelCoords();
  }

  public mount() {
    this.adoptStyles();
    this.renderDOM();
    this.bindEvents();
    this.updateTransform();

    this.rafId = requestAnimationFrame(this.tick);
  }

  public destroy() {
    this.destroyed = true;
    cancelAnimationFrame(this.rafId);
    if (this.speechTimeoutId) clearTimeout(this.speechTimeoutId);

    window.removeEventListener('pointermove', this.onGlobalPointerMove);
    window.removeEventListener('resize', this.onWindowResize);
    this.rootEl?.remove();
  }

  public setOrganism(id: OrganismId) {
    if (this.organismId === id) return;
    this.organismId = id;
    if (this.avatarEl) {
      this.avatarEl.innerHTML = getOrganismSvg(this.organismId);
    }
  }

  public setPositionFraction(xFrac: number, yFrac: number) {
    this.xFrac = xFrac;
    this.yFrac = yFrac;
    this.calculatePixelCoords();
    this.updateTransform();
  }

  public setDockPosition(pos: DockPosition) {
    if (pos === 'bottom-right') {
      this.xFrac = (window.innerWidth - AVATAR_SIZE - 24) / Math.max(1, window.innerWidth);
      this.yFrac = (window.innerHeight - AVATAR_SIZE - 24) / Math.max(1, window.innerHeight);
    } else if (pos === 'bottom-left') {
      this.xFrac = 24 / Math.max(1, window.innerWidth);
      this.yFrac = (window.innerHeight - AVATAR_SIZE - 24) / Math.max(1, window.innerHeight);
    } else if (pos === 'top-right') {
      this.xFrac = (window.innerWidth - AVATAR_SIZE - 24) / Math.max(1, window.innerWidth);
      this.yFrac = 24 / Math.max(1, window.innerHeight);
    }
    this.calculatePixelCoords();
    this.updateTransform();
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

    // Smart vertical positioning: above vs below
    this.thoughtPill.classList.remove('pos-above', 'pos-below');
    if (this.y < 120) {
      this.thoughtPill.classList.add('pos-below');
    } else {
      this.thoughtPill.classList.add('pos-above');
    }

    this.thoughtPill.textContent = message;
    this.thoughtPill.classList.add('is-visible');

    this.speechTimeoutId = window.setTimeout(() => {
      this.thoughtPill.classList.remove('is-visible');
      this.speechTimeoutId = null;
    }, durationMs);
  }

  private calculatePixelCoords() {
    const maxX = Math.max(8, window.innerWidth - AVATAR_SIZE - 8);
    const maxY = Math.max(8, window.innerHeight - AVATAR_SIZE - 8);

    this.x = clamp(this.xFrac * window.innerWidth, 8, maxX);
    this.y = clamp(this.yFrac * window.innerHeight, 8, maxY);
  }

  private updateTransform() {
    if (this.rootEl) {
      this.rootEl.style.transform = `translate3d(${Math.round(this.x)}px, ${Math.round(this.y)}px, 0)`;
    }
  }

  private adoptStyles() {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(ORGANISM_SHADOW_CSS);
    this.shadowRoot.adoptedStyleSheets = [sheet];
  }

  private renderDOM() {
    this.rootEl = document.createElement('div');
    this.rootEl.className = `organism-root state-${this.state}`;

    this.rootEl.innerHTML = /* html */ `
      <div class="thought-pill pos-above"></div>
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

    // Pointer Drag handlers
    this.avatarEl.addEventListener('pointerdown', this.onPointerDown);
  }

  private bindEvents() {
    window.addEventListener('pointermove', this.onGlobalPointerMove, { passive: true });
    window.addEventListener('resize', this.onWindowResize, { passive: true });
  }

  private onPointerDown = (e: PointerEvent) => {
    e.stopPropagation();
    this.isDragging = true;
    this.hasDragged = false;
    this.dragStartX = e.clientX;
    this.dragStartY = e.clientY;
    this.initialDragX = this.x;
    this.initialDragY = this.y;

    this.avatarEl.classList.add('is-dragging');
    this.avatarEl.setPointerCapture(e.pointerId);

    this.avatarEl.addEventListener('pointermove', this.onAvatarPointerMove);
    this.avatarEl.addEventListener('pointerup', this.onPointerUp);
    this.avatarEl.addEventListener('pointercancel', this.onPointerUp);
  };

  private onAvatarPointerMove = (e: PointerEvent) => {
    if (!this.isDragging) return;
    const dx = e.clientX - this.dragStartX;
    const dy = e.clientY - this.dragStartY;

    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      this.hasDragged = true;
    }

    const maxX = Math.max(8, window.innerWidth - AVATAR_SIZE - 8);
    const maxY = Math.max(8, window.innerHeight - AVATAR_SIZE - 8);

    this.x = clamp(this.initialDragX + dx, 8, maxX);
    this.y = clamp(this.initialDragY + dy, 8, maxY);

    this.updateTransform();
  };

  private onPointerUp = (e: PointerEvent) => {
    if (!this.isDragging) return;
    this.isDragging = false;

    this.avatarEl.classList.remove('is-dragging');
    try {
      this.avatarEl.releasePointerCapture(e.pointerId);
    } catch {
      // Ignored if capture was lost
    }

    this.avatarEl.removeEventListener('pointermove', this.onAvatarPointerMove);
    this.avatarEl.removeEventListener('pointerup', this.onPointerUp);
    this.avatarEl.removeEventListener('pointercancel', this.onPointerUp);

    if (this.hasDragged) {
      // Save new viewport coordinates to storage
      this.xFrac = this.x / Math.max(1, window.innerWidth);
      this.yFrac = this.y / Math.max(1, window.innerHeight);

      void configStorage.getValue().then((cfg) => {
        void configStorage.setValue({
          ...cfg,
          dockPosition: 'custom',
          xFrac: this.xFrac,
          yFrac: this.yFrac,
        });
      });
    } else {
      // Click without drag: trigger subtle observation pulse
      this.setState('curious');
      this.showRemark('Observation active.', 2500);
    }
  };

  private onGlobalPointerMove = (e: PointerEvent) => {
    this.cursorX = e.clientX;
  };

  private onWindowResize = () => {
    this.calculatePixelCoords();
    this.updateTransform();
  };

  private tick = () => {
    if (this.destroyed) return;

    // Pupil Gaze calculation in viewport space
    if (this.avatarEl && !this.isDragging) {
      const centerX = this.x + AVATAR_SIZE / 2;
      const offset = clamp((this.cursorX - centerX) / 80, -1, 1) * 3;
      this.rootEl.style.setProperty('--pupil-x', `${offset}px`);
    }

    this.rafId = requestAnimationFrame(this.tick);
  };
}
