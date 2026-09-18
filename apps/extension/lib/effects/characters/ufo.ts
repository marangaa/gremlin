import type { EffectContext, SentenceTarget, WordTarget } from '../types';

/** Flight time from docked spot to target, in milliseconds. */
const GLIDE_MS = 650;

/** Duration of a single letter's lift through the light tube into the saucer hull. */
const LIFT_DURATION_MS = 900;

/**
 * Zeta — CLEAN SCI-FI LIGHT TUBE ABDUCTION.
 *
 * 1. Zeta glides above the distraction and hovers in stillness.
 * 2. An energetic laser underline draws directly beneath the target text line.
 * 3. A crisp vertical light tube / cylindrical beam extends straight down from
 *    the saucer emitter onto that underlined section (no ambient fluff/haze).
 * 4. The underlined text lights up in bioluminescence.
 * 5. Straight vertical lift (no spiral): letters levitate straight up through
 *    the beam tube, funneling directly into the saucer's bottom hatch.
 * 6. The beam tube retracts upwards, the underline extinguishes.
 * 7. Zeta pauses over the pristine empty gap, then glides back to dock.
 *
 * ZERO TEXT BADGES & ZERO RESTORE:
 * Holds layout space in the DOM invisibly with a hidden placeholder (zero reflow).
 *
 * @param ctx Effect context with motion hooks and target pickers.
 */
export const ufoEffect = (ctx: EffectContext): void => {
  let sentence: SentenceTarget | null = null;
  try {
    sentence = ctx.pickSentenceTarget();
  } catch {
    sentence = null;
  }

  if (sentence && sentence.chars.length >= 3) {
    try {
      runCinematicAbduction(ctx, sentence);
      return;
    } catch {
      ctx.setBeaming(false);
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
      runWordCinematicAbduction(ctx, word);
      return;
    } catch {
      ctx.setBeaming(false);
      ctx.returnAvatarToDock();
    }
  }

  scanSweep(ctx.stage, ctx.accentColor);
};

/* =========================================================================
   LASER UNDERLINE & VERTICAL LIGHT TUBE
   ========================================================================= */

interface BeamRig {
  svg: SVGSVGElement;
  underline: HTMLElement;
  hud: HTMLElement;
  close: () => void;
}

/**
 * Builds:
 * 1. A targeting HUD reticle brackets and glowing laser underline directly beneath the targeted text.
 * 2. A crisp vertical cylindrical energy pipe descending straight from saucer emitter onto the underlined section.
 * 3. EMP shockwave ring on beam retract.
 * Zero ambient stuff, zero hazy polygons.
 */
function buildLightTube(
  stage: HTMLElement,
  emitterX: number,
  emitterY: number,
  target: { left: number; top: number; width: number; height: number },
  accentColor: string,
): BeamRig {
  const underlineY = target.top + target.height + 2;

  // 1. Sleek Sci-Fi Targeting HUD Reticle
  const hud = document.createElement('div');
  hud.style.cssText = `
    position:absolute;
    left:${target.left - 6}px;top:${target.top - 4}px;
    width:${target.width + 12}px;height:${target.height + 8}px;
    pointer-events:none;z-index:92;
    border-left:2px solid ${accentColor};
    border-right:2px solid ${accentColor};
    box-shadow:inset 0 0 10px ${accentColor}33;
    opacity:0;will-change:opacity,transform;
  `;
  stage.appendChild(hud);
  hud.animate(
    [
      { opacity: 0, transform: 'scale(1.08)' },
      { opacity: 0.9, transform: 'scale(1)' },
    ],
    { duration: 160, easing: 'cubic-bezier(0.2, 0.9, 0.4, 1)', fill: 'forwards' },
  );

  // 2. Energetic Laser Underline directly beneath the targeted text
  const underline = document.createElement('div');
  underline.style.cssText = `
    position:absolute;left:${target.left}px;top:${underlineY}px;
    width:${target.width}px;height:3px;
    background:#ffffff;
    box-shadow:0 0 6px ${accentColor}, 0 0 14px ${accentColor}, 0 0 22px #ffffff;
    border-radius:2px;pointer-events:none;z-index:93;
    transform-origin:center;will-change:transform,opacity;
  `;
  stage.appendChild(underline);

  // Laser underline draws outward across the text line
  underline.animate(
    [
      { transform: 'scaleX(0)', opacity: 0 },
      { transform: 'scaleX(1)', opacity: 1 },
    ],
    { duration: 180, easing: 'cubic-bezier(0.2, 0.9, 0.4, 1)', fill: 'forwards' },
  );

  // 3. Clean Vertical Cylindrical Energy Pipe coming straight down from saucer emitter onto the section
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute(
    'style',
    'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;overflow:visible;z-index:91;',
  );

  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  const uid = Math.random().toString(36).slice(2, 7);

  // Cylindrical Tube Fill Gradient (bright at top emitter, clean down to the underline)
  const tubeGrad = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
  const tubeGradId = `ufo-tube-${uid}`;
  tubeGrad.setAttribute('id', tubeGradId);
  tubeGrad.setAttribute('x1', '0%');
  tubeGrad.setAttribute('y1', '0%');
  tubeGrad.setAttribute('x2', '0%');
  tubeGrad.setAttribute('y2', '100%');
  tubeGrad.innerHTML = `
    <stop offset="0%" stop-color="#ffffff" stop-opacity="0.95" />
    <stop offset="15%" stop-color="${accentColor}" stop-opacity="0.8" />
    <stop offset="60%" stop-color="${accentColor}" stop-opacity="0.45" />
    <stop offset="100%" stop-color="${accentColor}" stop-opacity="0.75" />
  `;
  defs.appendChild(tubeGrad);
  svg.appendChild(defs);

  // Energy pipe width (parallel cylindrical elevator tube, cleanly enclosing the target zone)
  const pipeHalfWidth = Math.max(30, Math.min(Math.round(target.width / 2) + 12, 160));
  const pipeLeft = emitterX - pipeHalfWidth;
  const pipeRight = emitterX + pipeHalfWidth;

  // The main vertical energy pipe column (straight parallel walls)
  const tube = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
  tube.setAttribute(
    'points',
    `${pipeLeft},${emitterY} ${pipeRight},${emitterY} ${pipeRight},${underlineY} ${pipeLeft},${underlineY}`,
  );
  tube.setAttribute('fill', `url(#${tubeGradId})`);
  tube.setAttribute('style', 'transform-origin: top; will-change: clip-path, opacity;');
  svg.appendChild(tube);

  // Crisp parallel vertical laser boundaries (straight vertical lines)
  const leftEdge = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  leftEdge.setAttribute('x1', `${pipeLeft}`);
  leftEdge.setAttribute('y1', `${emitterY}`);
  leftEdge.setAttribute('x2', `${pipeLeft}`);
  leftEdge.setAttribute('y2', `${underlineY}`);
  leftEdge.setAttribute('stroke', '#ffffff');
  leftEdge.setAttribute('stroke-width', '2');
  leftEdge.setAttribute('stroke-opacity', '0.95');
  leftEdge.setAttribute('filter', `drop-shadow(0 0 6px ${accentColor})`);
  svg.appendChild(leftEdge);

  const rightEdge = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  rightEdge.setAttribute('x1', `${pipeRight}`);
  rightEdge.setAttribute('y1', `${emitterY}`);
  rightEdge.setAttribute('x2', `${pipeRight}`);
  rightEdge.setAttribute('y2', `${underlineY}`);
  rightEdge.setAttribute('stroke', '#ffffff');
  rightEdge.setAttribute('stroke-width', '2');
  rightEdge.setAttribute('stroke-opacity', '0.95');
  rightEdge.setAttribute('filter', `drop-shadow(0 0 6px ${accentColor})`);
  svg.appendChild(rightEdge);

  stage.appendChild(svg);

  // The beam comes DOWN from the saucer hatch to the underlined section
  tube.animate(
    [
      { clipPath: 'inset(0 0 100% 0)', opacity: 0.4 },
      { clipPath: 'inset(0 0 0% 0)', opacity: 1 },
    ],
    { duration: 200, easing: 'cubic-bezier(0.1, 0.9, 0.3, 1)', fill: 'forwards' },
  );

  const edgesAnimation = [leftEdge, rightEdge].map((edge) =>
    edge.animate(
      [
        { strokeDasharray: '400', strokeDashoffset: '400', opacity: 0 },
        { strokeDashoffset: '0', opacity: 1 },
      ],
      { duration: 200, easing: 'cubic-bezier(0.1, 0.9, 0.3, 1)', fill: 'forwards' },
    ),
  );

  const close = () => {
    // Retract beam tube back up into saucer and fade underline
    tube.animate(
      [
        { clipPath: 'inset(0 0 0% 0)', opacity: 1 },
        { clipPath: 'inset(0 0 100% 0)', opacity: 0 },
      ],
      { duration: 150, easing: 'ease-in', fill: 'forwards' },
    );
    edgesAnimation.forEach((a) =>
      a.effect &&
      [leftEdge, rightEdge].forEach((e) =>
        e.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 130, fill: 'forwards' }),
      ),
    );
    underline.animate(
      [
        { transform: 'scaleX(1)', opacity: 1 },
        { transform: 'scaleX(0.2)', opacity: 0 },
      ],
      { duration: 140, easing: 'ease-in', fill: 'forwards' },
    );
    hud.animate(
      [
        { opacity: 0.9, transform: 'scale(1)' },
        { opacity: 0, transform: 'scale(0.95)' },
      ],
      { duration: 140, easing: 'ease-in', fill: 'forwards' },
    );

    // 4. Expanding EMP Shockwave Ring
    const shockwave = document.createElement('div');
    shockwave.style.cssText = `
      position:absolute;
      left:${emitterX - 25}px;top:${underlineY - 25}px;
      width:50px;height:50px;
      border:2px solid #ffffff;
      box-shadow:0 0 16px ${accentColor}, 0 0 28px ${accentColor};
      border-radius:50%;
      pointer-events:none;z-index:94;
    `;
    stage.appendChild(shockwave);
    shockwave.animate(
      [
        { transform: 'scale(0.2)', opacity: 1 },
        { transform: 'scale(3.2)', opacity: 0 },
      ],
      { duration: 280, easing: 'cubic-bezier(0.1, 0.8, 0.3, 1)', fill: 'forwards' },
    ).onfinish = () => shockwave.remove();

    setTimeout(() => {
      svg.remove();
      underline.remove();
      hud.remove();
    }, 180);
  };

  return { svg, underline, hud, close };
}

/* =========================================================================
   CINEMATIC SENTENCE ABDUCTION
   ========================================================================= */

/**
 * Executes the clean sci-fi abduction:
 * Underlines text -> beam tube descends -> letters lift straight up through tube into saucer.
 */
function runCinematicAbduction(ctx: EffectContext, target: SentenceTarget): void {
  const { stage, accentColor, glideAvatarTo, returnAvatarToDock, setBeaming, getSaucerEmitterPoint, scriptCtx } = ctx;
  const { anchorNode, anchorStart, anchorLength, element, chars } = target;

  if (!anchorNode.isConnected || anchorNode.data.length < anchorStart + anchorLength) {
    throw new Error('stale anchor');
  }

  const targetCenterX = target.left + target.width / 2;
  const targetTop = target.top;

  // Saucer hovers ~70px above targetTop (emitter offset is 62px from avatar top)
  const hoverY = Math.max(8, targetTop - 70 - 62);

  glideAvatarTo(targetCenterX, hoverY, GLIDE_MS, () => {
    if (scriptCtx.isInvalid) {
      returnAvatarToDock();
      return;
    }

    setBeaming(true);
    const emitter = getSaucerEmitterPoint();

    // 1. Deploy the laser underline and vertical light tube descending onto it
    const rig = buildLightTube(stage, emitter.x, emitter.y, target, accentColor);

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

    // 3. Spawn physical highlighted letters inside the tube
    const letterSpans: HTMLElement[] = [];

    chars.forEach((c) => {
      const letter = document.createElement('span');
      letter.textContent = c.ch;
      letter.style.cssText = `
        position:absolute;left:${c.rect.left}px;top:${c.rect.top}px;
        font-family:inherit;font-size:${Math.max(12, Math.round(c.rect.height))}px;
        font-weight:700;color:#ffffff;
        text-shadow:0 0 6px ${accentColor}, 0 0 14px ${accentColor}, 0 0 20px #ffffff;
        pointer-events:none;line-height:1;user-select:none;
        opacity:0;will-change:transform,opacity;z-index:93;
      `;
      stage.appendChild(letter);
      letterSpans.push(letter);
    });

    // 4. THE HIGHLIGHT: Text energizes inside the beam
    letterSpans.forEach((span) => {
      span.animate(
        [
          { opacity: 0, transform: 'scale(0.96)' },
          { opacity: 1, transform: 'scale(1.04)', offset: 0.6 },
          { opacity: 1, transform: 'scale(1)' },
        ],
        { duration: 200, easing: 'ease-out', fill: 'forwards' },
      );
    });

    // 5. Short pause beat before suction begins (240ms)
    const liftStartDelay = 260;
    const staggerMs = Math.max(20, Math.min(36, Math.round(380 / chars.length)));

    // 6. STRAIGHT VERTICAL LIFT UP THROUGH THE TUBE (NO SPIRAL!):
    // Letters rise straight up inside the tube column, funneling into the saucer hatch
    chars.forEach((c, idx) => {
      const span = letterSpans[idx];
      if (!span) return;

      const charCenterX = c.rect.left + c.rect.width / 2;
      const dx = emitter.x - charCenterX;
      const dy = emitter.y - 4 - c.rect.top; // Coordinates of the saucer bottom hatch

      span.animate(
        [
          // 0%: Ground level, illuminated by laser underline
          {
            transform: 'translate(0, 0) scale(1)',
            opacity: 1,
          },
          // 25%: Levitation off ground, sliding into the mouth of the energy pipe
          {
            transform: `translate(${dx * 0.7}px, -14px) scale(1.02)`,
            opacity: 1,
            offset: 0.25,
          },
          // 45%: Entering the vertical energy pipe column
          {
            transform: `translate(${dx}px, -28px) scale(0.95)`,
            opacity: 1,
            offset: 0.45,
          },
          // 75%: Ascending straight up through the vertical pipe column
          {
            transform: `translate(${dx}px, ${dy * 0.68}px) scale(0.68)`,
            opacity: 0.95,
            offset: 0.75,
          },
          // 92%: Reaching saucer hatch
          {
            transform: `translate(${dx}px, ${dy * 0.92}px) scale(0.28)`,
            opacity: 0.85,
            offset: 0.92,
          },
          // 100%: Pulled straight inside the saucer hull!
          {
            transform: `translate(${dx}px, ${dy}px) scale(0.02)`,
            opacity: 0,
          },
        ],
        {
          duration: LIFT_DURATION_MS,
          delay: liftStartDelay + idx * staggerMs,
          easing: 'cubic-bezier(0.2, 0.1, 0.25, 1)',
          fill: 'forwards',
        },
      );
    });

    // Spawn glowing voxel particles that dissolve and accelerate up the tube
    const voxelCount = Math.min(20, Math.max(10, Math.round(target.width / 10)));
    for (let i = 0; i < voxelCount; i++) {
      const v = document.createElement('div');
      const vSize = i % 3 === 0 ? 5 : 3;
      const vx = target.left + (target.width * (i + 0.5)) / voxelCount + (Math.sin(i * 99) * 6);
      const vy = target.top + target.height * 0.5 + (Math.cos(i * 33) * 6);
      v.style.cssText = `
        position:absolute;left:${vx}px;top:${vy}px;
        width:${vSize}px;height:${vSize}px;
        background:#ffffff;
        box-shadow:0 0 6px ${accentColor}, 0 0 12px ${accentColor};
        border-radius:1px;pointer-events:none;z-index:94;
        opacity:0;will-change:transform,opacity;
      `;
      stage.appendChild(v);

      const vdx = emitter.x - vx;
      const vdy = emitter.y - 4 - vy;
      const vDelay = liftStartDelay + Math.random() * (chars.length * staggerMs * 0.8);

      v.animate(
        [
          { opacity: 0, transform: 'translate(0, 0) scale(0.5)' },
          { opacity: 1, transform: `translate(${vdx * 0.4}px, -18px) scale(1.2)`, offset: 0.2 },
          { opacity: 0.9, transform: `translate(${vdx * 0.8}px, ${vdy * 0.65}px) scale(0.9)`, offset: 0.65 },
          { opacity: 0, transform: `translate(${vdx}px, ${vdy}px) scale(0.1)` },
        ],
        {
          duration: 750,
          delay: vDelay,
          easing: 'cubic-bezier(0.15, 0.8, 0.25, 1)',
          fill: 'forwards',
        },
      ).onfinish = () => v.remove();
    }

    // Calculate completion timing
    const totalLiftTime = liftStartDelay + chars.length * staggerMs + LIFT_DURATION_MS;

    // 7. Retract beam tube, extinguish underline, glide home
    scriptCtx.setTimeout(() => {
      rig.close();
      setBeaming(false);

      scriptCtx.setTimeout(() => {
        returnAvatarToDock(650);
      }, 350);
    }, totalLiftTime + 400);
  });
}

/* =========================================================================
   WORD-LEVEL & SCANLINE FALLBACKS
   ========================================================================= */

/**
 * Word-level clean light tube abduction fallback.
 */
function runWordCinematicAbduction(ctx: EffectContext, word: WordTarget): void {
  const { stage, accentColor, glideAvatarTo, returnAvatarToDock, setBeaming, getSaucerEmitterPoint, scriptCtx } = ctx;

  const targetCenterX = word.left + word.width / 2;
  const hoverY = Math.max(8, word.top - 70 - 62);

  glideAvatarTo(targetCenterX, hoverY, GLIDE_MS, () => {
    if (scriptCtx.isInvalid) {
      returnAvatarToDock();
      return;
    }

    setBeaming(true);
    const emitter = getSaucerEmitterPoint();
    const rig = buildLightTube(stage, emitter.x, emitter.y, word, accentColor);

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
      font-weight:700;color:#ffffff;
      text-shadow:0 0 8px ${accentColor}, 0 0 16px ${accentColor}, 0 0 22px #ffffff;
      pointer-events:none;line-height:1;user-select:none;
      z-index:93;will-change:transform,opacity;
    `;
    stage.appendChild(wordEl);

    const dx = emitter.x - targetCenterX;
    const dy = emitter.y - 4 - word.top;

    wordEl.animate(
      [
        { transform: 'translate(0, 0) scale(1)', opacity: 1 },
        { transform: `translate(${dx * 0.7}px, -14px) scale(1.02)`, opacity: 1, offset: 0.25 },
        { transform: `translate(${dx}px, -24px) scale(0.92)`, opacity: 0.95, offset: 0.45 },
        { transform: `translate(${dx}px, ${dy * 0.7}px) scale(0.6)`, opacity: 0.9, offset: 0.75 },
        { transform: `translate(${dx}px, ${dy}px) scale(0.03)`, opacity: 0 },
      ],
      { duration: 850, delay: 240, easing: 'cubic-bezier(0.2, 0.1, 0.25, 1)', fill: 'forwards' },
    ).onfinish = () => wordEl.remove();

    // Voxel particles rising with the word
    const voxelCount = Math.min(14, Math.max(6, Math.round(word.width / 12)));
    for (let i = 0; i < voxelCount; i++) {
      const v = document.createElement('div');
      const vSize = i % 2 === 0 ? 4 : 3;
      const vx = word.left + (word.width * (i + 0.5)) / voxelCount + (Math.sin(i * 45) * 4);
      const vy = word.top + word.height * 0.5 + (Math.cos(i * 45) * 4);
      v.style.cssText = `
        position:absolute;left:${vx}px;top:${vy}px;
        width:${vSize}px;height:${vSize}px;
        background:#ffffff;
        box-shadow:0 0 6px ${accentColor}, 0 0 12px ${accentColor};
        border-radius:1px;pointer-events:none;z-index:94;
        opacity:0;will-change:transform,opacity;
      `;
      stage.appendChild(v);

      const vdx = emitter.x - vx;
      const vdy = emitter.y - 4 - vy;

      v.animate(
        [
          { opacity: 0, transform: 'translate(0, 0) scale(0.5)' },
          { opacity: 1, transform: `translate(${vdx * 0.4}px, -14px) scale(1.1)`, offset: 0.2 },
          { opacity: 0.9, transform: `translate(${vdx * 0.8}px, ${vdy * 0.7}px) scale(0.85)`, offset: 0.7 },
          { opacity: 0, transform: `translate(${vdx}px, ${vdy}px) scale(0.1)` },
        ],
        {
          duration: 750,
          delay: 240 + Math.random() * 200,
          easing: 'cubic-bezier(0.15, 0.8, 0.25, 1)',
          fill: 'forwards',
        },
      ).onfinish = () => v.remove();
    }

    scriptCtx.setTimeout(() => {
      rig.close();
      setBeaming(false);
      scriptCtx.setTimeout(() => returnAvatarToDock(520), 200);
    }, 1450);
  });
}

/**
 * Fallback light sweep across viewport for restricted/opaque pages.
 */
function scanSweep(stage: HTMLElement, accentColor: string): void {
  const band = document.createElement('div');
  band.style.cssText = `
    position:absolute;top:0;bottom:0;left:-160px;width:160px;pointer-events:none;
    background:linear-gradient(to right, transparent, ${accentColor}1f, ${accentColor}59, ${accentColor}1f, transparent);
  `;
  stage.appendChild(band);
  band
    .animate(
      [{ transform: 'translateX(0)' }, { transform: `translateX(${window.innerWidth + 320}px)` }],
      { duration: 1200, easing: 'cubic-bezier(0.3, 0, 0.7, 1)', fill: 'forwards' },
    )
    .onfinish = () => band.remove();
}
