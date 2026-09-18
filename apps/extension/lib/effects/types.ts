import type { OrganismId } from '../personalities/types';
import type { ContentScriptContext } from 'wxt/utils/content-script-context';

/** A single visible word on the page, in viewport coordinates. */
export interface WordTarget {
  text: string;
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * A visible sentence on the page, safe for reversible abduction.
 *
 * The `element` is the host whose subtree gets wrapped char-by-char, `chars`
 * holds one rect per non-whitespace char so each letter can fly solo, and
 * the `anchorNode`/`anchorStart`/`anchorLength` triple locates the exact Text
 * slice to wrap. Surgery runs synchronously after picking so the node cannot
 * go stale between measurement and mutation.
 */
export interface SentenceTarget {
  text: string;
  left: number;
  top: number;
  width: number;
  height: number;
  element: HTMLElement;
  chars: Array<{ ch: string; rect: DOMRect }>;
  anchorNode: Text;
  anchorStart: number;
  anchorLength: number;
}

/**
 * Everything a character effect gets to work with.
 *
 * Effects render INTO the stage (a fixed, full-viewport layer inside the
 * companion's shadow DOM), must clean up after themselves, and never block
 * the caller. The motion hooks let an effect borrow the REAL companion
 * avatar instead of rendering a duplicate character: `glideAvatarTo` flies
 * it next to the heist target, `returnAvatarToDock` sends it home, and
 * `cursorPoint` reports the user's pointer so effects can hunt near it.
 */
export interface EffectContext {
  /** Fixed full-viewport container (.organism-screen-fx) inside the shadow root. */
  stage: HTMLDivElement;
  accentColor: string;
  secondaryColor: string;
  /** Chaos slider, 0 (calm) to 1 (unhinged). Scales opacity, counts, amplitude. */
  intensity: number;
  /**
   * Picks a random readable word currently visible in the page (main
   * document). Returns null on restrictive pages (iframes, PDFs, about:).
   */
  pickWordTarget(): WordTarget | null;
  /**
   * Picks a visible sentence safe for TRUE reversible theft (plain-text
   * host, no links/buttons/inputs inside the range). Returns null when no
   * safe sentence is on screen, in which case the caller must fall back to
   * overlay-only FX. Capped (~96 chars) so heists stay around three seconds
   * and layout never reflows.
   */
  pickSentenceTarget(): SentenceTarget | null;
  /**
   * Flies the real companion avatar so its center lands on the given point,
   * then fires `onArrive` — the hook for beam/letter choreography that must
   * wait until the avatar is hovering over the target. The caller is
   * expected to pair every glide with a `returnAvatarToDock()`.
   */
  glideAvatarTo(targetX: number, targetY: number, durationMs: number, onArrive: () => void): void;
  /** Sends the companion back to its docked spot after an effect. */
  returnAvatarToDock(durationMs?: number): void;
  /** Toggles beaming state on the companion avatar (freezes bobbing, adds glow). */
  setBeaming(beaming: boolean): void;
  /** Returns the viewport pixel coordinates of the UFO saucer's bottom beam emitter. */
  getSaucerEmitterPoint(): { x: number; y: number };
  /**
   * Last known pointer position in viewport coordinates, or null before the
   * user has moved the mouse. Effects use it to hunt near the cursor.
   */
  cursorPoint(): { x: number; y: number } | null;
  /**
   * WXT's content-script context, handed down from `main(ctx)` in
   * content.ts. Effects MUST schedule timers through `scriptCtx.setTimeout`
   * instead of `window.setTimeout` (per the WXT lifecycle docs): timers
   * auto-clear when the content script is invalidated, so no heist timer can
   * fire on an orphaned page after an extension reload.
   */
  scriptCtx: ContentScriptContext;
}

export type EffectFn = (ctx: EffectContext) => void;

export type EffectRegistry = Record<OrganismId, EffectFn>;
