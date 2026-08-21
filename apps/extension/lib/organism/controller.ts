import { ORGANISM_SHADOW_CSS } from './styles';
import { SpriteEngine } from './spriteEngine';
import { ScreenEffectsManager } from '../effects/screenEffects';
import { soundSynth } from '../audio/soundEngine';
import { ORGANISM_MODELS, type OrganismId, type OrganismState } from '../personalities/types';
import { configStorage, type OrganismConfig } from '../storage';
import { sendMessage } from '../messaging';

const AVATAR_SIZE = 96;

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

export interface ControllerOptions {
  organismId: OrganismId;
  name: string;
  xFrac?: number;
  yFrac?: number;
  soundEnabled?: boolean;
  volume?: number;
  effectsEnabled?: boolean;
  initialState?: OrganismState;
}

export class OrganismController {
  private rootEl!: HTMLDivElement;
  private canvasEl!: HTMLCanvasElement;
  private thoughtPill!: HTMLDivElement;
  private noteHudEl!: HTMLDivElement;
  private spriteEngine!: SpriteEngine;
  private screenEffects!: ScreenEffectsManager;

  private organismId: OrganismId;
  private state: OrganismState = 'idle';
  private soundEnabled: boolean = true;
  private effectsEnabled: boolean = true;

  // Viewport Coordinates (in pixels)
  private x: number = 0;
  private y: number = 0;
  private xFrac: number = 0.90;
  private yFrac: number = 0.80;

  // Dragging State
  private isDragging: boolean = false;
  private dragStartX: number = 0;
  private dragStartY: number = 0;
  private initialDragX: number = 0;
  private initialDragY: number = 0;
  private hasDragged: boolean = false;

  private cursorX: number = window.innerWidth / 2;
  private cursorY: number = window.innerHeight / 2;
  private speechTimeoutId: number | null = null;
  private destroyed: boolean = false;
  private rafId: number = 0;
  private lastTime: number = 0;

  constructor(
    private shadowRoot: ShadowRoot,
    _host: HTMLElement,
    options: ControllerOptions,
  ) {
    this.organismId = options.organismId;
    this.state = options.initialState || 'idle';
    this.xFrac = options.xFrac ?? 0.90;
    this.yFrac = options.yFrac ?? 0.80;
    this.soundEnabled = options.soundEnabled ?? true;
    this.effectsEnabled = options.effectsEnabled ?? true;

    soundSynth.setVolume(options.volume ?? 0.6);
    soundSynth.setMuted(!this.soundEnabled);

    this.calculatePixelCoords();
  }

  public mount() {
    this.adoptStyles();
    this.renderDOM();
    this.screenEffects = new ScreenEffectsManager(this.shadowRoot);
    this.bindEvents();
    this.updateTransform();

    this.lastTime = performance.now();
    this.rafId = requestAnimationFrame(this.tick);
  }

  public destroy() {
    this.destroyed = true;
    cancelAnimationFrame(this.rafId);
    if (this.speechTimeoutId) clearTimeout(this.speechTimeoutId);
    this.screenEffects?.clear();

    window.removeEventListener('pointermove', this.onGlobalPointerMove);
    window.removeEventListener('resize', this.onWindowResize);
    this.rootEl?.remove();
  }

  public setOrganism(id: OrganismId) {
    if (this.organismId === id) return;
    this.organismId = id;
    if (this.spriteEngine) {
      this.spriteEngine.setOrganism(id);
    }
  }

  public setSoundSettings(enabled: boolean, volume: number) {
    this.soundEnabled = enabled;
    soundSynth.setMuted(!enabled);
    soundSynth.setVolume(volume);
  }

  public setEffectsEnabled(enabled: boolean) {
    this.effectsEnabled = enabled;
  }

  public setPositionFraction(xFrac: number, yFrac: number) {
    this.xFrac = xFrac;
    this.yFrac = yFrac;
    this.calculatePixelCoords();
    this.updateTransform();
  }

  public setState(nextState: OrganismState, triggerScreenFx = false) {
    if (this.destroyed || this.state === nextState) return;
    this.rootEl.classList.remove(`state-${this.state}`);
    this.state = nextState;
    this.rootEl.classList.add(`state-${nextState}`);

    if (this.spriteEngine) {
      this.spriteEngine.setState(nextState);
      if (nextState === 'celebrating') {
        this.spriteEngine.triggerBurst('spark');
        if (this.soundEnabled) soundSynth.playChime('complete');
      } else if (nextState === 'sleeping') {
        this.spriteEngine.triggerBurst('zzz');
      } else if (nextState === 'shocked' || nextState === 'annoyed') {
        this.spriteEngine.triggerBurst('exclamation');
        if (this.soundEnabled) soundSynth.playAlert();
      }
    }

    if (triggerScreenFx && this.effectsEnabled) {
      this.screenEffects.triggerEffect(this.organismId);
    }
  }

  public triggerCustomEffect(organismId?: OrganismId) {
    if (this.screenEffects) {
      this.screenEffects.triggerEffect(organismId || this.organismId);
    }
  }

  public showRemark(message: string, durationMs = 5000) {
    if (this.destroyed || !message) return;
    if (this.speechTimeoutId) clearTimeout(this.speechTimeoutId);

    const model = ORGANISM_MODELS[this.organismId] || ORGANISM_MODELS.Sarge;

    // Smart vertical positioning: above vs below
    this.thoughtPill.classList.remove('pos-above', 'pos-below');
    if (this.y < 120) {
      this.thoughtPill.classList.add('pos-below');
    } else {
      this.thoughtPill.classList.add('pos-above');
    }

    this.thoughtPill.style.borderColor = model.accentColor;
    this.thoughtPill.innerHTML = `
      <div class="pill-header">
        <span class="pill-badge" style="color: ${model.accentColor};">${model.name}</span>
      </div>
      <div class="pill-body">${message}</div>
    `;
    this.thoughtPill.classList.add('is-visible');

    // Synthesize Animalese speech chirps
    if (this.soundEnabled) {
      soundSynth.playAnimalese(message, this.organismId);
    }

    this.speechTimeoutId = window.setTimeout(() => {
      this.thoughtPill.classList.remove('is-visible');
      this.speechTimeoutId = null;
    }, durationMs);
  }

  public openNoteSheet() {
    if (this.destroyed || !this.noteHudEl) return;
    const model = ORGANISM_MODELS[this.organismId] || ORGANISM_MODELS.Sarge;

    this.noteHudEl.classList.remove('pos-above', 'pos-below');
    if (this.y < 180) {
      this.noteHudEl.classList.add('pos-below');
    } else {
      this.noteHudEl.classList.add('pos-above');
    }

    const selectedText = window.getSelection()?.toString().trim() || '';
    const domain = window.location.hostname.replace(/^www\./, '');
    const title = document.title || domain;

    this.noteHudEl.style.borderColor = model.accentColor;
    this.noteHudEl.innerHTML = `
      <div class="note-hud-header">
        <span class="note-hud-badge" style="color: ${model.accentColor};">📝 Page Note · ${model.name}</span>
        <button class="note-hud-close">&times;</button>
      </div>
      ${selectedText ? `<div class="note-hud-snippet">“${selectedText.slice(0, 70)}…”</div>` : ''}
      <textarea class="note-hud-textarea" placeholder="Note thoughts on ${domain}…"></textarea>
      <div class="note-hud-footer">
        <button class="note-hud-btn-poke">Poke</button>
        <button class="note-hud-btn-save" style="background: ${model.accentColor};">Save Note</button>
      </div>
    `;

    this.noteHudEl.classList.add('is-visible');
    const textarea = this.noteHudEl.querySelector('.note-hud-textarea') as HTMLTextAreaElement;
    setTimeout(() => textarea?.focus(), 50);

    // Event listeners
    this.noteHudEl.querySelector('.note-hud-close')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.noteHudEl.classList.remove('is-visible');
    });

    this.noteHudEl.querySelector('.note-hud-btn-poke')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.noteHudEl.classList.remove('is-visible');
      this.handlePoke();
    });

    this.noteHudEl.querySelector('.note-hud-btn-save')?.addEventListener('click', async (e) => {
      e.stopPropagation();
      const content = textarea.value.trim();
      if (!content) return;

      this.noteHudEl.classList.remove('is-visible');
      try {
        await sendMessage('createPageNote', {
          content,
          url: window.location.href,
          domain,
          pageTitle: title,
          snippet: selectedText || undefined,
        });
        if (this.soundEnabled) soundSynth.playChime('complete');
        this.showRemark('Note saved to Daily Diary! 📝', 3000);
      } catch {
        // Fallback
      }
    });
  }

  private handlePoke() {
    this.setState('thinking');
    if (this.soundEnabled) soundSynth.playChime('poke');

    void sendMessage('pokeOrganism', undefined).then((res) => {
      if (res && res.message) {
        this.setState(res.state || 'curious');
        this.showRemark(res.message, 3500);
      } else {
        this.setState('curious');
        this.showRemark('Observation active.', 2500);
      }
    });
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
      <div class="note-hud pos-above"></div>
      <div class="organism-avatar">
        <canvas class="organism-canvas" width="192" height="192" style="width: 96px; height: 96px;"></canvas>
      </div>
    `;

    this.shadowRoot.appendChild(this.rootEl);

    this.canvasEl = this.rootEl.querySelector('.organism-canvas') as HTMLCanvasElement;
    this.thoughtPill = this.rootEl.querySelector('.thought-pill') as HTMLDivElement;
    this.noteHudEl = this.rootEl.querySelector('.note-hud') as HTMLDivElement;
    const avatar = this.rootEl.querySelector('.organism-avatar') as HTMLDivElement;

    this.spriteEngine = new SpriteEngine(this.canvasEl);
    this.spriteEngine.setOrganism(this.organismId);
    this.spriteEngine.setState(this.state);

    this.thoughtPill.addEventListener('click', (e) => {
      e.stopPropagation();
      this.thoughtPill.classList.remove('is-visible');
    });

    // Pointer Drag handlers
    avatar.addEventListener('pointerdown', this.onPointerDown);
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

    const avatar = this.rootEl.querySelector('.organism-avatar') as HTMLDivElement;
    avatar.classList.add('is-dragging');
    avatar.setPointerCapture(e.pointerId);

    avatar.addEventListener('pointermove', this.onAvatarPointerMove);
    avatar.addEventListener('pointerup', this.onPointerUp);
    avatar.addEventListener('pointercancel', this.onPointerUp);
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

    const avatar = this.rootEl.querySelector('.organism-avatar') as HTMLDivElement;
    avatar.classList.remove('is-dragging');
    try {
      avatar.releasePointerCapture(e.pointerId);
    } catch {
      // Ignored
    }

    avatar.removeEventListener('pointermove', this.onAvatarPointerMove);
    avatar.removeEventListener('pointerup', this.onPointerUp);
    avatar.removeEventListener('pointercancel', this.onPointerUp);

    if (this.hasDragged) {
      this.xFrac = this.x / Math.max(1, window.innerWidth);
      this.yFrac = this.y / Math.max(1, window.innerHeight);

      void configStorage.getValue().then((cfg: OrganismConfig) => {
        void configStorage.setValue({
          ...cfg,
          xFrac: this.xFrac,
          yFrac: this.yFrac,
        });
      });
    } else {
      // Click without drag: open in-page note & action sheet
      this.openNoteSheet();
    }
  };

  private onGlobalPointerMove = (e: PointerEvent) => {
    this.cursorX = e.clientX;
    this.cursorY = e.clientY;
  };

  private onWindowResize = () => {
    this.calculatePixelCoords();
    this.updateTransform();
  };

  private tick = (now: number) => {
    if (this.destroyed) return;

    const dt = Math.min(100, now - this.lastTime);
    this.lastTime = now;

    if (this.spriteEngine && !this.isDragging) {
      const centerX = this.x + AVATAR_SIZE / 2;
      const centerY = this.y + AVATAR_SIZE / 2;
      const normX = (this.cursorX - centerX) / 120;
      const normY = (this.cursorY - centerY) / 120;
      this.spriteEngine.setGaze(normX, normY);

      this.spriteEngine.update(dt);
      this.spriteEngine.render();
    }

    this.rafId = requestAnimationFrame(this.tick);
  };
}
