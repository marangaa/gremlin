import type { EffectContext, SentenceTarget, WordTarget } from '../types';

/**
 * Kuro — KATANA SEVERANCE & SHADOW DASH.
 *
 * Kuro dashes across the distraction text at blinding speed. An intense crimson
 * blade flash and razor-sharp diagonal slash cuts through the sentence. The
 * letters physically cleave apart diagonally with RGB chromatic aberration and
 * embers, permanently severing the distraction from the page.
 *
 * ZERO TEXT BADGES:
 * Clean, cinematic blade severance. The distraction text is permanently
 * excised from the DOM with zero reflow.
 *
 * @param ctx Effect context with motion hooks and target pickers.
 */
export const kuroEffect = (ctx: EffectContext): void => {
  let sentence: SentenceTarget | null = null;
  try {
    sentence = ctx.pickSentenceTarget();
  } catch {
    sentence = null;
  }

  if (sentence && sentence.chars.length >= 3) {
    try {
      runKuroKatanaSlash(ctx, sentence);
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
      runKuroWordSlash(ctx, word);
      return;
    } catch {
      ctx.returnAvatarToDock();
    }
  }

  runKuroAmbientTear(ctx);
};

/**
 * Executes Kuro's katana dash, razor slash line, severed displacement, and embers.
 */
function runKuroKatanaSlash(ctx: EffectContext, target: SentenceTarget): void {
  const { stage, accentColor, glideAvatarTo, returnAvatarToDock, scriptCtx } = ctx;
  const { anchorNode, anchorStart, anchorLength, element, chars } = target;

  if (!anchorNode.isConnected || anchorNode.data.length < anchorStart + anchorLength) {
    throw new Error('stale anchor');
  }

  const startX = target.left - 30;
  const endX = target.left + target.width + 40;
  const targetY = target.top - 55;

  // 1. Kuro positions at the strike start
  glideAvatarTo(startX, targetY, 320, () => {
    if (scriptCtx.isInvalid) {
      returnAvatarToDock();
      return;
    }

    // Brief tension beat before the strike
    scriptCtx.setTimeout(() => {
      // 2. BLINDING DASH ACROSS THE TEXT
      glideAvatarTo(endX, targetY, 220, () => {
        // 3. Razor Slash SVG Streak
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:94;overflow:visible;';

        const slash = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        slash.setAttribute('x1', `${target.left - 15}`);
        slash.setAttribute('y1', `${target.top + target.height + 8}`);
        slash.setAttribute('x2', `${target.left + target.width + 25}`);
        slash.setAttribute('y2', `${target.top - 8}`);
        slash.setAttribute('stroke', '#ffffff');
        slash.setAttribute('stroke-width', '3');
        slash.setAttribute('stroke-linecap', 'round');
        slash.setAttribute('filter', `drop-shadow(0 0 8px ${accentColor}) drop-shadow(0 0 16px ${accentColor})`);
        svg.appendChild(slash);
        stage.appendChild(svg);

        slash.animate(
          [
            { opacity: 0, strokeDasharray: '0 600', strokeDashoffset: '300' },
            { opacity: 1, strokeDasharray: '600 0', strokeDashoffset: '0', offset: 0.3 },
            { opacity: 0, strokeWidth: '0.5' },
          ],
          { duration: 280, easing: 'ease-out', fill: 'forwards' },
        ).onfinish = () => svg.remove();

        // 4. Chromatic Aberration Screen Tear
        for (const [color, dx] of [
          ['rgba(239,68,68,0.4)', -6],
          ['rgba(0,229,255,0.4)', 6],
        ] as const) {
          const ghost = document.createElement('div');
          ghost.style.cssText = `position:absolute;inset:0;pointer-events:none;background:${color};mix-blend-mode:screen;z-index:92;`;
          stage.appendChild(ghost);
          ghost.animate(
            [
              { opacity: 0, transform: 'translateX(0)' },
              { opacity: 1, transform: `translateX(${dx}px)`, offset: 0.3 },
              { opacity: 0, transform: `translateX(${-dx * 0.5}px)` },
            ],
            { duration: 220, easing: 'ease-out', fill: 'forwards' },
          ).onfinish = () => ghost.remove();
        }

        // 5. Remove original text from the DOM, holding layout space (Zero Restore)
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

        // 6. Severed Letters Cleave Displacements
        chars.forEach((c, idx) => {
          const letter = document.createElement('span');
          letter.textContent = c.ch;
          letter.style.cssText = `
            position:absolute;left:${c.rect.left}px;top:${c.rect.top}px;
            font-family:inherit;font-size:${Math.max(12, Math.round(c.rect.height))}px;
            font-weight:700;color:${accentColor};
            text-shadow:0 0 8px ${accentColor};
            pointer-events:none;line-height:1;user-select:none;
            z-index:93;will-change:transform,opacity;
          `;
          stage.appendChild(letter);

          // Diagonal parting: letters alternate sliding up-left vs down-right
          const isUpper = idx % 2 === 0;
          const driftX = isUpper ? -14 - Math.random() * 12 : 14 + Math.random() * 12;
          const driftY = isUpper ? -8 - Math.random() * 8 : 8 + Math.random() * 8;
          const spin = isUpper ? -15 : 15;

          letter.animate(
            [
              { transform: 'translate(0, 0) scale(1)', opacity: 1 },
              {
                transform: `translate(${driftX * 0.4}px, ${driftY * 0.4}px) rotate(${spin * 0.5}deg)`,
                opacity: 0.95,
                offset: 0.25,
              },
              {
                transform: `translate(${driftX}px, ${driftY}px) rotate(${spin}deg)`,
                opacity: 0.8,
                offset: 0.7,
              },
              {
                transform: `translate(${driftX * 1.3}px, ${driftY * 1.3}px) rotate(${spin * 1.5}deg)`,
                opacity: 0,
              },
            ],
            { duration: 800, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fill: 'forwards' },
          ).onfinish = () => letter.remove();
        });

        // 7. Crimson Spark Embers along the slash
        for (let i = 0; i < 14; i++) {
          const ember = document.createElement('div');
          const size = 2 + Math.random() * 3;
          const t = Math.random();
          const ex = target.left + target.width * t;
          const ey = target.top + target.height * (1 - t);
          ember.style.cssText = `
            position:absolute;left:${ex}px;top:${ey}px;
            width:${size}px;height:${size}px;
            background:#ffffff;box-shadow:0 0 6px 2px ${accentColor};
            border-radius:50%;pointer-events:none;z-index:95;
          `;
          stage.appendChild(ember);
          ember.animate(
            [
              { transform: 'translate(0, 0) scale(1)', opacity: 1 },
              {
                transform: `translate(${(Math.random() - 0.5) * 50}px, ${(Math.random() - 0.5) * 40}px) scale(0)`,
                opacity: 0,
              },
            ],
            { duration: 400 + Math.random() * 300, easing: 'ease-out', fill: 'forwards' },
          ).onfinish = () => ember.remove();
        }

        // 8. Sheathes the blade: disciplined silence for 1.5s, then vanishes back to dock
        scriptCtx.setTimeout(() => {
          returnAvatarToDock(480);
        }, 1500);
      });
    }, 180);
  });
}

/**
 * Word-level slash fallback.
 */
function runKuroWordSlash(ctx: EffectContext, word: WordTarget): void {
  const { stage, accentColor, glideAvatarTo, returnAvatarToDock, scriptCtx } = ctx;
  const targetCenterX = word.left + word.width / 2;
  const targetY = word.top - 55;

  glideAvatarTo(word.left - 20, targetY, 280, () => {
    glideAvatarTo(word.left + word.width + 20, targetY, 180, () => {
      try {
        const hit = document.elementFromPoint(targetCenterX, word.top + word.height / 2);
        if (hit instanceof HTMLElement && hit.tagName !== 'BODY') {
          hit.style.visibility = 'hidden';
        }
      } catch {
        /** Safe fallback */
      }

      const flash = document.createElement('div');
      flash.style.cssText = `position:absolute;left:${word.left - 10}px;top:${word.top}px;width:${word.width + 20}px;height:2px;background:#ffffff;box-shadow:0 0 10px ${accentColor};pointer-events:none;z-index:94;`;
      stage.appendChild(flash);
      flash.animate(
        [{ opacity: 1, transform: 'scaleX(0)' }, { opacity: 1, transform: 'scaleX(1)', offset: 0.5 }, { opacity: 0 }],
        { duration: 240, fill: 'forwards' },
      ).onfinish = () => flash.remove();

      scriptCtx.setTimeout(() => returnAvatarToDock(480), 1200);
    });
  });
}

/**
 * Ambient screen tear fallback.
 */
function runKuroAmbientTear({ stage, accentColor, returnAvatarToDock, scriptCtx }: EffectContext): void {
  const tear = document.createElement('div');
  const vh = window.innerHeight;
  tear.style.cssText = `position:absolute;left:0;right:0;top:${vh * 0.4}px;height:48px;pointer-events:none;backdrop-filter:invert(1);z-index:92;`;
  stage.appendChild(tear);
  tear.animate(
    [{ opacity: 0 }, { opacity: 1, offset: 0.2 }, { opacity: 0 }],
    { duration: 260, fill: 'forwards' },
  ).onfinish = () => tear.remove();

  scriptCtx.setTimeout(() => returnAvatarToDock(440), 750);
}
