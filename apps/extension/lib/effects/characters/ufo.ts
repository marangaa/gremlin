import type { EffectContext, WordTarget } from '../types';

const U = 4; // px per pixel-unit

// Saucer hull drawn with box-shadow pixels (~40x16px). Dome color injected.
const HULL_CELLS: Array<[number, number, string]> = [
  // Glass dome
  [3, 0, 'dome'],
  [4, 0, '#7c3aed'], // alien head inside dome
  [5, 0, '#7c3aed'],
  [6, 0, 'dome'],
  // Hull top
  [1, 1, '#94a3b8'], [2, 1, '#94a3b8'], [3, 1, '#94a3b8'], [4, 1, '#94a3b8'],
  [5, 1, '#94a3b8'], [6, 1, '#94a3b8'], [7, 1, '#94a3b8'], [8, 1, '#94a3b8'],
  // Hull mid
  [0, 2, '#94a3b8'], [2, 2, '#94a3b8'], [4, 2, '#94a3b8'], [6, 2, '#94a3b8'],
  [8, 2, '#94a3b8'], [9, 2, '#94a3b8'],
  // Underside
  [2, 3, '#475569'], [3, 3, '#475569'], [4, 3, '#475569'], [5, 3, '#475569'],
  [6, 3, '#475569'], [7, 3, '#475569'],
];

/** Builds the saucer wrap: outer = descent/retract transforms, inner = hover bob. */
function buildSaucer(stage: HTMLDivElement, accentColor: string, domeColor: string): { wrap: HTMLDivElement } {
  const shadows = HULL_CELLS.map(([x, y, c]) => `${x * U}px ${y * U}px 0 0 ${c === 'dome' ? domeColor : c}`).join(', ');

  const wrap = document.createElement('div');
  wrap.style.cssText = 'position:absolute;width:1px;height:1px;pointer-events:none;z-index:4;';

  const bob = document.createElement('div');
  bob.style.cssText = 'position:absolute;left:0;top:0;width:1px;height:1px;';
  wrap.appendChild(bob);

  const body = document.createElement('div');
  body.style.cssText = `position:absolute;left:0;top:0;width:${U}px;height:${U}px;background:transparent;box-shadow:${shadows};filter:drop-shadow(0 3px 4px rgba(0,0,0,0.35));`;
  bob.appendChild(body);

  for (let i = 0; i < 4; i++) {
    const light = document.createElement('div');
    light.style.cssText = `position:absolute;left:${(1 + i * 2) * U}px;top:${2 * U}px;width:${U}px;height:${U}px;background:${accentColor};pointer-events:none;`;
    bob.appendChild(light);
    light.animate(
      [
        { opacity: 1 },
        { opacity: 0.12 },
        { opacity: 1 },
      ],
      { duration: 520, delay: i * 130, easing: 'steps(2)', iterations: Infinity },
    );
  }

  bob.animate(
    [
      { transform: 'translateY(-4px)' },
      { transform: 'translateY(3px)' },
    ],
    { duration: 1100, easing: 'ease-in-out', direction: 'alternate', iterations: Infinity },
  );

  stage.appendChild(wrap);
  return { wrap };
}

/** Fallback when no word can be targeted: a quick flyby across the top. */
function flyby(stage: HTMLDivElement, accentColor: string, domeColor: string): void {
  const { wrap } = buildSaucer(stage, accentColor, domeColor);
  wrap.style.left = '-80px';
  wrap.style.top = `${window.innerHeight * 0.14}px`;
  wrap
    .animate(
      [{ transform: 'translateX(0)' }, { transform: `translateX(${window.innerWidth + 260}px)` }],
      { duration: 1300, easing: 'linear', fill: 'forwards' },
    )
    .onfinish = () => wrap.remove();
}

/**
 * Zeta — THE ABDUCTION: a saucer descends above a random word, a beam locks
 * on, the word rises into the hull while its source dims, then the saucer
 * warps away.
 */
export const ufoEffect = ({
  stage,
  accentColor,
  secondaryColor,
  pickWordTarget,
}: EffectContext): void => {
  let word: WordTarget | null = null;
  try {
    word = pickWordTarget();
  } catch {
    word = null;
  }
  if (!word || word.width < 8) {
    flyby(stage, accentColor, secondaryColor);
    return;
  }
  abduct(stage, accentColor, secondaryColor, word);
};

function abduct(
  stage: HTMLDivElement,
  accentColor: string,
  domeColor: string,
  word: WordTarget,
): void {
  const cx = word.left + word.width / 2;
  const saucerW = 10 * U;
  const saucerH = 4 * U;
  const hoverTop = Math.max(8, word.top - 90);

  // 1. Descend to hover above the word.
  const { wrap } = buildSaucer(stage, accentColor, domeColor);
  wrap.style.left = `${cx - saucerW / 2}px`;
  wrap.style.top = `${hoverTop}px`;
  wrap.animate(
    [{ transform: `translateY(${-(hoverTop + 140)}px)` }, { transform: 'translateY(0)' }],
    { duration: 650, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'forwards' },
  );

  // 2. Beam cone from saucer belly down to exactly cover the word rect.
  const beamLeft = word.left - (cx - saucerW / 2);
  const beamHeight = Math.max(10, word.top + word.height * 0.75 - (hoverTop + saucerH));
  const beam = document.createElement('div');
  beam.style.cssText = `position:absolute;left:${beamLeft}px;top:${saucerH - 2}px;width:${word.width}px;height:${beamHeight}px;background:linear-gradient(to bottom, ${accentColor}e6, ${accentColor}33);clip-path:polygon(calc(50% - 9px) 0, calc(50% + 9px) 0, 100% 100%, 0% 100%);opacity:0;transform-origin:top center;pointer-events:none;`;
  wrap.appendChild(beam);
  beam.animate(
    [
      { opacity: 0, transform: 'scaleY(0.55)' },
      { opacity: 0.95, transform: 'scaleY(1)' },
    ],
    { duration: 200, delay: 650, easing: 'ease-out', fill: 'forwards' },
  );

  // 3. Clone of the word lifts into the saucer (difference blend = any bg).
  const ghost = document.createElement('span');
  ghost.textContent = word.text;
  ghost.style.cssText = `position:absolute;left:${word.left}px;top:${word.top}px;margin:0;font-family:sans-serif;font-size:${Math.max(10, Math.round(word.height * 0.9))}px;font-weight:700;line-height:1;white-space:nowrap;color:#ffffff;mix-blend-mode:difference;pointer-events:none;z-index:5;`;
  stage.appendChild(ghost);
  const liftDy = hoverTop + saucerH - word.top;
  ghost.animate(
    [
      { transform: 'translateY(0) rotate(0deg) scale(1)', opacity: 1 },
      {
        transform: `translateY(${liftDy * 0.35}px) rotate(5deg) scale(0.8)`,
        opacity: 0.45,
        offset: 0.35,
      },
      {
        transform: `translateY(${liftDy * 0.7}px) rotate(-7deg) scale(0.5)`,
        opacity: 1,
        offset: 0.7,
      },
      { transform: `translateY(${liftDy}px) rotate(0deg) scale(0.25)`, opacity: 0.9 },
    ],
    { duration: 700, delay: 850, easing: 'ease-in', fill: 'forwards' },
  ).onfinish = () => ghost.remove();

  // 4. Dim the source element during flight, restore shortly after.
  window.setTimeout(() => {
    let sourceEl: HTMLElement | null = null;
    try {
      const hit = document.elementFromPoint(cx, word.top + word.height / 2);
      if (hit instanceof HTMLElement) sourceEl = hit;
    } catch {
      sourceEl = null;
    }
    if (!sourceEl) return;
    const prior = sourceEl.style.opacity;
    sourceEl.style.opacity = '0.15';
    window.setTimeout(() => {
      sourceEl!.style.opacity = prior;
    }, 1600);
  }, 900);

  // 5. Warp retract: fast vertical escape + violet warp streak.
  wrap.animate(
    [{ transform: 'translateY(0)' }, { transform: `translateY(${-(hoverTop + 320)}px)` }],
    { duration: 360, delay: 1600, easing: 'cubic-bezier(0.5, 0, 0.75, 0)', fill: 'forwards' },
  ).onfinish = () => wrap.remove();

  beam.animate([{ opacity: 0.95 }, { opacity: 0 }], {
    duration: 280,
    delay: 1600,
    easing: 'ease-out',
    fill: 'forwards',
  }).onfinish = () => beam.remove();

  const streak = document.createElement('div');
  streak.style.cssText = `position:absolute;left:${cx - 2}px;top:-20px;width:3px;height:${hoverTop + saucerH + 20}px;background:linear-gradient(to bottom, transparent, ${accentColor});opacity:0;transform-origin:bottom center;pointer-events:none;`;
  stage.appendChild(streak);
  streak.animate(
    [
      { opacity: 0, transform: 'scaleY(0.2)' },
      { opacity: 0.9, transform: 'scaleY(1)', offset: 0.4 },
      { opacity: 0, transform: 'scaleY(1)' },
    ],
    { duration: 300, delay: 1620, easing: 'ease-out', fill: 'forwards' },
  ).onfinish = () => streak.remove();
}
