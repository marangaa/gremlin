import { ORGANISM_MODELS, type OrganismId } from '../personalities/types';
import type { EffectContext, EffectRegistry, WordTarget } from './types';
import { sargeEffect } from './characters/sarge';
import { waifuEffect } from './characters/waifu';
import { sherlockEffect } from './characters/sherlock';
import { kuroEffect } from './characters/kuro';
import { senseiEffect } from './characters/sensei';
import { byteEffect } from './characters/byte';
import { pixelEffect } from './characters/pixel';
import { ufoEffect } from './characters/ufo';

const REGISTRY: EffectRegistry = {
  Sarge: sargeEffect,
  waifu: waifuEffect,
  sherlock: sherlockEffect,
  kuro: kuroEffect,
  sensei: senseiEffect,
  byte: byteEffect,
  pixel: pixelEffect,
  ufo: ufoEffect,
};

/** Stage lifetime: effects self-clean their own children; the stage then fades. */
const STAGE_LINGER_MS = 2400;

/**
 * Picks a random readable word currently rendered in the viewport of the MAIN
 * document. Used by abduction-style effects. Returns null on pages without
 * accessible text (PDFs, iframes we can't see, about: pages).
 */
function pickVisibleWord(): WordTarget | null {
  try {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const candidates = Array.from(
      document.querySelectorAll<HTMLElement>('p,h1,h2,h3,h4,h5,li,td,blockquote,figcaption,span,a'),
    ).filter((el) => {
      const r = el.getBoundingClientRect();
      if (r.width < 60 || r.height < 12 || r.top < 0 || r.bottom > vh || r.left < 0 || r.right > vw) return false;
      return (el.textContent?.trim().length ?? 0) >= 8 && el.offsetParent !== null;
    });
    for (let tries = 0; tries < 6 && candidates.length > 0; tries++) {
      const el = candidates[Math.floor(Math.random() * candidates.length)]!;
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      let node: Text | null;
      while ((node = walker.nextNode() as Text | null)) {
        const parts = node.data.split(/(\s+)/);
        const wordIdxs = parts.map((p, i) => (/\S/.test(p) ? i : -1)).filter((i) => i >= 0);
        if (wordIdxs.length === 0) continue;
        const wi = wordIdxs[Math.floor(Math.random() * wordIdxs.length)]!;
        let offset = 0;
        for (let i = 0; i < wi; i++) offset += parts[i]!.length;
        const raw = parts[wi]!;
        const range = document.createRange();
        range.setStart(node, offset);
        range.setEnd(node, offset + raw.length);
        const r = range.getBoundingClientRect();
        if (r.width < 5 || r.height < 6 || r.top < 0 || r.bottom > vh) continue;
        return {
          text: raw.replace(/[^\w'’-]/g, '') || raw,
          left: r.left,
          top: r.top,
          width: r.width,
          height: r.height,
        };
      }
    }
  } catch {
    // Cross-origin weirdness — no word today.
  }
  return null;
}

export class ScreenEffectsManager {
  private stage: HTMLDivElement | null = null;
  private hideTimer: number | null = null;

  constructor(private shadowRoot: ShadowRoot) {
    this.createContainer();
  }

  private createContainer(): void {
    this.stage = document.createElement('div');
    this.stage.className = 'organism-screen-fx';
    this.shadowRoot.appendChild(this.stage);
  }

  /**
   * Fire a character's effect. Intensity comes from the chaos slider
   * (OrganismConfig.effectsIntensity). Effects self-clean; the stage itself
   * lingers briefly and then fades so overlapping triggers replace cleanly.
   */
  public triggerEffect(organismId: OrganismId, intensity = 0.45): void {
    const stage = this.stage;
    const effect = REGISTRY[organismId];
    if (!stage || !effect) return;

    if (this.hideTimer !== null) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }
    stage.innerHTML = '';

    const model = ORGANISM_MODELS[organismId] ?? ORGANISM_MODELS.Sarge;
    const ctx: EffectContext = {
      stage,
      accentColor: model.accentColor,
      secondaryColor: model.secondaryColor,
      intensity,
      pickWordTarget: () => pickVisibleWord(),
    };

    stage.classList.add('active');
    effect(ctx);

    this.hideTimer = window.setTimeout(() => {
      stage.classList.remove('active');
      stage.innerHTML = '';
      this.hideTimer = null;
    }, STAGE_LINGER_MS);
  }

  public clear(): void {
    if (this.hideTimer !== null) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }
    if (this.stage) {
      this.stage.classList.remove('active');
      this.stage.innerHTML = '';
    }
  }
}
