import type { EffectContext, SentenceTarget, WordTarget } from '../types';

/** Flight time for Sarge's authoritative military march to the target. */
const MARCH_MS = 500;

/**
 * Sarge — BLACKOUT TEXT REDACTION.
 *
 * Sarge marches directly to the detected distraction text, delivers a heavy
 * screen-rattling stomp, and immediately blacks out the text elements with
 * authentic, solid pure-black redaction bars.
 *
 * Zero fluff, zero stickers, zero fake warning badges:
 * Just pure, permanent black redaction bars directly over the text.
 *
 * @param ctx Effect context with motion hooks and target pickers.
 */
export const sargeEffect = (ctx: EffectContext): void => {
  let sentence: SentenceTarget | null = null;
  try {
    sentence = ctx.pickSentenceTarget();
  } catch {
    sentence = null;
  }

  if (sentence && sentence.chars.length >= 4) {
    try {
      runSargeRedaction(ctx, sentence);
      return;
    } catch {
      ctx.returnAvatarToDock();
    }
  }

  let word: WordTarget | null = null;
  try {
    word = ctx.pickWordTarget();
  } catch {
    word = null;
  }

  if (word && word.width >= 6) {
    try {
      runSargeWordRedaction(ctx, word);
      return;
    } catch {
      ctx.returnAvatarToDock();
    }
  }

  runSargeGeneralDrill(ctx);
};

/**
 * Creates an authentic pure-black solid redaction bar element.
 * Retains original characters to strictly preserve page layout and word wrapping,
 * but renders pitch-black on pitch-black with user selection disabled.
 */
function createBlackRedactionSpan(text: string): HTMLElement {
  const span = document.createElement('span');
  span.setAttribute('data-gremlin-abducted', '1');
  span.className = 'gremlin-black-redaction';
  span.style.cssText = `
    background:#000000 !important;
    color:#000000 !important;
    user-select:none !important;
    -webkit-user-select:none !important;
    padding:0 3px !important;
    margin:0 1px !important;
    border-radius:1px !important;
    display:inline !important;
    box-decoration-break:clone !important;
    -webkit-box-decoration-break:clone !important;
    box-shadow:0 0 0 1px #000000 !important;
    cursor:not-allowed !important;
    line-height:inherit !important;
  `;
  span.textContent = text;

  // Sharp horizontal redaction marker wipe animation
  span.animate(
    [
      { opacity: 0, clipPath: 'inset(0 100% 0 0)' },
      { opacity: 1, clipPath: 'inset(0 0% 0 0)' },
    ],
    { duration: 160, easing: 'ease-out', fill: 'forwards' },
  );

  return span;
}

/**
 * Directly redacts text elements in the targeted distraction section.
 */
function applyBlackRedactionToTarget(target: SentenceTarget): void {
  const { element, anchorNode, anchorStart, anchorLength } = target;

  // If container is a moderate readable text element (p, h1-h6, li, blockquote <= 600 chars),
  // redact all readable text nodes in the element so the distraction is completely blacked out.
  const isModerateContainer =
    element &&
    element.tagName !== 'BODY' &&
    element.tagName !== 'MAIN' &&
    (element.textContent?.length ?? 0) <= 600;

  if (isModerateContainer) {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.textContent || !node.textContent.trim()) return NodeFilter.FILTER_REJECT;
        if (node.parentElement?.closest('[data-gremlin-abducted]')) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });

    const textNodes: Text[] = [];
    let current: Node | null;
    while ((current = walker.nextNode())) {
      textNodes.push(current as Text);
    }

    if (textNodes.length > 0) {
      for (const tNode of textNodes) {
        const raw = tNode.textContent ?? '';
        if (!raw.trim()) continue;
        const redacted = createBlackRedactionSpan(raw);
        tNode.replaceWith(redacted);
      }
      element.setAttribute('data-gremlin-hole', '1');
      return;
    }
  }

  // Fallback: Redact the exact sentence slice
  if (anchorNode.isConnected && anchorNode.data.length >= anchorStart + anchorLength) {
    const sliceEnd = anchorStart + anchorLength;
    anchorNode.splitText(sliceEnd);
    const sliceNode = anchorNode.splitText(anchorStart);
    const redacted = createBlackRedactionSpan(sliceNode.textContent ?? '');
    sliceNode.replaceWith(redacted);
    element.setAttribute('data-gremlin-hole', '1');
  }
}

/**
 * Executes Sarge's blackout redaction over a targeted sentence.
 */
function runSargeRedaction(ctx: EffectContext, target: SentenceTarget): void {
  const { stage, glideAvatarTo, returnAvatarToDock, scriptCtx } = ctx;

  const targetCenterX = target.left + target.width / 2;
  const targetTop = target.top;
  const hoverY = Math.max(8, targetTop - 78);

  // 1. Sarge marches briskly to the target
  glideAvatarTo(targetCenterX, hoverY, MARCH_MS, () => {
    if (scriptCtx.isInvalid) {
      returnAvatarToDock();
      return;
    }

    // 2. Screen-rattling stomp jolt
    stage.animate(
      [
        { transform: 'translateY(0)' },
        { transform: 'translateY(7px)', offset: 0.2 },
        { transform: 'translateY(-4px)', offset: 0.5 },
        { transform: 'translateY(0)' },
      ],
      { duration: 240, easing: 'ease-in-out' },
    );

    // 3. Subtle impact shockwave ring at foot of impact
    const ring = document.createElement('div');
    ring.style.cssText = `position:absolute;left:${targetCenterX - 45}px;top:${targetTop}px;width:90px;height:24px;border:3px solid #000000;border-radius:50%;pointer-events:none;`;
    stage.appendChild(ring);
    ring.animate(
      [
        { transform: 'scale(0.3)', opacity: 1 },
        { transform: 'scale(2.6)', opacity: 0 },
      ],
      { duration: 340, easing: 'ease-out', fill: 'forwards' },
    ).onfinish = () => ring.remove();

    // 4. Apply pure black redaction bars to text elements (Zero Restore — Permanent)
    try {
      applyBlackRedactionToTarget(target);
    } catch {
      /** DOM mutation safety */
    }

    // 5. Disciplined hold at attention overlooking the blacked-out text, then march home
    scriptCtx.setTimeout(() => {
      returnAvatarToDock(520);
    }, 1700);
  });
}

/**
 * Word-level blackout redaction fallback.
 */
function runSargeWordRedaction(ctx: EffectContext, word: WordTarget): void {
  const { stage, glideAvatarTo, returnAvatarToDock, scriptCtx } = ctx;

  const targetCenterX = word.left + word.width / 2;
  const hoverY = Math.max(8, word.top - 78);

  glideAvatarTo(targetCenterX, hoverY, MARCH_MS, () => {
    stage.animate(
      [
        { transform: 'translateY(0)' },
        { transform: 'translateY(5px)', offset: 0.2 },
        { transform: 'translateY(0)' },
      ],
      { duration: 200 },
    );

    // Apply black redaction directly to the target text node under point
    try {
      const hit = document.elementFromPoint(targetCenterX, word.top + word.height / 2);
      if (hit instanceof HTMLElement && hit.tagName !== 'BODY') {
        const walker = document.createTreeWalker(hit, NodeFilter.SHOW_TEXT, {
          acceptNode(node) {
            if (!node.textContent || !node.textContent.trim()) return NodeFilter.FILTER_REJECT;
            if (node.parentElement?.closest('[data-gremlin-abducted]')) return NodeFilter.FILTER_REJECT;
            return NodeFilter.FILTER_ACCEPT;
          },
        });
        const tNode = walker.nextNode() as Text | null;
        if (tNode) {
          const redacted = createBlackRedactionSpan(tNode.textContent ?? word.text);
          tNode.replaceWith(redacted);
        }
      }
    } catch {
      /** Safe fallback */
    }

    scriptCtx.setTimeout(() => {
      returnAvatarToDock(520);
    }, 1500);
  });
}

/**
 * Clean fallback drill when no text elements are targetable.
 */
function runSargeGeneralDrill(ctx: EffectContext): void {
  const { stage, returnAvatarToDock, scriptCtx } = ctx;

  stage.animate(
    [
      { transform: 'translateY(0)' },
      { transform: 'translateY(6px)', offset: 0.2 },
      { transform: 'translateY(0)' },
    ],
    { duration: 260 },
  );

  scriptCtx.setTimeout(() => returnAvatarToDock(480), 800);
}
