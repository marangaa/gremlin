import { ORGANISM_MODELS, type OrganismId } from '../personalities/types';
import type { ContentScriptContext } from 'wxt/utils/content-script-context';
import type { EffectContext, EffectRegistry, SentenceTarget, WordTarget } from './types';
import { sargeEffect } from './characters/sarge';
import { waifuEffect } from './characters/waifu';
import { sherlockEffect } from './characters/sherlock';
import { kuroEffect } from './characters/kuro';
import { senseiEffect } from './characters/sensei';
import { byteEffect } from './characters/byte';
import { pixelEffect } from './characters/pixel';
import { ufoEffect } from './characters/ufo';
import { privacyGuard } from '../events/privacy';
import { restoreAbductedPage } from './restore';

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

/**
 * How long the overlay stage lingers before fading, in milliseconds. Sized to
 * outlast the full heist timeline (glide, beam, lift, hold, return, dock)
 * with margin, so nothing is torn down mid-flight.
 */
const STAGE_LINGER_MS = 7200;

/**
 * Selector for subtrees that true theft must never touch.
 *
 * Interactive, editable, code, or already-gremlin-wrapped hosts are excluded
 * because mutating them risks breaking page behavior or trapping focus. The
 * overlay-only fallback is always the safer path for those regions.
 */
const FORBIDDEN_ANCESTOR = 'a,button,input,textarea,select,code,pre,[contenteditable],[data-gremlin-abducted]';

/**
 * Determines whether an element is safe to steal text from.
 *
 * Sensitive pages (banks, mail, password managers per privacyGuard) and
 * interactive or editable subtrees always decline, forcing the caller to
 * fall back to a non-mutating flyby.
 *
 * @param el Candidate host element from the main document.
 * @returns True when the element may be wrapped for reversible theft.
 */
function isTheftSafe(el: HTMLElement): boolean {
  try {
    if (privacyGuard.isSensitive(window.location.href)) return false;
  } catch {
    return false;
  }
  try {
    if (el.closest(FORBIDDEN_ANCESTOR)) return false;
  } catch {
    return false;
  }
  return true;
}

/**
 * Picks a random readable word currently rendered in the viewport of the main
 * document. Used by abduction-style effects as the lightweight fallback.
 *
 * @returns The word and its viewport rect, or null on pages without
 * accessible text (PDFs, unreachable iframes, about: pages).
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
    /** Cross-origin weirdness, so there is no word to steal today. */
  }
  return null;
}

/**
 * Re-export of the shared theft failsafe for existing callers.
 *
 * The implementation lives in `./restore.ts` so effects and the manager can
 * share it without creating an import cycle.
 */
export { restoreAbductedPage };

/**
 * Picks a visible sentence safe for TRUE reversible theft.
 *
 * Scans the same readable hosts as `pickVisibleWord`, expands a random Text
 * node to sentence boundaries (20-96 chars with no links, buttons, or
 * inputs inside), and snapshots one rect per non-whitespace char. The anchor
 * triple (node, offset, length) lets the effect wrap the exact slice
 * synchronously, so no stale-node race can occur between pick and surgery.
 *
 * @returns A wrapped-sentence target, or null when nothing safe is on screen,
 * in which case the caller must fall back to a flyby.
 */
/**
 * Resolves the user's active cursor position in viewport coordinates.
 * Combines recorded pointer capture, active :hover elements, and natural
 * reading focal plane fallbacks (38% down viewport center).
 */
function resolveActiveCursor(recorded: { x: number; y: number } | null): { x: number; y: number } {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  if (recorded && recorded.x > 0 && recorded.x < vw && recorded.y > 0 && recorded.y < vh) {
    return recorded;
  }

  try {
    const hovered = document.querySelector(':hover');
    if (hovered instanceof HTMLElement && isTheftSafe(hovered)) {
      const rect = hovered.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0 && rect.top < vh && rect.bottom > 0) {
        return {
          x: Math.max(10, Math.min(vw - 10, rect.left + rect.width / 2)),
          y: Math.max(10, Math.min(vh - 10, rect.top + Math.min(rect.height / 2, 40))),
        };
      }
    }
  } catch {
    /** Ignore query errors */
  }

  return {
    x: Math.round(vw * 0.5),
    y: Math.round(vh * 0.38),
  };
}

function extractSentenceChars(node: Text, s: number, e: number): Array<{ ch: string; rect: DOMRect }> {
  const data = node.data;
  const chars: Array<{ ch: string; rect: DOMRect }> = [];
  for (let i = s; i < e; i++) {
    const ch = data[i]!;
    if (/\s/.test(ch)) continue;
    try {
      const cr = document.createRange();
      cr.setStart(node, i);
      cr.setEnd(node, i + 1);
      const r = cr.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) chars.push({ ch, rect: r });
    } catch {
      // Ignore
    }
  }
  return chars;
}

function extractEnclosingSentence(
  node: Text,
  offset: number,
  el: HTMLElement,
  vh: number,
  vw: number,
): SentenceTarget | null {
  const data = node.data;
  const spans: Array<[number, number]> = [];
  const re = /[^.!?\n]{12,140}[.!?]?/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(data))) {
    const start = m.index;
    const end = start + m[0].length;
    if (m[0].trim().length >= 10) spans.push([start, end]);
  }
  if (spans.length === 0) {
    const trimmed = data.trim();
    if (trimmed.length >= 10 && trimmed.length <= 140) {
      const idx = data.indexOf(trimmed);
      spans.push([idx, idx + trimmed.length]);
    }
  }
  if (spans.length === 0) return null;

  let bestSpan = spans.find(([s, e]) => offset >= s && offset <= e);
  if (!bestSpan) {
    bestSpan = spans.reduce((closest, span) => {
      const distSpan = Math.min(Math.abs(span[0] - offset), Math.abs(span[1] - offset));
      const distClosest = Math.min(Math.abs(closest[0] - offset), Math.abs(closest[1] - offset));
      return distSpan < distClosest ? span : closest;
    }, spans[0]!);
  }

  const [s, e] = bestSpan;
  const slice = data.slice(s, e);
  try {
    const range = document.createRange();
    range.setStart(node, s);
    range.setEnd(node, e);
    const rect = range.getBoundingClientRect();
    if (rect.width < 30 || rect.height < 8 || rect.top < 0 || rect.bottom > vh) return null;
    const chars = extractSentenceChars(node, s, e);
    if (chars.length < 4) return null;
    return {
      text: slice.trim(),
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
      element: el,
      chars,
      anchorNode: node,
      anchorStart: s,
      anchorLength: e - s,
    };
  } catch {
    return null;
  }
}

function findClosestSentenceInElement(
  el: HTMLElement,
  cursor: { x: number; y: number },
  vh: number,
  vw: number,
): SentenceTarget | null {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];
  let n: Text | null;
  while ((n = walker.nextNode() as Text | null)) {
    if (n.data.trim().length >= 10) textNodes.push(n);
  }
  if (textNodes.length === 0) return null;

  let bestSentence: SentenceTarget | null = null;
  let bestDist = Infinity;

  for (const node of textNodes.slice(0, 5)) {
    const data = node.data;
    const spans: Array<[number, number]> = [];
    const re = /[^.!?\n]{12,140}[.!?]?/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(data))) {
      const start = m.index;
      const end = start + m[0].length;
      if (m[0].trim().length >= 10) spans.push([start, end]);
    }
    if (spans.length === 0) {
      const trimmed = data.trim();
      if (trimmed.length >= 10 && trimmed.length <= 140) {
        const idx = data.indexOf(trimmed);
        spans.push([idx, idx + trimmed.length]);
      }
    }
    for (const [s, e] of spans) {
      try {
        const range = document.createRange();
        range.setStart(node, s);
        range.setEnd(node, e);
        const rect = range.getBoundingClientRect();
        if (rect.width < 30 || rect.height < 8 || rect.top < 0 || rect.bottom > vh) continue;
        const dist = Math.abs(rect.top + rect.height / 2 - cursor.y);
        if (dist < bestDist) {
          const chars = extractSentenceChars(node, s, e);
          if (chars.length >= 4) {
            bestDist = dist;
            bestSentence = {
              text: data.slice(s, e).trim(),
              left: rect.left,
              top: rect.top,
              width: rect.width,
              height: rect.height,
              element: el,
              chars,
              anchorNode: node,
              anchorStart: s,
              anchorLength: e - s,
            };
          }
        }
      } catch {
        continue;
      }
    }
  }

  return bestSentence;
}

/**
 * High-Precision Sentence Target Picker:
 *
 * Employs a 4-tier browser API cascade to lock onto the exact sentence the user
 * is actively reading or hovering:
 * 1. Active selection (`window.getSelection()`)
 * 2. Direct browser Caret API (`document.caretRangeFromPoint` / `caretPositionFromPoint`)
 * 3. Exact element hit (`document.elementFromPoint` / `:hover`)
 * 4. Deterministic Euclidean proximity to cursor without random noise.
 */
function pickVisibleSentence(cursorPoint: { x: number; y: number } | null): SentenceTarget | null {
  try {
    if (privacyGuard.isSensitive(window.location.href)) return null;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return null;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const cursor = resolveActiveCursor(cursorPoint);

    /** TIER 1: ACTIVE USER SELECTION */
    try {
      const sel = window.getSelection();
      if (sel && !sel.isCollapsed && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        const container = range.commonAncestorContainer;
        const hostEl = container instanceof HTMLElement ? container : container.parentElement;
        if (hostEl && isTheftSafe(hostEl)) {
          const text = range.toString().trim();
          if (text.length >= 10 && text.length <= 300) {
            const rect = range.getBoundingClientRect();
            if (rect.width >= 30 && rect.height >= 8 && rect.top >= 0 && rect.bottom <= vh) {
              const startNode = range.startContainer;
              if (startNode instanceof Text) {
                const chars = extractSentenceChars(startNode, range.startOffset, range.endOffset);
                if (chars.length >= 4) {
                  return {
                    text,
                    left: rect.left,
                    top: rect.top,
                    width: rect.width,
                    height: rect.height,
                    element: hostEl,
                    chars,
                    anchorNode: startNode,
                    anchorStart: range.startOffset,
                    anchorLength: range.endOffset - range.startOffset,
                  };
                }
              }
            }
          }
        }
      }
    } catch {
      /** Ignore selection errors */
    }

    /** TIER 2: CARET RANGE FROM POINT (Native Browser Caret APIs) */
    try {
      let hitNode: Node | null = null;
      let hitOffset = 0;

      if (typeof document.caretRangeFromPoint === 'function') {
        const caret = document.caretRangeFromPoint(cursor.x, cursor.y);
        if (caret) {
          hitNode = caret.startContainer;
          hitOffset = caret.startOffset;
        }
      } else if (typeof (document as any).caretPositionFromPoint === 'function') {
        const pos = (document as any).caretPositionFromPoint(cursor.x, cursor.y);
        if (pos) {
          hitNode = pos.offsetNode;
          hitOffset = pos.offset;
        }
      }

      if (hitNode instanceof Text && hitNode.data.trim().length >= 10) {
        const parent = hitNode.parentElement;
        if (parent && isTheftSafe(parent)) {
          const sentence = extractEnclosingSentence(hitNode, hitOffset, parent, vh, vw);
          if (sentence) return sentence;
        }
      }
    } catch {
      /** Ignore caret query errors */
    }

    /** TIER 3: ELEMENT FROM POINT & :hover DIRECT HIT */
    let cursorContainer: HTMLElement | null = null;
    try {
      const hit = document.elementFromPoint(cursor.x, cursor.y);
      if (hit instanceof HTMLElement && isTheftSafe(hit)) {
        cursorContainer = hit.closest<HTMLElement>(
          'p, h1, h2, h3, h4, h5, li, blockquote, figcaption, article, section, [role="article"], div, span',
        );
      }
    } catch {
      /** Ignore hit test errors */
    }

    if (cursorContainer && isTheftSafe(cursorContainer) && (cursorContainer.textContent?.trim().length ?? 0) >= 12) {
      const sentence = findClosestSentenceInElement(cursorContainer, cursor, vh, vw);
      if (sentence) return sentence;
    }

    /** TIER 4: PROXIMITY-SORTED CANDIDATE SCAN (Zero Random Noise) */
    const rawCandidates = Array.from(
      document.querySelectorAll<HTMLElement>(
        'p, h1, h2, h3, h4, h5, li, blockquote, figcaption, article, section, [role="article"], div, span',
      ),
    ).filter((el) => {
      const r = el.getBoundingClientRect();
      if (r.width < 40 || r.height < 10 || r.top < 10 || r.bottom > vh - 10 || r.left < 0 || r.right > vw)
        return false;
      if (el.offsetParent === null) return false;
      if (!isTheftSafe(el)) return false;
      if (r.width > vw * 0.96 && r.height > vh * 0.7) return false;
      const len = el.textContent?.trim().length ?? 0;
      return len >= 12 && len <= 4000;
    });

    if (rawCandidates.length === 0) return null;

    const scored = rawCandidates.map((el) => {
      const r = el.getBoundingClientRect();
      const centerX = r.left + r.width / 2;
      const centerY = r.top + r.height / 2;
      const dist = Math.hypot(centerX - cursor.x, centerY - cursor.y);
      return { el, dist };
    });
    scored.sort((a, b) => a.dist - b.dist);

    for (const { el } of scored.slice(0, 10)) {
      const sentence = findClosestSentenceInElement(el, cursor, vh, vw);
      if (sentence) return sentence;
    }
  } catch {
    /** Fail gracefully */
  }
  return null;
}

/**
 * Motion hooks the manager forwards into every `EffectContext`, letting
 * character effects borrow the REAL companion avatar instead of rendering a
 * duplicate character. Implemented by `OrganismController`.
 */
export interface EffectMotionHooks {
  /**
   * Flies the companion avatar so its center lands on the given point, then
   * fires `onArrive` for choreography that must wait for arrival.
   */
  glideAvatarTo(targetX: number, targetY: number, durationMs: number, onArrive: () => void): void;
  /** Sends the companion back to its docked spot after an effect. */
  returnAvatarToDock(durationMs?: number): void;
  /** Toggles beaming state on the avatar (freezes idle float, triggers glow). */
  setBeaming(beaming: boolean): void;
  /** Viewport pixel coordinates of the UFO saucer's bottom beam emitter. */
  getSaucerEmitterPoint(): { x: number; y: number };
}

export class ScreenEffectsManager {
  private stage: HTMLDivElement | null = null;
  private hideTimer: number | null = null;
  private generation = 0;
  private cursorPoint: { x: number; y: number } | null = null;

  /**
   * @param shadowRoot The companion's shadow root that hosts the FX stage.
   * @param motion Motion hooks for borrowing the real companion avatar; the
   *   manager forwards them verbatim into every `EffectContext`.
   * @param scriptCtx WXT's content-script context from `main(ctx)`; handed
   *   to effects so timers cancel automatically on invalidation.
   */
  constructor(
    private shadowRoot: ShadowRoot,
    private motion: EffectMotionHooks,
    private scriptCtx: ContentScriptContext,
  ) {
    this.createContainer();
  }

  private createContainer(): void {
    this.stage = document.createElement('div');
    this.stage.className = 'organism-screen-fx';
    this.shadowRoot.appendChild(this.stage);
  }

  /**
   * Records the user's pointer position so effects can hunt near the cursor.
   * The controller calls this on every pointer move (already a passive
   * listener, so there is no extra event cost).
   *
   * @param x Viewport x of the pointer in CSS pixels.
   * @param y Viewport y of the pointer in CSS pixels.
   */
  public setCursorPoint(x: number, y: number): void {
    this.cursorPoint = { x, y };
  }

  /**
   * Fires a character effect.
   *
   * Intensity comes from the chaos slider (`OrganismConfig.effectsIntensity`).
   * Effects self-clean while the stage lingers briefly and then fades, so
   * overlapping triggers replace cleanly. Each firing bumps a generation
   * counter that async heist timers check, and the page is healed before
   * touching the DOM, so `clear()` (unmount, state change, new trigger) can
   * never strand wrapped letters.
   *
   * @param organismId Character whose effect should fire.
   * @param intensity Chaos level from 0 (calm) to 1 (unhinged).
   * @param roast Optional raw AI roast to display or pin during the screen effect.
   */
  public triggerEffect(organismId: OrganismId, intensity = 0.45, roast?: string): void {
    const stage = this.stage;
    const effect = REGISTRY[organismId];
    if (!stage || !effect) return;

    /** A new firing invalidates in-flight heists, then heals stranded wraps. */
    this.generation += 1;
    restoreAbductedPage();
    if (this.hideTimer !== null) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }
    stage.innerHTML = '';

    const model = ORGANISM_MODELS[organismId] ?? ORGANISM_MODELS.Sarge;
    const myGeneration = this.generation;
    const ctx: EffectContext = {
      stage,
      accentColor: model.accentColor,
      secondaryColor: model.secondaryColor,
      intensity,
      roast,
      pickWordTarget: () => pickVisibleWord(),
      pickSentenceTarget: () =>
        myGeneration === this.generation ? pickVisibleSentence(this.cursorPoint) : null,
      glideAvatarTo: (targetX, targetY, durationMs, onArrive) =>
        this.motion.glideAvatarTo(targetX, targetY, durationMs, onArrive),
      returnAvatarToDock: (durationMs) => this.motion.returnAvatarToDock(durationMs),
      setBeaming: (beaming) => this.motion.setBeaming(beaming),
      getSaucerEmitterPoint: () => this.motion.getSaucerEmitterPoint(),
      cursorPoint: () => this.cursorPoint,
      scriptCtx: this.scriptCtx,
    };

    stage.classList.add('active');
    try {
      effect(ctx);
    } catch {
      /** Effects must never break the companion, so heal and stay silent. */
      restoreAbductedPage();
    }

    this.hideTimer = this.scriptCtx.setTimeout(() => {
      stage.classList.remove('active');
      stage.innerHTML = '';
      this.hideTimer = null;
    }, STAGE_LINGER_MS);
  }

  /**
   * Directly replaces the targeted distraction sentence in the DOM with the
   * companion's actual AI roast.
   *
   * Zero cringe labels (no [ZETA INTERCEPT], no fake sci-fi telemetry).
   * Just the raw, high-impact roast styled cleanly in the document layout.
   *
   * @param organismId Character active.
   * @param roast Raw AI roast text.
   */
  public triggerRoastReplacement(organismId: OrganismId, roast: string): void {
    if (!roast || !roast.trim()) return;
    const model = ORGANISM_MODELS[organismId] ?? ORGANISM_MODELS.Sarge;
    const accent = model.accentColor;

    let sentence: SentenceTarget | null = null;
    try {
      sentence = pickVisibleSentence(this.cursorPoint);
    } catch {
      sentence = null;
    }

    if (sentence && sentence.chars.length >= 4) {
      try {
        const { anchorNode, anchorStart, anchorLength } = sentence;
        const range = document.createRange();
        range.setStart(anchorNode, anchorStart);
        range.setEnd(anchorNode, anchorStart + anchorLength);

        const span = document.createElement('span');
        span.setAttribute('data-gremlin-abducted', '1');
        span.className = 'gremlin-in-place-roast';
        span.style.cssText = `
          display: inline !important;
          background: rgba(15, 23, 42, 0.94) !important;
          color: #f8fafc !important;
          border-left: 3px solid ${accent} !important;
          padding: 2px 8px !important;
          margin: 0 4px !important;
          border-radius: 4px !important;
          font-weight: 600 !important;
          letter-spacing: -0.01em !important;
          box-decoration-break: clone !important;
          -webkit-box-decoration-break: clone !important;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.25) !important;
          font-style: normal !important;
          text-decoration: none !important;
          cursor: default !important;
          line-height: inherit !important;
          user-select: text !important;
        `;
        span.textContent = roast.trim();

        range.deleteContents();
        range.insertNode(span);

        span.animate(
          [
            { opacity: 0, transform: 'scale(0.96)' },
            { opacity: 1, transform: 'scale(1)' },
          ],
          { duration: 240, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fill: 'forwards' },
        );
        return;
      } catch {
        /** Ignore DOM surgery failure */
      }
    }
  }

  /**
   * Tears down the overlay stage and heals any in-flight theft.
   *
   * Bumps the generation so pending heist timers become no-ops, restores the
   * page synchronously, then clears the stage. Called on unmount, state
   * teardown, and before every new trigger.
   */
  public clear(): void {
    this.generation += 1;
    restoreAbductedPage();
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
