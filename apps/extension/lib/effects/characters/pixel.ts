import type { EffectContext } from '../types';

const rand = (min: number, max: number) => min + Math.random() * (max - min);

const U = 4; // px per pixel-unit

// Mini cat drawn with box-shadow pixels (~28x20px), facing right.
const CAT_CELLS: Array<[number, number]> = [
  [0, 0], [3, 0], [5, 0],
  [0, 1], [1, 1], [2, 1], [3, 1], [4, 1],
  [6, 1],
  [0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2],
  [0, 3], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3],
  [1, 4], [4, 4],
];
const CAT_SHADOWS = [
  ...CAT_CELLS.map(([x, y]) => `${x * U}px ${y * U}px 0 0 #16161a`),
  `${5 * U}px ${1 * U}px 0 0 #facc15`, // eye
].join(', ');

/**
 * Pixel — ZOOMIES: a box-shadow pixel cat dashes along the bottom edge with
 * bouncy hops, kicking up dust puffs. High chaos earns a second pass back.
 */
export const pixelEffect = ({ stage, accentColor, intensity }: EffectContext): void => {
  const strength = 0.5 + intensity * 0.5;
  const shadows = CAT_SHADOWS.replace('#facc15', accentColor);

  const zoomie = (fromLeft: boolean, duration: number, hop: number) => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const cat = document.createElement('div');
    cat.style.cssText = `position:absolute;top:${vh - 52}px;left:${fromLeft ? '-40px' : `${vw + 12}px`};width:${U}px;height:${U}px;background:transparent;box-shadow:${shadows};filter:drop-shadow(1px 1px 0 rgba(255,255,255,0.35));pointer-events:none;z-index:3;will-change:transform;`;
    stage.appendChild(cat);

    // Bouncy hop path: land / apex / land / apex ...
    const drift = vw + 140;
    const dir = fromLeft ? 1 : -1;
    const steps = 8;
    const frames: Keyframe[] = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const y = i % 2 === 1 ? -hop : 0;
      frames.push({ transform: `translate(${dir * drift * t}px, ${y}px)`, offset: t });
    }
    cat.animate(frames, { duration, easing: 'ease-in-out', fill: 'forwards' }).onfinish = () =>
      cat.remove();

    // Dust Puffs Kicked Up Along The Path
    const puffs = Math.round(5 + intensity * 2);
    for (let i = 0; i < puffs; i++) {
      window.setTimeout(() => {
        const puff = document.createElement('div');
        const size = rand(5, 9);
        const progress = (i + 1) / (puffs + 1);
        const x = fromLeft ? -40 + drift * progress : vw + 12 - drift * progress;
        puff.style.cssText = `position:absolute;left:${x}px;top:${vh - 44}px;width:${size}px;height:${size}px;background:#9ca3af;border-radius:1px;opacity:${(0.55 * strength).toFixed(2)};pointer-events:none;`;
        stage.appendChild(puff);
        puff.animate(
          [
            { transform: 'translateY(0) scale(1)', opacity: 0.6 },
            { transform: 'translateY(-10px) scale(1.7)', opacity: 0 },
          ],
          { duration: rand(380, 520), easing: 'ease-out', fill: 'forwards' },
        ).onfinish = () => puff.remove();
      }, (duration * (i + 1)) / (puffs + 1));
    }
  };

  const duration = Math.round(1150 - intensity * 350);
  const firstFromLeft = Math.random() < 0.5;
  zoomie(firstFromLeft, duration, 16 + intensity * 10);

  if (intensity > 0.6) {
    window.setTimeout(
      () => zoomie(!firstFromLeft, Math.round(duration * 0.7), 22 + intensity * 10),
      duration + 180,
    );
  }
};
