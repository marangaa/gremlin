import type { EffectContext, SentenceTarget, WordTarget } from '../types';

/** Flight time for Sherlock's glide to target. */
const GLIDE_MS = 520;

/**
 * Sherlock — FORENSIC OPTICAL LENS & CAUTION CORDON.
 *
 * Sherlock glides to the distraction text and deploys a circular optical
 * magnifying glass lens that focuses intense clarity onto the targeted text
 * while blurring the rest of the screen. A forensic camera flash pops, and the
 * text is permanently sealed beneath a physical black-and-amber hazard cordon.
 *
 * ZERO TEXT BADGES:
 * Uses an authentic diagonal hazard cordon texture directly over the text.
 * No cartoon stickers or placeholder text badges.
 *
 * @param ctx Effect context with motion hooks and target pickers.
 */
export const sherlockEffect = (ctx: EffectContext): void => {
  let sentence: SentenceTarget | null = null;
  try {
    sentence = ctx.pickSentenceTarget();
  } catch {
    sentence = null;
  }

  if (sentence && sentence.chars.length >= 3) {
    try {
      runSherlockInvestigation(ctx, sentence);
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
      runSherlockWordInvestigation(ctx, word);
      return;
    } catch {
      ctx.returnAvatarToDock();
    }
  }

  runSherlockAmbientSweep(ctx);
};

/**
 * Executes Sherlock's forensic lens drop, camera flash, and hazard cordon.
 */
function runSherlockInvestigation(ctx: EffectContext, target: SentenceTarget): void {
  const { stage, accentColor, glideAvatarTo, returnAvatarToDock, scriptCtx } = ctx;
  const { anchorNode, anchorStart, anchorLength, element } = target;

  if (!anchorNode.isConnected || anchorNode.data.length < anchorStart + anchorLength) {
    throw new Error('stale anchor');
  }

  const targetCenterX = target.left + target.width / 2;
  const targetTop = target.top;
  const hoverY = Math.max(8, targetTop - 76);

  // 1. Sherlock glides into position over the focal distraction point
  glideAvatarTo(targetCenterX, hoverY, GLIDE_MS, () => {
    if (scriptCtx.isInvalid) {
      returnAvatarToDock();
      return;
    }

    // 2. Screen Blur & Vignette (focuses vision exclusively on the target)
    const vignette = document.createElement('div');
    vignette.style.cssText = `
      position:absolute;inset:0;pointer-events:none;
      background:radial-gradient(circle at ${targetCenterX}px ${targetTop + 10}px, transparent 120px, rgba(5,7,12,0.65) 320px);
      backdrop-filter:blur(3px);z-index:91;
    `;
    stage.appendChild(vignette);
    vignette.animate(
      [
        { opacity: 0 },
        { opacity: 1, offset: 0.3 },
        { opacity: 1, offset: 0.8 },
        { opacity: 0 },
      ],
      { duration: 2200, fill: 'forwards' },
    ).onfinish = () => vignette.remove();

    // 3. Optical Magnifying Glass Bezel
    const lensSize = Math.max(90, Math.min(220, target.width * 0.85));
    const lens = document.createElement('div');
    lens.style.cssText = `
      position:absolute;
      left:${targetCenterX - lensSize / 2}px;
      top:${targetTop + 8 - lensSize / 2}px;
      width:${lensSize}px;height:${lensSize}px;
      border:3.5px solid ${accentColor};
      border-radius:50%;
      box-shadow:0 0 0 1px #000000, 0 8px 32px rgba(0,0,0,0.6), inset 0 0 20px rgba(59,130,246,0.3);
      pointer-events:none;z-index:93;will-change:transform;
    `;
    stage.appendChild(lens);

    lens.animate(
      [
        { transform: 'scale(1.8) translateY(-20px)', opacity: 0 },
        { transform: 'scale(1) translateY(0)', opacity: 1, offset: 0.35 },
        { transform: 'scale(1) translateY(0)', opacity: 1, offset: 0.85 },
        { transform: 'scale(1.3) translateY(-10px)', opacity: 0 },
      ],
      { duration: 2000, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fill: 'forwards' },
    ).onfinish = () => lens.remove();

    // 4. Forensic Camera Flash
    scriptCtx.setTimeout(() => {
      const flash = document.createElement('div');
      flash.style.cssText = 'position:absolute;inset:0;background:#ffffff;pointer-events:none;z-index:95;';
      stage.appendChild(flash);
      flash.animate(
        [{ opacity: 0 }, { opacity: 0.75, offset: 0.2 }, { opacity: 0 }],
        { duration: 240, easing: 'ease-out', fill: 'forwards' },
      ).onfinish = () => flash.remove();

      // 5. Apply physical diagonal hazard caution cordon in the DOM (Zero Restore)
      try {
        const sliceEnd = anchorStart + anchorLength;
        anchorNode.splitText(sliceEnd);
        const sliceNode = anchorNode.splitText(anchorStart);
        const originalText = sliceNode.textContent ?? '';

        const cordon = document.createElement('span');
        cordon.setAttribute('data-gremlin-abducted', '1');
        cordon.style.cssText = `
          display:inline !important;
          background:repeating-linear-gradient(-45deg, #09090b, #09090b 8px, #eab308 8px, #eab308 16px) !important;
          color:transparent !important;
          user-select:none !important;
          -webkit-user-select:none !important;
          padding:1px 4px !important;
          border-radius:1px !important;
          box-decoration-break:clone !important;
          -webkit-box-decoration-break:clone !important;
          box-shadow:0 1px 4px rgba(0,0,0,0.5) !important;
          cursor:not-allowed !important;
        `;
        cordon.textContent = originalText;

        sliceNode.replaceWith(cordon);
        element.setAttribute('data-gremlin-hole', '1');

        cordon.animate(
          [
            { opacity: 0, transform: 'scaleY(0)' },
            { opacity: 1, transform: 'scaleY(1)' },
          ],
          { duration: 160, easing: 'ease-out', fill: 'forwards' },
        );
      } catch {
        /** DOM mutation safety */
      }
    }, 550);

    // 6. Sherlock inspects for a disciplined beat, then returns to dock
    scriptCtx.setTimeout(() => {
      returnAvatarToDock(520);
    }, 1900);
  });
}

/**
 * Word-level forensic investigation fallback.
 */
function runSherlockWordInvestigation(ctx: EffectContext, word: WordTarget): void {
  const { stage, accentColor, glideAvatarTo, returnAvatarToDock, scriptCtx } = ctx;
  const targetCenterX = word.left + word.width / 2;
  const hoverY = Math.max(8, word.top - 76);

  glideAvatarTo(targetCenterX, hoverY, GLIDE_MS, () => {
    const flash = document.createElement('div');
    flash.style.cssText = 'position:absolute;inset:0;background:#ffffff;pointer-events:none;z-index:94;';
    stage.appendChild(flash);
    flash.animate(
      [{ opacity: 0 }, { opacity: 0.6, offset: 0.2 }, { opacity: 0 }],
      { duration: 200, easing: 'ease-out', fill: 'forwards' },
    ).onfinish = () => flash.remove();

    try {
      const hit = document.elementFromPoint(targetCenterX, word.top + word.height / 2);
      if (hit instanceof HTMLElement && hit.tagName !== 'BODY') {
        hit.style.background = 'repeating-linear-gradient(-45deg, #09090b, #09090b 6px, #eab308 6px, #eab308 12px)';
        hit.style.color = 'transparent';
        hit.style.userSelect = 'none';
      }
    } catch {
      /** Safe fallback */
    }

    scriptCtx.setTimeout(() => {
      returnAvatarToDock(520);
    }, 1400);
  });
}

/**
 * Ambient iris sweep fallback for restricted pages.
 */
function runSherlockAmbientSweep({ stage, accentColor, returnAvatarToDock, scriptCtx }: EffectContext): void {
  const iris = document.createElement('div');
  iris.style.cssText = `
    position:absolute;inset:0;pointer-events:none;
    background:radial-gradient(circle at center, transparent 30%, ${accentColor}44 100%);
  `;
  stage.appendChild(iris);
  iris.animate(
    [{ opacity: 0 }, { opacity: 0.8, offset: 0.4 }, { opacity: 0 }],
    { duration: 850, easing: 'ease-in-out', fill: 'forwards' },
  ).onfinish = () => iris.remove();

  scriptCtx.setTimeout(() => returnAvatarToDock(480), 800);
}
