import type { OrganismId } from '../personalities/types';

/** A single visible word on the page, in viewport coordinates. */
export interface WordTarget {
  text: string;
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * Everything a character effect gets to work with. Effects render INTO the
 * stage (a fixed, full-viewport layer inside the companion's shadow DOM),
 * must clean up after themselves, and never block the caller.
 */
export interface EffectContext {
  /** Fixed full-viewport container (.organism-screen-fx) inside the shadow root. */
  stage: HTMLDivElement;
  accentColor: string;
  secondaryColor: string;
  /** Chaos slider, 0 (calm) → 1 (unhinged). Scale opacity / counts / amplitude. */
  intensity: number;
  /**
   * Picks a random readable word currently visible in the page (main
   * document). Returns null on restrictive pages (iframes, PDFs, about:).
   */
  pickWordTarget(): WordTarget | null;
}

export type EffectFn = (ctx: EffectContext) => void;

export type EffectRegistry = Record<OrganismId, EffectFn>;
