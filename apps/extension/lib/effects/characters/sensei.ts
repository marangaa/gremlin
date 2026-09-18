import type { EffectContext, SentenceTarget, WordTarget } from '../types';

/** Flight time for Sensei's serene glide to target. */
const GLIDE_MS = 600;

/** Duration of letter evaporation into mist, in milliseconds. */
const EVAPORATE_MS = 680;

/**
 * Sensei — ZEN WATER-INK EVAPORATION.
 *
 * Minimalist, elegant, and peaceful:
 * 1. Sensei glides smoothly above the distraction line and hovers in quiet meditation.
 * 2. A subtle, tranquil focus pulse softens the screen.
 * 3. The distraction text softly blurs and evaporates into thin air—like fresh ink
 *    turning to water mist on warm calligraphy stone, or steam rising off morning tea.
 * 4. Letters drift gently upward into clear air, leaving pristine empty space.
 * 5. Sensei offers a silent respectful bow and glides serenely back to dock.
 *
 * ZERO WEIRD CIRCLES, ZERO UGLY WAVES, ZERO TEXT BADGES & ZERO RESTORE:
 * Holds layout space in the DOM invisibly with a hidden placeholder (zero reflow).
 *
 * @param ctx Effect context with motion hooks and target pickers.
 */
export const senseiEffect = (ctx: EffectContext): void => {
  let sentence: SentenceTarget | null = null;
  try {
    sentence = ctx.pickSentenceTarget();
  } catch {
    sentence = null;
  }

  if (sentence && sentence.chars.length >= 3) {
    try {
      runWaterInkEvaporation(ctx, sentence);
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
      runWordEvaporation(ctx, word);
      return;
    } catch {
      ctx.returnAvatarToDock();
    }
  }

  runAmbientStillness(ctx);
};

/* =========================================================================
   ZEN WATER-INK EVAPORATION
   ========================================================================= */

/**
 * Letters softly blur, steam upward, and evaporate into thin air like water-ink.
 */
function runWaterInkEvaporation(ctx: EffectContext, target: SentenceTarget): void {
  const { stage, accentColor, glideAvatarTo, returnAvatarToDock, scriptCtx } = ctx;
  const { anchorNode, anchorStart, anchorLength, element, chars } = target;

  if (!anchorNode.isConnected || anchorNode.data.length < anchorStart + anchorLength) {
    throw new Error('stale anchor');
  }

  const targetCenterX = target.left + target.width / 2;
  const targetTop = target.top;
  const hoverY = Math.max(8, targetTop - 70);

  glideAvatarTo(targetCenterX, hoverY, GLIDE_MS, () => {
    if (scriptCtx.isInvalid) {
      returnAvatarToDock();
      return;
    }

    // 1. Subtle, tranquil desaturation pulse across viewport (quiet focus)
    const tranquility = document.createElement('div');
    tranquility.style.cssText =
      'position:absolute;inset:0;pointer-events:none;backdrop-filter:saturate(0.45) contrast(0.98);z-index:91;';
    stage.appendChild(tranquility);
    tranquility.animate(
      [{ opacity: 0 }, { opacity: 0.8, offset: 0.3 }, { opacity: 0 }],
      { duration: 1800, fill: 'forwards' },
    ).onfinish = () => tranquility.remove();

    // 2. Remove original text from DOM, holding layout space (Zero Restore)
    let originalText = '';
    try {
      const sliceEnd = anchorStart + anchorLength;
      anchorNode.splitText(sliceEnd);
      const sliceNode = anchorNode.splitText(anchorStart);
      originalText = sliceNode.textContent ?? '';

      const blankHole = document.createElement('span');
      blankHole.setAttribute('data-gremlin-abducted', '1');
      blankHole.style.cssText = `display:inline;visibility:hidden;user-select:none;pointer-events:none;`;
      blankHole.textContent = originalText;

      sliceNode.replaceWith(blankHole);
      element.setAttribute('data-gremlin-hole', '1');
    } catch {
      /** DOM mutation safety */
    }

    // 3. Letters spawn and softly dissolve upward into mist
    const staggerMs = Math.max(16, Math.min(32, Math.round(420 / chars.length)));
    const letterSpans: HTMLElement[] = [];

    chars.forEach((c) => {
      const letter = document.createElement('span');
      letter.textContent = c.ch;
      letter.style.cssText = `
        position:absolute;left:${c.rect.left}px;top:${c.rect.top}px;
        font-family:inherit;font-size:${Math.max(12, Math.round(c.rect.height))}px;
        font-weight:600;color:${accentColor};
        text-shadow:0 0 8px rgba(16, 185, 129, 0.45);
        pointer-events:none;line-height:1;user-select:none;
        opacity:1;will-change:transform,opacity,filter;z-index:93;
      `;
      stage.appendChild(letter);
      letterSpans.push(letter);
    });

    // 4. Soft mist evaporation wave: letters blur, drift upward, and dissolve
    chars.forEach((c, idx) => {
      const span = letterSpans[idx];
      if (!span) return;

      const delay = 120 + idx * staggerMs;
      const driftY = -12 - Math.random() * 8;
      const driftX = (Math.random() - 0.5) * 6;

      span.animate(
        [
          {
            transform: 'translate(0, 0) scale(1)',
            opacity: 1,
            filter: 'blur(0px)',
          },
          {
            transform: `translate(${driftX * 0.4}px, ${driftY * 0.4}px) scale(1.04)`,
            opacity: 0.85,
            filter: 'blur(2px)',
            offset: 0.35,
          },
          {
            transform: `translate(${driftX}px, ${driftY}px) scale(1.08)`,
            opacity: 0,
            filter: 'blur(8px)',
          },
        ],
        {
          duration: EVAPORATE_MS,
          delay,
          easing: 'cubic-bezier(0.25, 0.8, 0.5, 1)',
          fill: 'forwards',
        },
      ).onfinish = () => span.remove();

      // Occasionally spawn a delicate mist speck drifting upward
      if (idx % 3 === 0) {
        const mist = document.createElement('div');
        const mistSize = 4 + Math.random() * 4;
        mist.style.cssText = `
          position:absolute;
          left:${c.rect.left + c.rect.width / 2}px;
          top:${c.rect.top}px;
          width:${mistSize}px;height:${mistSize}px;
          background:radial-gradient(circle, #a7f3d0 0%, rgba(255,255,255,0.4) 60%, transparent 100%);
          border-radius:50%;pointer-events:none;z-index:94;
          filter:blur(1.5px);opacity:0;will-change:transform,opacity;
        `;
        stage.appendChild(mist);

        mist.animate(
          [
            { transform: 'translate(0, 0) scale(0.6)', opacity: 0 },
            { transform: `translate(${(Math.random() - 0.5) * 10}px, -14px) scale(1.2)`, opacity: 0.65, offset: 0.4 },
            { transform: `translate(${(Math.random() - 0.5) * 16}px, -28px) scale(1.8)`, opacity: 0 },
          ],
          {
            duration: EVAPORATE_MS + 200,
            delay: delay + 40,
            easing: 'ease-out',
            fill: 'forwards',
          },
        ).onfinish = () => mist.remove();
      }
    });

    const totalEvaporateTime = 120 + chars.length * staggerMs + EVAPORATE_MS;

    // 5. Sensei bows in quiet reverence over the serene empty space, then glides back
    scriptCtx.setTimeout(() => {
      // Gentle meditative bow (slight nod down and back)
      glideAvatarTo(targetCenterX, hoverY + 6, 200, () => {
        glideAvatarTo(targetCenterX, hoverY, 200, () => {
          scriptCtx.setTimeout(() => {
            returnAvatarToDock(650);
          }, 250);
        });
      });
    }, totalEvaporateTime + 100);
  });
}

/* =========================================================================
   WORD-LEVEL & AMBIENT FALLBACKS
   ========================================================================= */

/**
 * Word-level clean water-ink evaporation fallback.
 */
function runWordEvaporation(ctx: EffectContext, word: WordTarget): void {
  const { stage, accentColor, glideAvatarTo, returnAvatarToDock, scriptCtx } = ctx;
  const targetCenterX = word.left + word.width / 2;
  const hoverY = Math.max(8, word.top - 70);

  glideAvatarTo(targetCenterX, hoverY, GLIDE_MS, () => {
    if (scriptCtx.isInvalid) {
      returnAvatarToDock();
      return;
    }

    try {
      const hit = document.elementFromPoint(targetCenterX, word.top + word.height / 2);
      if (hit instanceof HTMLElement && hit.tagName !== 'BODY') {
        hit.style.visibility = 'hidden';
      }
    } catch {
      /** Safe fallback */
    }

    const wordEl = document.createElement('span');
    wordEl.textContent = word.text;
    wordEl.style.cssText = `
      position:absolute;left:${word.left}px;top:${word.top}px;
      font-family:inherit;font-size:${Math.max(12, Math.round(word.height))}px;
      font-weight:600;color:${accentColor};
      text-shadow:0 0 8px rgba(16, 185, 129, 0.4);
      pointer-events:none;line-height:1;user-select:none;
      z-index:93;will-change:transform,opacity,filter;
    `;
    stage.appendChild(wordEl);

    wordEl.animate(
      [
        { transform: 'translate(0, 0)', opacity: 1, filter: 'blur(0px)' },
        { transform: 'translate(0, -8px)', opacity: 0.8, filter: 'blur(2px)', offset: 0.4 },
        { transform: 'translate(0, -18px)', opacity: 0, filter: 'blur(7px)' },
      ],
      { duration: 750, delay: 100, easing: 'cubic-bezier(0.25, 0.8, 0.5, 1)', fill: 'forwards' },
    ).onfinish = () => wordEl.remove();

    scriptCtx.setTimeout(() => {
      glideAvatarTo(targetCenterX, hoverY + 5, 180, () => {
        glideAvatarTo(targetCenterX, hoverY, 180, () => {
          scriptCtx.setTimeout(() => returnAvatarToDock(520), 200);
        });
      });
    }, 950);
  });
}

/**
 * Ambient stillness fallback for restricted pages.
 */
function runAmbientStillness({ stage, returnAvatarToDock, scriptCtx }: EffectContext): void {
  const calm = document.createElement('div');
  calm.style.cssText =
    'position:absolute;inset:0;backdrop-filter:saturate(0.5);pointer-events:none;z-index:91;';
  stage.appendChild(calm);
  calm.animate(
    [{ opacity: 0 }, { opacity: 0.7, offset: 0.5 }, { opacity: 0 }],
    { duration: 1200, fill: 'forwards' },
  ).onfinish = () => calm.remove();

  scriptCtx.setTimeout(() => returnAvatarToDock(500), 700);
}
