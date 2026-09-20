import { ORGANISM_SHADOW_CSS } from './styles';
import { SpriteEngine } from './spriteEngine';
import { ScreenEffectsManager } from '../effects/screenEffects';
import { soundSynth } from '../audio/soundEngine';
import { ORGANISM_MODELS, type OrganismId, type OrganismState } from '../personalities/types';
import { configStorage, type OrganismConfig } from '../storage';
import { sendMessage } from '../messaging';
import type { ContentScriptContext } from 'wxt/utils/content-script-context';

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
  effectsIntensity?: number;
  /** WXT content-script context from `main(ctx)` in content.ts; forwarded
   * into effects so heist timers auto-cancel on script invalidation. */
  ctx: ContentScriptContext;
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
  private effectsIntensity: number = 0.45;

  /** Viewport coordinates of the avatar's top-left corner, in pixels. */
  private x: number = 0;
  private y: number = 0;
  private xFrac: number = 0.90;
  private yFrac: number = 0.80;

  /** Active glide animation back from a heist target to the docked spot. */
  private glideRafId: number = 0;
  /** Docked spot to return to after a glide; null while not gliding. */
  private glideReturn: { x: number; y: number } | null = null;

  /** Dragging state. */
  private isDragging: boolean = false;
  /** WXT content-script context; lifecycle-safe timers for the effects. */
  private ctx: ContentScriptContext;
  private dragStartX: number = 0;
  private dragStartY: number = 0;
  private initialDragX: number = 0;
  private initialDragY: number = 0;
  private hasDragged: boolean = false;

  private cursorX: number = window.innerWidth / 2;
  private cursorY: number = window.innerHeight / 2;
  private speechTimeoutId: number | null = null;
  private outsideNotePointerDownListener: ((e: PointerEvent) => void) | null = null;
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
    this.effectsIntensity = Math.max(0, Math.min(1, options.effectsIntensity ?? 0.45));
    this.ctx = options.ctx;

    soundSynth.setVolume(options.volume ?? 0.6);
    soundSynth.setMuted(!this.soundEnabled);

    this.calculatePixelCoords();
  }

  public mount() {
    this.adoptStyles();
    this.renderDOM();
    this.screenEffects = new ScreenEffectsManager(
      this.shadowRoot,
      {
        glideAvatarTo: (tx, ty, dur, onArrive) => this.glideAvatarTo(tx, ty, dur, onArrive),
        returnAvatarToDock: (dur) => this.returnAvatarToDock(dur),
        setBeaming: (beaming) => this.setBeaming(beaming),
        getSaucerEmitterPoint: () => this.getSaucerEmitterPoint(),
      },
      this.ctx,
    );
    this.bindEvents();
    this.updateTransform();

    this.lastTime = performance.now();
    this.rafId = requestAnimationFrame(this.tick);
  }

  public destroy() {
    this.destroyed = true;
    cancelAnimationFrame(this.rafId);
    if (this.speechTimeoutId) clearTimeout(this.speechTimeoutId);
    this.closeNoteSheet();
    this.screenEffects?.clear();

    window.removeEventListener('pointermove', this.onGlobalPointerMove, { capture: true });
    window.removeEventListener('pointerdown', this.onGlobalPointerMove, { capture: true });
    window.removeEventListener('pointerover', this.onGlobalPointerMove, { capture: true });
    window.removeEventListener('scroll', this.onScroll);
    window.removeEventListener('resize', this.onWindowResize);
    this.thoughtPill?.remove();
    this.noteHudEl?.remove();
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

  public setEffectsIntensity(intensity: number) {
    this.effectsIntensity = Math.max(0, Math.min(1, intensity));
  }

  public setPositionFraction(xFrac: number, yFrac: number) {
    this.xFrac = xFrac;
    this.yFrac = yFrac;
    this.calculatePixelCoords();
    this.updateTransform();
  }

  public setState(nextState: OrganismState, triggerScreenFx = false, roast?: string) {
    if (this.destroyed) return;
    const stateChanged = this.state !== nextState;
    if (stateChanged) {
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
    }

    if (this.effectsEnabled) {
      /**
       * AI-flagged effects always fire (even if the state was already annoyed);
       * at high chaos the companion also improvises on any state change.
       */
      const ambientChance = triggerScreenFx ? 1 : (stateChanged ? this.effectsIntensity * 0.22 : 0);
      if (Math.random() < ambientChance) {
        this.screenEffects.triggerEffect(this.organismId, this.effectsIntensity, roast);
      }
    }
  }

  public triggerCustomEffect(organismId?: OrganismId, roast?: string) {
    if (this.screenEffects) {
      this.screenEffects.triggerEffect(organismId || this.organismId, this.effectsIntensity, roast);
    }
  }

  /**
   * TEST HOOK — fires a character effect on demand (popup "Preview heist"
   * button → background relay → content script). Temporarily forces FX on
   * and drives intensity to max so the heist is visible even when the user
   * has Screen FX toggled off, then restores their settings. Never throws:
   * resolves the stored intensity (chaos slider) with a 0.85 floor so the
   * full sentence lifts instead of a single word.
   */
  public testEffect(organismId?: OrganismId) {
    if (this.destroyed || !this.screenEffects) return;
    const id = organismId || this.organismId;
    const wasEnabled = this.effectsEnabled;
    const wasIntensity = this.effectsIntensity;

    const testState: Record<OrganismId, OrganismState> = {
      ufo: 'curious',
      Sarge: 'annoyed',
      byte: 'thinking',
      pixel: 'celebrating',
      sherlock: 'curious',
      kuro: 'shocked',
      sensei: 'thinking',
      waifu: 'celebrating',
    };
    this.setState(testState[id] ?? 'curious', false);
    // Suppress speech bubble during intervention effects — the physical effect is the message!
    this.hideRemark();

    void configStorage.getValue().then((cfg) => {
      if (this.destroyed || !this.screenEffects) return;
      const stored = Math.max(0, Math.min(1, cfg.effectsIntensity ?? wasIntensity));
      this.effectsEnabled = true;
      this.effectsIntensity = Math.max(stored, 0.85);
      try {
        this.screenEffects.triggerEffect(id, this.effectsIntensity);
      } finally {
        this.effectsEnabled = wasEnabled;
        this.effectsIntensity = wasIntensity;
      }
    });
  }

  public hideRemark(): void {
    if (this.speechTimeoutId) {
      clearTimeout(this.speechTimeoutId);
      this.speechTimeoutId = null;
    }
    this.thoughtPill?.classList.remove('is-visible');
  }

  public showRemark(message: string, durationMs = 6500) {
    if (this.destroyed || !message) return;
    if (this.speechTimeoutId) clearTimeout(this.speechTimeoutId);

    const model = ORGANISM_MODELS[this.organismId] || ORGANISM_MODELS.Sarge;
    const pill = this.thoughtPill;

    pill.style.setProperty('--pill-accent', model.accentColor);
    pill.innerHTML = `
      <div class="pill-header">
        <span class="pill-badge">${model.name}</span>
      </div>
      <div class="pill-body">${message}</div>
    `;

    pill.classList.add('is-visible');
    this.updateSpeechBubblePosition();

    /** Synthesize Animalese speech chirps. */
    if (this.soundEnabled) {
      soundSynth.playAnimalese(message, this.organismId);
    }

    this.speechTimeoutId = this.ctx.setTimeout(() => {
      pill.classList.remove('is-visible');
      this.speechTimeoutId = null;
    }, durationMs);
  }

  /**
   * Recalculates and updates speech bubble coordinates in viewport space
   * relative to the companion's current (x, y) coordinates.
   */
  public updateSpeechBubblePosition(): void {
    if (!this.thoughtPill || !this.thoughtPill.classList.contains('is-visible')) return;

    const margin = 8;
    const gap = 12;
    const w = this.thoughtPill.offsetWidth || 220;
    const h = this.thoughtPill.offsetHeight || 60;
    const avatarCenterX = this.x + 48;
    const clampedCenterX = Math.max(margin + w / 2, Math.min(avatarCenterX, window.innerWidth - margin - w / 2));
    const placeAbove = this.y - h - gap > margin;

    const left = Math.round(clampedCenterX - w / 2);
    const top = Math.round(placeAbove ? this.y - h - gap : this.y + 96 + gap);

    this.thoughtPill.style.left = `${left}px`;
    this.thoughtPill.style.top = `${top}px`;

    const tailX = Math.max(14, Math.min(w - 14, avatarCenterX - left));
    this.thoughtPill.style.setProperty('--tail-x', `${Math.round(tailX)}px`);
    this.thoughtPill.classList.toggle('tail-below', placeAbove);
    this.thoughtPill.classList.toggle('tail-above', !placeAbove);
  }

  /**
   * Recalculates and updates in-page note card coordinates in viewport space
   * relative to the companion's current (x, y) coordinates.
   * Ensures the note card moves in lockstep with the companion during drag and glide.
   */
  public updateNotePosition(): void {
    if (!this.noteHudEl || !this.noteHudEl.classList.contains('is-visible')) return;

    const margin = 12;
    const gap = 12;
    const w = this.noteHudEl.offsetWidth || 280;
    const h = this.noteHudEl.offsetHeight || 150;
    const avatarCenterX = this.x + 48;
    const clampedCenterX = Math.max(margin + w / 2, Math.min(avatarCenterX, window.innerWidth - margin - w / 2));
    const placeAbove = this.y - h - gap > margin;

    const left = Math.round(clampedCenterX - w / 2);
    const top = Math.round(placeAbove ? this.y - h - gap : this.y + 96 + gap);

    this.noteHudEl.style.left = `${left}px`;
    this.noteHudEl.style.top = `${top}px`;

    const tailX = Math.max(16, Math.min(w - 16, avatarCenterX - left));
    this.noteHudEl.style.setProperty('--tail-x', `${Math.round(tailX)}px`);
    this.noteHudEl.classList.toggle('tail-below', placeAbove);
    this.noteHudEl.classList.toggle('tail-above', !placeAbove);
  }

  public isNoteSheetOpen(): boolean {
    return Boolean(this.noteHudEl?.classList.contains('is-visible'));
  }

  public closeNoteSheet(): void {
    if (this.outsideNotePointerDownListener) {
      window.removeEventListener('pointerdown', this.outsideNotePointerDownListener, { capture: true });
      this.outsideNotePointerDownListener = null;
    }
    if (this.noteHudEl) {
      this.noteHudEl.classList.remove('is-visible');
    }
  }

  public toggleNoteSheet(): void {
    if (this.isNoteSheetOpen()) {
      this.closeNoteSheet();
    } else {
      this.openNoteSheet();
    }
  }

  public openNoteSheet() {
    if (this.destroyed || !this.noteHudEl) return;
    const model = ORGANISM_MODELS[this.organismId] || ORGANISM_MODELS.Sarge;
    const hud = this.noteHudEl;

    hud.style.setProperty('--pill-accent', model.accentColor);

    const selectedText = window.getSelection()?.toString().trim() || '';
    const domain = window.location.hostname.replace(/^www\./, '');
    const title = document.title || domain;

    hud.innerHTML = `
      <div class="note-hud-header">
        <div class="note-hud-title-group">
          <div class="note-hud-badge">
            <span class="note-hud-dot"></span>
            <span class="note-hud-title">${model.name.toLowerCase()}</span>
          </div>
          <span class="note-hud-domain" title="${domain}">${domain}</span>
        </div>
        <button class="note-hud-close" title="Close (esc)">&times;</button>
      </div>
      ${selectedText ? `<div class="note-hud-snippet" title="${selectedText}">“${selectedText.slice(0, 90)}${selectedText.length > 90 ? '…' : ''}”</div>` : ''}
      <div class="note-hud-input-wrap">
        <textarea class="note-hud-textarea" placeholder="drop a thought on ${domain}…" rows="2"></textarea>
      </div>
      <div class="note-hud-footer">
        <span class="note-hud-hint">↵ enter · esc</span>
        <button class="note-hud-btn-save">save note</button>
      </div>
    `;

    hud.classList.add('is-visible');
    this.updateNotePosition();

    const textarea = hud.querySelector('.note-hud-textarea') as HTMLTextAreaElement;
    this.ctx.setTimeout(() => textarea?.focus(), 40);

    const closeHud = () => {
      this.closeNoteSheet();
    };

    const saveNote = async () => {
      const content = textarea.value.trim();
      if (!content) return;

      closeHud();
      try {
        await sendMessage('createPageNote', {
          content,
          url: window.location.href,
          domain,
          pageTitle: title,
          snippet: selectedText || undefined,
        });
        if (this.soundEnabled) soundSynth.playChime('complete');
        this.showRemark('Note saved to Daily Diary! 📝', 2500);
      } catch {
        /** Save failures are non-fatal; the note stays editable. */
      }
    };

    textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        closeHud();
      } else if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        void saveNote();
      }
    });

    hud.querySelector('.note-hud-close')?.addEventListener('click', (e) => {
      e.stopPropagation();
      closeHud();
    });

    hud.querySelector('.note-hud-btn-save')?.addEventListener('click', (e) => {
      e.stopPropagation();
      void saveNote();
    });

    /** Outside click listener closes note HUD */
    if (this.outsideNotePointerDownListener) {
      window.removeEventListener('pointerdown', this.outsideNotePointerDownListener, { capture: true });
    }
    this.outsideNotePointerDownListener = (e: PointerEvent) => {
      const path = e.composedPath();
      if (!path.includes(hud) && !path.includes(this.rootEl)) {
        this.closeNoteSheet();
      }
    };
    window.addEventListener('pointerdown', this.outsideNotePointerDownListener, { capture: true });
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

  /**
   * Applies the current position to the avatar transform, and keeps the
   * speech bubble and note card anchored in real time lockstep.
   */
  private updateTransform() {
    if (this.rootEl) {
      this.rootEl.style.transform = `translate3d(${Math.round(this.x)}px, ${Math.round(this.y)}px, 0)`;
    }
    this.updateSpeechBubblePosition();
    this.updateNotePosition();
  }

  /**
   * Glides the real companion avatar to the target so the beam appears to
   * originate from it — no second character is ever rendered.
   *
   * @param targetX Viewport X of the glide destination (beam origin center).
   * @param targetY Viewport Y of the glide destination.
   * @param durationMs Flight time to the target; the return leg is fixed.
   * @param onArrive Fired once the avatar is hovering over the target.
   */
  public glideAvatarTo(targetX: number, targetY: number, durationMs: number, onArrive: () => void): void {
    if (this.destroyed || this.isDragging) return;
    this.cancelGlide();
    const startX = this.x;
    const startY = this.y;
    const maxX = Math.max(8, window.innerWidth - AVATAR_SIZE - 8);
    const maxY = Math.max(8, window.innerHeight - AVATAR_SIZE - 8);
    const destX = clamp(targetX - AVATAR_SIZE / 2, 8, maxX);
    const destY = clamp(targetY, 8, maxY);
    /** Snapshot of the user's dock so the avatar can return home exactly. */
    this.glideReturn = { x: startX, y: startY };
    const start = performance.now();
    const ease = (t: number) => 1 - Math.pow(1 - t, 3);
    const step = (now: number) => {
      if (this.destroyed) return;
      const t = Math.min(1, (now - start) / durationMs);
      const k = ease(t);
      this.x = startX + (destX - startX) * k;
      this.y = startY + (destY - startY) * k;
      this.updateTransform();
      if (t < 1) {
        this.glideRafId = window.requestAnimationFrame(step);
      } else {
        this.glideRafId = 0;
        onArrive();
      }
    };
    this.glideRafId = window.requestAnimationFrame(step);
  }

  /**
   * Triggers an in-place text roast replacement on the active page.
   *
   * @param roast Raw AI roast text.
   */
  public triggerRoast(roast: string): void {
    if (this.destroyed || !this.screenEffects || !this.effectsEnabled) return;
    this.screenEffects.triggerRoastReplacement(this.organismId, roast);
  }

  /**
   * Flies the avatar back to the spot it was occupying before the heist.
   * Docks silently — the physical effect on the page is the complete statement.
   *
   * @param durationMs Return flight time; defaults to a brisk 620ms.
   */
  public returnAvatarToDock(durationMs = 620): void {
    this.setBeaming(false);
    const home = this.glideReturn;
    if (!home || this.destroyed || this.isDragging) {
      this.cancelGlide();
      return;
    }
    const startX = this.x;
    const startY = this.y;
    this.glideReturn = null;
    const start = performance.now();
    const ease = (t: number) => 1 - Math.pow(1 - t, 3);
    const step = (now: number) => {
      if (this.destroyed) return;
      const t = Math.min(1, (now - start) / durationMs);
      const k = ease(t);
      this.x = startX + (home.x - startX) * k;
      this.y = startY + (home.y - startY) * k;
      this.updateTransform();
      if (t < 1) {
        this.glideRafId = window.requestAnimationFrame(step);
      } else {
        this.glideRafId = 0;
      }
    };
    this.glideRafId = window.requestAnimationFrame(step);
  }

  /** Halts any in-flight glide immediately; the avatar stays where it is. */
  public cancelGlide(): void {
    if (this.glideRafId) {
      window.cancelAnimationFrame(this.glideRafId);
      this.glideRafId = 0;
    }
    this.glideReturn = null;
    this.setBeaming(false);
  }

  /** Freezes the avatar's idle bobbing and triggers beaming glow while firing effects. */
  public setBeaming(beaming: boolean): void {
    const avatar = this.rootEl?.querySelector('.organism-avatar');
    if (avatar) {
      avatar.classList.toggle('is-beaming', beaming);
    }
  }

  /** Returns viewport coordinates of the UFO saucer's bottom beam emitter. */
  public getSaucerEmitterPoint(): { x: number; y: number } {
    return {
      x: Math.round(this.x + 48),
      y: Math.round(this.y + 62),
    };
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
      <div class="organism-avatar">
        <canvas class="organism-canvas" width="192" height="192" style="width: 96px; height: 96px;"></canvas>
      </div>
    `;

    this.thoughtPill = document.createElement('div');
    this.thoughtPill.className = 'thought-pill pos-above';

    this.noteHudEl = document.createElement('div');
    this.noteHudEl.className = 'note-hud pos-above';

    this.shadowRoot.appendChild(this.thoughtPill);
    this.shadowRoot.appendChild(this.noteHudEl);
    this.shadowRoot.appendChild(this.rootEl);

    this.canvasEl = this.rootEl.querySelector('.organism-canvas') as HTMLCanvasElement;
    const avatar = this.rootEl.querySelector('.organism-avatar') as HTMLDivElement;

    this.spriteEngine = new SpriteEngine(this.canvasEl);
    this.spriteEngine.setOrganism(this.organismId);
    this.spriteEngine.setState(this.state);

    this.thoughtPill.addEventListener('click', (e) => {
      e.stopPropagation();
      this.thoughtPill.classList.remove('is-visible');
    });

    /** Pointer drag handlers. */
    avatar.addEventListener('pointerdown', this.onPointerDown);
  }

  private bindEvents() {
    window.addEventListener('pointermove', this.onGlobalPointerMove, { capture: true, passive: true });
    window.addEventListener('pointerdown', this.onGlobalPointerMove, { capture: true, passive: true });
    window.addEventListener('pointerover', this.onGlobalPointerMove, { capture: true, passive: true });
    window.addEventListener('scroll', this.onScroll, { passive: true });
    window.addEventListener('resize', this.onWindowResize, { passive: true });
  }

  private onPointerDown = (e: PointerEvent) => {
    e.stopPropagation();
    /** A user grab always wins over an active effect glide. */
    this.cancelGlide();
    this.isDragging = true;
    this.hasDragged = false;
    this.dragStartX = e.clientX;
    this.dragStartY = e.clientY;
    this.initialDragX = this.x;
    this.initialDragY = this.y;

    const avatar = this.rootEl.querySelector('.organism-avatar') as HTMLDivElement;
    avatar.classList.add('is-dragging');
    this.noteHudEl?.classList.add('is-dragging');
    this.thoughtPill?.classList.add('is-dragging');
    avatar.setPointerCapture(e.pointerId);

    avatar.addEventListener('pointermove', this.onAvatarPointerMove);
    avatar.addEventListener('pointerup', this.onPointerUp);
    avatar.addEventListener('pointercancel', this.onPointerUp);
  };

  private onAvatarPointerMove = (e: PointerEvent) => {
    if (!this.isDragging) return;
    const dx = e.clientX - this.dragStartX;
    const dy = e.clientY - this.dragStartY;

    if (Math.abs(dx) > 6 || Math.abs(dy) > 6) {
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
    this.noteHudEl?.classList.remove('is-dragging');
    this.thoughtPill?.classList.remove('is-dragging');
    try {
      avatar.releasePointerCapture(e.pointerId);
    } catch {
      /** releasePointerCapture can throw if the pointer already left. */
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
      /** Click without drag: toggle in-page note card. */
      this.toggleNoteSheet();
    }
  };

  private onGlobalPointerMove = (e: PointerEvent) => {
    this.cursorX = e.clientX;
    this.cursorY = e.clientY;
    this.screenEffects?.setCursorPoint(e.clientX, e.clientY);
  };

  private onScroll = () => {
    this.screenEffects?.setCursorPoint(this.cursorX, this.cursorY);
  };

  private onWindowResize = () => {
    this.calculatePixelCoords();
    this.updateTransform();
    /** Resize invalidates any glide target measured against the old viewport. */
    this.cancelGlide();
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
