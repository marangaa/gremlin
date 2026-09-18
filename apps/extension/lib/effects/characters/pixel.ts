import type { EffectContext, SentenceTarget, WordTarget } from '../types';

/** Flight time for Pixel's glide to target. */
const GLIDE_MS = 500;

/** Gravitational acceleration in px/s^2 for satisfying physical drop. */
const GRAVITY = 1600;

/**
 * Pixel — Physical 8-Bit Cat Interventions:
 *
 * Randomly triggers one of two avatar-led physics-driven interventions:
 *
 * 1. "The Cat Table Swipe":
 *    Pixel approaches the distraction text, nudges it with a paw, then swats
 *    the words off the line! The letters plunge with realistic 2D gravity physics,
 *    tumbling through the air, bouncing off the bottom edge of the device viewport,
 *    and settling on the screen floor as physical fallen debris.
 *
 * 2. "Platformer Hop & Shatter":
 *    Pixel treats the words as platforms, hopping across them, then ground-pounds
 *    the sentence. The text fractures into letters and 8-bit voxel shards that
 *    are blasted downward by the stomp impact, crashing into the viewport floor
 *    with bounce and scatter.
 *
 * ZERO TEXT BADGES: No placeholder text, no badges, no stickers. The affected
 * text simply leaves an empty gap in the paragraph (layout space held), while
 * the actual physical letters lie scattered on the bottom of the device viewport.
 */
export const pixelEffect = (ctx: EffectContext): void => {
  let sentence: SentenceTarget | null = null;
  try {
    sentence = ctx.pickSentenceTarget();
  } catch {
    sentence = null;
  }

  if (sentence && sentence.chars.length >= 3) {
    try {
      if (Math.random() < 0.5) {
        runCatTableSwipe(ctx, sentence);
      } else {
        runPlatformerShatter(ctx, sentence);
      }
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
      runPixelWordSwipe(ctx, word);
      return;
    } catch {
      ctx.returnAvatarToDock();
    }
  }

  runPixelZoomiesFallback(ctx);
};

/* =========================================================================
   PHYSICS ENGINE FOR FALLING LETTERS
   ========================================================================= */

interface PhysicsBody {
  el: HTMLElement;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  vAngle: number;
  floorY: number;
  bounces: number;
  settled: boolean;
  active: boolean;
  delayMs: number;
}

/**
 * Returns or creates the persistent floor debris container in the document.
 * Using a fixed, top-level viewport overlay ensures fallen letters stay
 * resting at the bottom of the screen permanently until page refresh (F5).
 */
function getFloorDebrisContainer(): HTMLElement {
  let container = document.getElementById('gremlin-floor-debris');
  if (!container) {
    container = document.createElement('div');
    container.id = 'gremlin-floor-debris';
    container.setAttribute('data-gremlin-abducted', '1');
    container.style.cssText = `
      position:fixed;inset:0;width:100vw;height:100vh;
      pointer-events:none;z-index:2147483645;overflow:hidden;
    `;
    document.body.appendChild(container);
  }
  return container;
}

/**
 * Runs a 60fps numerical integration physics loop for physical letter particles.
 * Simulates gravity, air drag, boundary collisions, restitution bounce, and floor settling.
 */
function runPhysicsSimulation(
  bodies: PhysicsBody[],
  onComplete?: () => void,
): void {
  let prevTime = performance.now();
  let animationId: number;

  const step = (currentTime: number) => {
    const elapsed = Math.min((currentTime - prevTime) / 1000, 0.033);
    prevTime = currentTime;

    let allSettled = true;

    for (const b of bodies) {
      if (!b.active) {
        b.delayMs -= elapsed * 1000;
        if (b.delayMs <= 0) {
          b.active = true;
          b.el.style.opacity = '1';
        } else {
          allSettled = false;
          continue;
        }
      }

      if (b.settled) continue;

      allSettled = false;

      // 1. Gravity acceleration
      b.vy += GRAVITY * elapsed;

      // 2. Air resistance
      b.vx *= 0.994;

      // 3. Position integration
      b.x += b.vx * elapsed;
      b.y += b.vy * elapsed;
      b.angle += b.vAngle * elapsed;

      // 4. Device Viewport Floor Collision
      if (b.y >= b.floorY) {
        b.y = b.floorY;

        if (Math.abs(b.vy) > 45 && b.bounces < 4) {
          // Bouncy rebound with energy loss
          b.vy = -b.vy * (0.34 + Math.random() * 0.12);
          b.vx *= 0.65; // Ground friction
          b.vAngle = (Math.random() - 0.5) * 160;
          b.bounces += 1;
        } else {
          // Settle flat on the device viewport floor
          b.vy = 0;
          b.vx = 0;
          b.vAngle = 0;
          b.settled = true;
          // Natural slight tilt on the floor
          b.angle = Math.max(-20, Math.min(20, (b.angle % 360 + 360) % 360 > 180 ? (b.angle % 360) - 360 : b.angle % 360));
        }
      }

      // 5. Left & right screen wall collisions
      const maxX = window.innerWidth - 18;
      if (b.x < 6) {
        b.x = 6;
        b.vx = -b.vx * 0.4;
      } else if (b.x > maxX) {
        b.x = maxX;
        b.vx = -b.vx * 0.4;
      }

      // 6. Apply hardware-accelerated transform
      b.el.style.transform = `translate3d(${b.x.toFixed(1)}px, ${b.y.toFixed(1)}px, 0) rotate(${b.angle.toFixed(1)}deg)`;
    }

    if (!allSettled) {
      animationId = requestAnimationFrame(step);
    } else if (onComplete) {
      onComplete();
    }
  };

  animationId = requestAnimationFrame(step);
}

/* =========================================================================
   VARIANT 1: THE CAT TABLE SWIPE
   ========================================================================= */

/**
 * Executes the Cat Table Swipe:
 * Pixel inspects the text, taps it, then swats the letters off the desk down
 * to the bottom of the device viewport.
 */
function runCatTableSwipe(ctx: EffectContext, target: SentenceTarget): void {
  const { stage, accentColor, glideAvatarTo, returnAvatarToDock, scriptCtx } = ctx;
  const { anchorNode, anchorStart, anchorLength, element, chars } = target;

  if (!anchorNode.isConnected || anchorNode.data.length < anchorStart + anchorLength) {
    throw new Error('stale anchor');
  }

  // Position Pixel hovering near the right edge of the sentence
  const targetRightX = target.left + target.width - 15;
  const targetTop = target.top;
  const hoverY = Math.max(8, targetTop - 68);

  glideAvatarTo(targetRightX, hoverY, GLIDE_MS, () => {
    if (scriptCtx.isInvalid) {
      returnAvatarToDock();
      return;
    }

    // 1. Cat Paw Nudge 1: A gentle, curious tap
    const paw = document.createElement('div');
    paw.style.cssText = `
      position:absolute;left:${targetRightX - 8}px;top:${targetTop - 6}px;
      width:26px;height:18px;pointer-events:none;z-index:93;
      transform-origin:right center;
    `;
    paw.innerHTML = `
      <svg width="26" height="18" viewBox="0 0 26 18" fill="none">
        <rect x="5" y="6" width="16" height="10" rx="4" fill="#facc15" stroke="#78350f" stroke-width="1.5"/>
        <circle cx="5" cy="4" r="2.5" fill="#fef08a" stroke="#78350f" stroke-width="1"/>
        <circle cx="11" cy="2" r="2.5" fill="#fef08a" stroke="#78350f" stroke-width="1"/>
        <circle cx="17" cy="2" r="2.5" fill="#fef08a" stroke="#78350f" stroke-width="1"/>
        <circle cx="22" cy="4" r="2.5" fill="#fef08a" stroke="#78350f" stroke-width="1"/>
      </svg>
    `;
    stage.appendChild(paw);

    paw.animate(
      [
        { transform: 'translateX(0) rotate(0deg)' },
        { transform: 'translateX(-16px) rotate(-14deg)', offset: 0.5 },
        { transform: 'translateX(0) rotate(0deg)' },
      ],
      { duration: 280, easing: 'ease-out' },
    );

    // Sentence wobbles on the first tap
    element.animate(
      [
        { transform: 'rotate(0deg)' },
        { transform: 'rotate(1.2deg)', offset: 0.5 },
        { transform: 'rotate(0deg)' },
      ],
      { duration: 240, delay: 120 },
    );

    // 2. Pause, then Nudge 2 (firmer second tap)
    scriptCtx.setTimeout(() => {
      paw.animate(
        [
          { transform: 'translateX(0) rotate(0deg)' },
          { transform: 'translateX(-24px) rotate(-20deg)', offset: 0.5 },
          { transform: 'translateX(0) rotate(0deg)' },
        ],
        { duration: 260, easing: 'ease-out' },
      );

      element.animate(
        [
          { transform: 'rotate(0deg)' },
          { transform: 'rotate(2.5deg)', offset: 0.5 },
          { transform: 'rotate(0deg)' },
        ],
        { duration: 220, delay: 110 },
      );
    }, 450);

    // 3. THE BIG SWIPE (Knock the letters off the table!)
    scriptCtx.setTimeout(() => {
      // Rapid swipe motion across the line
      paw.animate(
        [
          { transform: 'translateX(10px) rotate(25deg) scale(1)' },
          { transform: `translateX(-${target.width + 30}px) rotate(-45deg) scale(1.3)`, offset: 0.7 },
          { transform: `translateX(-${target.width + 50}px) rotate(-60deg) scale(0)`, opacity: 0 },
        ],
        { duration: 260, easing: 'cubic-bezier(0.25, 1, 0.5, 1)', fill: 'forwards' },
      ).onfinish = () => paw.remove();

      // Dust puffs at swipe start
      spawnDustPuffs(stage, targetRightX - 15, targetTop, 5);

      // 4. Remove original text from the DOM, holding layout space (Zero Restore)
      let originalText = '';
      try {
        const sliceEnd = anchorStart + anchorLength;
        anchorNode.splitText(sliceEnd);
        const sliceNode = anchorNode.splitText(anchorStart);
        originalText = sliceNode.textContent ?? '';

        // Empty layout-holding span: original characters preserved invisibly
        const blankHole = document.createElement('span');
        blankHole.setAttribute('data-gremlin-abducted', '1');
        blankHole.style.cssText = `display:inline;visibility:hidden;user-select:none;pointer-events:none;`;
        blankHole.textContent = originalText;

        sliceNode.replaceWith(blankHole);
        element.setAttribute('data-gremlin-hole', '1');
      } catch {
        /** DOM mutation safety */
      }

      // 5. Spawn physical letters in the persistent floor debris container
      const floorContainer = getFloorDebrisContainer();
      const bodies: PhysicsBody[] = [];
      const vh = window.innerHeight;

      chars.forEach((c, idx) => {
        const letter = document.createElement('span');
        letter.textContent = c.ch;
        letter.style.cssText = `
          position:absolute;left:0;top:0;
          font-family:inherit;font-size:${Math.max(12, Math.round(c.rect.height))}px;
          font-weight:700;color:${accentColor};
          text-shadow:1px 1px 0 #000, 0 0 6px rgba(250, 204, 21, 0.5);
          pointer-events:none;line-height:1;user-select:none;
          opacity:0;will-change:transform;
        `;
        floorContainer.appendChild(letter);

        // Stagger delay from right to left (swat impact cascades)
        const delayMs = (chars.length - 1 - idx) * 14;

        bodies.push({
          el: letter,
          x: c.rect.left,
          y: c.rect.top,
          vx: -70 - Math.random() * 140, // Swept leftward
          vy: -40 - Math.random() * 70,  // Initial pop off the desk
          angle: 0,
          vAngle: -220 - Math.random() * 450, // Forward tumble
          floorY: vh - 18 - Math.random() * 12, // Floor resting elevation
          bounces: 0,
          settled: false,
          active: false,
          delayMs,
        });
      });

      // 6. Launch physical simulation
      runPhysicsSimulation(bodies);

      // 7. Pixel looks down over the edge, satisfied, then glides back
      scriptCtx.setTimeout(() => {
        returnAvatarToDock(520);
      }, 1800);
    }, 900);
  });
}

/* =========================================================================
   VARIANT 2: PLATFORMER HOP & SHATTER
   ========================================================================= */

/**
 * Executes the Platformer Hop & Shatter:
 * Pixel hops across the words like platforms, then ground-pounds the sentence,
 * blasting the letters and 8-bit voxel shards down to the viewport floor.
 */
function runPlatformerShatter(ctx: EffectContext, target: SentenceTarget): void {
  const { stage, accentColor, glideAvatarTo, returnAvatarToDock, scriptCtx } = ctx;
  const { anchorNode, anchorStart, anchorLength, element, chars } = target;

  if (!anchorNode.isConnected || anchorNode.data.length < anchorStart + anchorLength) {
    throw new Error('stale anchor');
  }

  // Position Pixel at the start of the sentence
  const startX = target.left + 20;
  const targetTop = target.top;
  const hoverY = Math.max(8, targetTop - 68);

  glideAvatarTo(startX, hoverY, GLIDE_MS, () => {
    if (scriptCtx.isInvalid) {
      returnAvatarToDock();
      return;
    }

    spawnDustPuffs(stage, startX, targetTop, 4);

    const hop1X = startX + target.width * 0.32;
    const hop2X = startX + target.width * 0.65;
    const centerApexX = target.left + target.width / 2;

    // Hop 1
    scriptCtx.setTimeout(() => {
      glideAvatarTo(hop1X, hoverY - 14, 220, () => {
        spawnDustPuffs(stage, hop1X, targetTop, 4);
        element.animate(
          [
            { transform: 'translateY(0)' },
            { transform: 'translateY(2px)', offset: 0.5 },
            { transform: 'translateY(0)' },
          ],
          { duration: 160 },
        );
      });
    }, 280);

    // Hop 2
    scriptCtx.setTimeout(() => {
      glideAvatarTo(hop2X, hoverY - 16, 220, () => {
        spawnDustPuffs(stage, hop2X, targetTop, 4);
        element.animate(
          [
            { transform: 'translateY(0)' },
            { transform: 'translateY(3px)', offset: 0.5 },
            { transform: 'translateY(0)' },
          ],
          { duration: 160 },
        );
      });
    }, 580);

    // High Apex Launch & Ground Pound
    scriptCtx.setTimeout(() => {
      glideAvatarTo(centerApexX, hoverY - 45, 240, () => {
        glideAvatarTo(centerApexX, hoverY + 6, 140, () => {
          // 1. Stage impact rumble
          stage.animate(
            [
              { transform: 'translateY(0)' },
              { transform: 'translateY(7px)', offset: 0.2 },
              { transform: 'translateY(-3px)', offset: 0.5 },
              { transform: 'translateY(0)' },
            ],
            { duration: 220, easing: 'ease-in-out' },
          );

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

          // 3. Letters blast downward to the floor with explosive physics
          const floorContainer = getFloorDebrisContainer();
          const bodies: PhysicsBody[] = [];
          const vh = window.innerHeight;

          chars.forEach((c) => {
            const letter = document.createElement('span');
            letter.textContent = c.ch;
            letter.style.cssText = `
              position:absolute;left:0;top:0;
              font-family:inherit;font-size:${Math.max(12, Math.round(c.rect.height))}px;
              font-weight:700;color:${accentColor};
              text-shadow:1px 1px 0 #000, 0 0 6px rgba(250, 204, 21, 0.5);
              pointer-events:none;line-height:1;user-select:none;
              will-change:transform;
            `;
            floorContainer.appendChild(letter);

            // Explosive blast outward and downward from stomp impact point
            const dxFromCenter = c.rect.left - centerApexX;

            bodies.push({
              el: letter,
              x: c.rect.left,
              y: c.rect.top,
              vx: dxFromCenter * 1.8 + (Math.random() - 0.5) * 120, // Blast outward
              vy: 140 + Math.random() * 220,                        // Driven downward
              angle: 0,
              vAngle: (Math.random() - 0.5) * 720,
              floorY: vh - 18 - Math.random() * 12,
              bounces: 0,
              settled: false,
              active: true,
              delayMs: 0,
            });
          });

          // 4. Add shattered 8-bit voxel particles to the physics explosion
          const colors = ['#facc15', '#fef08a', '#fbbf24', '#ffffff', '#1f2937'];
          for (let i = 0; i < 24; i++) {
            const voxel = document.createElement('div');
            const size = 3 + Math.floor(Math.random() * 4);
            const color = colors[Math.floor(Math.random() * colors.length)]!;
            voxel.style.cssText = `
              position:absolute;left:0;top:0;
              width:${size}px;height:${size}px;
              background:${color};border-radius:1px;
              box-shadow:1px 1px 0 rgba(0,0,0,0.4);
              pointer-events:none;will-change:transform;
            `;
            floorContainer.appendChild(voxel);

            bodies.push({
              el: voxel,
              x: centerApexX + (Math.random() - 0.5) * 30,
              y: targetTop + (Math.random() - 0.5) * 10,
              vx: (Math.random() - 0.5) * 320,
              vy: 100 + Math.random() * 260,
              angle: 0,
              vAngle: (Math.random() - 0.5) * 800,
              floorY: vh - 12 - Math.random() * 8,
              bounces: 0,
              settled: false,
              active: true,
              delayMs: 0,
            });
          }

          // Launch physical simulation
          runPhysicsSimulation(bodies);

          // Stand proudly, then return home
          scriptCtx.setTimeout(() => {
            returnAvatarToDock(520);
          }, 1800);
        });
      });
    }, 880);
  });
}

/* =========================================================================
   SINGLE WORD & FALLBACKS
   ========================================================================= */

/**
 * Single-word swat: swats the word to the bottom of the viewport floor.
 */
function runPixelWordSwipe(ctx: EffectContext, word: WordTarget): void {
  const { stage, accentColor, glideAvatarTo, returnAvatarToDock, scriptCtx } = ctx;
  const targetCenterX = word.left + word.width / 2;
  const hoverY = Math.max(8, word.top - 68);

  glideAvatarTo(targetCenterX, hoverY, GLIDE_MS, () => {
    spawnDustPuffs(stage, targetCenterX, word.top, 5);

    // Hide underlying word
    try {
      const hit = document.elementFromPoint(targetCenterX, word.top + word.height / 2);
      if (hit instanceof HTMLElement && hit.tagName !== 'BODY') {
        hit.style.visibility = 'hidden';
      }
    } catch {
      /** Safe fallback */
    }

    // Spawn falling word element into floor container
    const floorContainer = getFloorDebrisContainer();
    const wordEl = document.createElement('span');
    wordEl.textContent = word.text;
    wordEl.style.cssText = `
      position:absolute;left:0;top:0;
      font-family:inherit;font-size:${Math.max(12, Math.round(word.height))}px;
      font-weight:700;color:${accentColor};
      text-shadow:1px 1px 0 #000, 0 0 6px rgba(250, 204, 21, 0.5);
      pointer-events:none;line-height:1;user-select:none;
      will-change:transform;
    `;
    floorContainer.appendChild(wordEl);

    runPhysicsSimulation([
      {
        el: wordEl,
        x: word.left,
        y: word.top,
        vx: -60 - Math.random() * 90,
        vy: -40 - Math.random() * 60,
        angle: 0,
        vAngle: -260 - Math.random() * 320,
        floorY: window.innerHeight - 20,
        bounces: 0,
        settled: false,
        active: true,
        delayMs: 0,
      },
    ]);

    scriptCtx.setTimeout(() => {
      returnAvatarToDock(520);
    }, 1500);
  });
}

/**
 * Full-screen zoomies fallback when no readable text targets are found.
 */
function runPixelZoomiesFallback({ stage, accentColor, returnAvatarToDock, scriptCtx }: EffectContext): void {
  const vh = window.innerHeight;
  const vw = window.innerWidth;

  const cat = document.createElement('div');
  cat.style.cssText = `
    position:absolute;top:${vh - 48}px;left:-40px;width:32px;height:24px;
    background:${accentColor};border-radius:4px;box-shadow:2px 2px 0 #000;
    pointer-events:none;z-index:92;
  `;
  stage.appendChild(cat);

  cat.animate(
    [
      { transform: 'translateX(0) translateY(0)' },
      { transform: `translateX(${vw * 0.3}px) translateY(-20px)`, offset: 0.3 },
      { transform: `translateX(${vw * 0.6}px) translateY(0)`, offset: 0.6 },
      { transform: `translateX(${vw + 80}px) translateY(-15px)` },
    ],
    { duration: 1100, easing: 'ease-in-out', fill: 'forwards' },
  ).onfinish = () => cat.remove();

  scriptCtx.setTimeout(() => returnAvatarToDock(480), 800);
}

/**
 * Spawns retro 8-bit dust puffs at coordinates.
 */
function spawnDustPuffs(stage: HTMLElement, x: number, y: number, count: number): void {
  for (let i = 0; i < count; i++) {
    const puff = document.createElement('div');
    const size = 3 + Math.random() * 4;
    puff.style.cssText = `
      position:absolute;left:${x + (Math.random() - 0.5) * 20}px;top:${y + (Math.random() - 0.5) * 8}px;
      width:${size}px;height:${size}px;
      background:#9ca3af;border-radius:1px;pointer-events:none;z-index:92;
    `;
    stage.appendChild(puff);
    puff.animate(
      [
        { transform: 'translate(0, 0) scale(0.8)', opacity: 0.8 },
        {
          transform: `translate(${(Math.random() - 0.5) * 36}px, ${-12 - Math.random() * 12}px) scale(1.5)`,
          opacity: 0,
        },
      ],
      { duration: 280 + Math.random() * 120, easing: 'ease-out', fill: 'forwards' },
    ).onfinish = () => puff.remove();
  }
}
