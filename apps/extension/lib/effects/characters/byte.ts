import type { EffectContext, SentenceTarget, WordTarget } from '../types';

/** Flight time for Byte's glide to target. */
const GLIDE_MS = 500;

const GLYPHS = '01<>{}[]#$%&*/\\;:=ABCDEF01';

/**
 * Byte — MATRIX DE-REZZ & GLITCH CASCADE.
 *
 * Byte glides directly above the distraction text and sweeps an analytical
 * cyan laser scanner line down across the words. As the scanner sweeps, each
 * character is converted into a live, rapidly cycling stream of raw hexadecimal
 * and binary machine glyphs that de-rez (dissolve into floating digital bits).
 *
 * ZERO TEXT BADGES:
 * Leaves an empty layout-held space in the DOM (zero reflow). No cartoon
 * stickers or text badges are left behind.
 *
 * @param ctx Effect context with motion hooks and target pickers.
 */
export const byteEffect = (ctx: EffectContext): void => {
  let sentence: SentenceTarget | null = null;
  try {
    sentence = ctx.pickSentenceTarget();
  } catch {
    sentence = null;
  }

  if (sentence && sentence.chars.length >= 3) {
    try {
      runByteDeRez(ctx, sentence);
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
      runByteWordDeRez(ctx, word);
      return;
    } catch {
      ctx.returnAvatarToDock();
    }
  }

  runByteAmbientGlitch(ctx);
};

/**
 * Executes Byte's laser scan and character de-rezzing cascade.
 */
function runByteDeRez(ctx: EffectContext, target: SentenceTarget): void {
  const { stage, accentColor, glideAvatarTo, returnAvatarToDock, scriptCtx } = ctx;
  const { anchorNode, anchorStart, anchorLength, element, chars } = target;

  if (!anchorNode.isConnected || anchorNode.data.length < anchorStart + anchorLength) {
    throw new Error('stale anchor');
  }

  const targetCenterX = target.left + target.width / 2;
  const targetTop = target.top;
  const hoverY = Math.max(8, targetTop - 70);

  // 1. Byte glides above the distraction line
  glideAvatarTo(targetCenterX, hoverY, GLIDE_MS, () => {
    if (scriptCtx.isInvalid) {
      returnAvatarToDock();
      return;
    }

    // 2. Cyan analytical laser scanner line sweeping down across the text
    const laser = document.createElement('div');
    laser.style.cssText = `
      position:absolute;left:${target.left - 20}px;top:${targetTop - 10}px;
      width:${target.width + 40}px;height:3px;
      background:#ffffff;
      box-shadow:0 0 10px 3px ${accentColor}, 0 0 20px 6px ${accentColor}88;
      pointer-events:none;z-index:94;
    `;
    stage.appendChild(laser);

    laser.animate(
      [
        { transform: 'translateY(0)', opacity: 0 },
        { transform: 'translateY(4px)', opacity: 1, offset: 0.2 },
        { transform: `translateY(${target.height + 16}px)`, opacity: 0.9, offset: 0.8 },
        { transform: `translateY(${target.height + 22}px)`, opacity: 0 },
      ],
      { duration: 420, easing: 'ease-in-out', fill: 'forwards' },
    ).onfinish = () => laser.remove();

    // 3. Remove original text from the DOM, holding layout space (Zero Restore)
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

    // 4. Glitching machine code streams in place of each character
    const glyphElements: Array<{ el: HTMLElement; originalCh: string }> = [];

    chars.forEach((c) => {
      const g = document.createElement('span');
      g.textContent = c.ch;
      g.style.cssText = `
        position:absolute;left:${c.rect.left}px;top:${c.rect.top}px;
        font-family:monospace;font-size:${Math.max(12, Math.round(c.rect.height))}px;
        font-weight:700;color:${accentColor};
        text-shadow:0 0 8px ${accentColor};
        pointer-events:none;line-height:1;user-select:none;
        z-index:93;will-change:transform,opacity;
      `;
      stage.appendChild(g);
      glyphElements.push({ el: g, originalCh: c.ch });
    });

    // Rapid glyph scrambling loop for 750ms
    let scrambleTimer: number;
    let scrambleTicks = 0;
    const maxTicks = 18;

    const scramble = () => {
      scrambleTicks++;
      glyphElements.forEach(({ el }) => {
        el.textContent = GLYPHS[Math.floor(Math.random() * GLYPHS.length)]!;
        el.style.color = Math.random() > 0.3 ? accentColor : '#ffffff';
      });

      if (scrambleTicks < maxTicks) {
        scrambleTimer = window.setTimeout(scramble, 40);
      } else {
        // 5. De-rezz dissolve: bits disperse upward and fade into scanlines
        glyphElements.forEach(({ el }, i) => {
          const driftX = (Math.random() - 0.5) * 40;
          const driftY = -15 - Math.random() * 35;
          el.animate(
            [
              { transform: 'translate(0, 0) scale(1)', opacity: 1 },
              {
                transform: `translate(${driftX * 0.4}px, ${driftY * 0.4}px) scale(1.15)`,
                opacity: 0.8,
                offset: 0.35,
              },
              {
                transform: `translate(${driftX}px, ${driftY}px) scale(0)`,
                opacity: 0,
              },
            ],
            {
              duration: 480 + Math.random() * 200,
              delay: i * 8,
              easing: 'ease-out',
              fill: 'forwards',
            },
          ).onfinish = () => el.remove();
        });
      }
    };

    scramble();

    // 6. Subtle scanline flicker across stage
    const scanline = document.createElement('div');
    scanline.style.cssText = `
      position:absolute;inset:0;
      background:repeating-linear-gradient(0deg, rgba(34,211,238,0.06) 0px, rgba(34,211,238,0.06) 1px, transparent 1px, transparent 3px);
      pointer-events:none;z-index:90;
    `;
    stage.appendChild(scanline);
    scanline.animate(
      [{ opacity: 0 }, { opacity: 0.7, offset: 0.3 }, { opacity: 0 }],
      { duration: 600, easing: 'steps(4)', fill: 'forwards' },
    ).onfinish = () => scanline.remove();

    // 7. Byte holds analytical silence, then glides back to dock
    scriptCtx.setTimeout(() => {
      returnAvatarToDock(520);
    }, 1800);
  });
}

/**
 * Word-level de-rezzing fallback.
 */
function runByteWordDeRez(ctx: EffectContext, word: WordTarget): void {
  const { stage, accentColor, glideAvatarTo, returnAvatarToDock, scriptCtx } = ctx;
  const targetCenterX = word.left + word.width / 2;
  const hoverY = Math.max(8, word.top - 70);

  glideAvatarTo(targetCenterX, hoverY, GLIDE_MS, () => {
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
      font-family:monospace;font-size:${Math.max(12, Math.round(word.height))}px;
      font-weight:700;color:${accentColor};text-shadow:0 0 8px ${accentColor};
      pointer-events:none;z-index:93;
    `;
    stage.appendChild(wordEl);

    let ticks = 0;
    const cycle = () => {
      ticks++;
      wordEl.textContent = Array.from({ length: word.text.length }, () =>
        GLYPHS[Math.floor(Math.random() * GLYPHS.length)],
      ).join('');

      if (ticks < 12) {
        scriptCtx.setTimeout(cycle, 45);
      } else {
        wordEl.animate(
          [
            { transform: 'scale(1)', opacity: 1 },
            { transform: 'translateY(-20px) scale(0)', opacity: 0 },
          ],
          { duration: 420, easing: 'ease-out', fill: 'forwards' },
        ).onfinish = () => wordEl.remove();
      }
    };
    cycle();

    scriptCtx.setTimeout(() => {
      returnAvatarToDock(520);
    }, 1400);
  });
}

/**
 * Ambient screen glitch fallback for restricted pages.
 */
function runByteAmbientGlitch({ stage, accentColor, returnAvatarToDock, scriptCtx }: EffectContext): void {
  const band = document.createElement('div');
  band.style.cssText = `
    position:absolute;inset:0;
    background:repeating-linear-gradient(0deg, rgba(34,211,238,0.12) 0px, rgba(34,211,238,0.12) 1px, transparent 1px, transparent 3px);
    pointer-events:none;z-index:91;
  `;
  stage.appendChild(band);
  band.animate(
    [{ opacity: 0 }, { opacity: 0.8, offset: 0.2 }, { opacity: 0.2, offset: 0.6 }, { opacity: 0 }],
    { duration: 700, easing: 'steps(5)', fill: 'forwards' },
  ).onfinish = () => band.remove();

  scriptCtx.setTimeout(() => returnAvatarToDock(480), 800);
}
