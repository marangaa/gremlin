import type { EffectContext } from '../types';

const rand = (min: number, max: number) => min + Math.random() * (max - min);

/**
 * Kuro — "caught in 4K": a horizontal band of the page glitches (invert +
 * hue-rip), RGB ghost bands tear across it, then a camera flash pops.
 */
export const kuroEffect = ({ stage, accentColor, intensity }: EffectContext): void => {
  const strength = 0.5 + intensity * 0.5;
  const vw = window.innerWidth;

  const bandY = rand(0.12, 0.72) * window.innerHeight;
  const bandH = rand(34, 74);

  const tear = document.createElement('div');
  tear.style.cssText = `position:absolute;left:-6px;top:${bandY}px;width:${vw + 12}px;height:${bandH}px;pointer-events:none;backdrop-filter:invert(1) hue-rotate(90deg);`;
  stage.appendChild(tear);
  tear.animate(
    [
      { transform: 'translateX(0)', opacity: 0 },
      { opacity: 1, offset: 0.15 },
      { transform: 'translateX(-10px)', offset: 0.45 },
      { transform: 'translateX(8px)', offset: 0.7 },
      { opacity: 0 },
    ],
    { duration: rand(260, 380), easing: 'steps(6)', fill: 'forwards' },
  ).onfinish = () => tear.remove();

  for (const [color, dx] of [
    ['rgba(255,0,80,0.35)', -4],
    ['rgba(0,229,255,0.35)', 4],
  ] as const) {
    const ghost = document.createElement('div');
    ghost.style.cssText = `position:absolute;left:0;top:0;right:0;bottom:0;pointer-events:none;background:${color};mix-blend-mode:screen;`;
    stage.appendChild(ghost);
    ghost.animate(
      [
        { opacity: 0, transform: `translateX(0)` },
        { opacity: strength, transform: `translateX(${dx}px)`, offset: 0.3 },
        { opacity: 0, transform: `translateX(${-dx}px)` },
      ],
      { duration: 220, delay: 60, easing: 'ease-out', fill: 'forwards' },
    ).onfinish = () => ghost.remove();
  }

  const flash = document.createElement('div');
  flash.style.cssText = 'position:absolute;inset:0;background:#ffffff;pointer-events:none;';
  stage.appendChild(flash);
  flash.animate(
    [
      { opacity: 0 },
      { opacity: 0.3 + intensity * 0.25, offset: 0.2 },
      { opacity: 0 },
    ],
    { duration: 300, easing: 'ease-out', fill: 'forwards' },
  ).onfinish = () => flash.remove();

  const caption = document.createElement('div');
  caption.style.cssText = `position:absolute;left:50%;bottom:14vh;transform:translateX(-50%) rotate(-2deg);padding:3px 12px;background:#000;border:2px solid ${accentColor};box-shadow:3px 3px 0 #000;font-family:monospace;font-size:11px;font-weight:800;letter-spacing:0.14em;color:${accentColor};pointer-events:none;`;
  caption.textContent = 'CAUGHT IN 4K';
  stage.appendChild(caption);
  caption.animate(
    [
      { opacity: 0, transform: 'translateX(-50%) rotate(-2deg) scale(1.4)' },
      { opacity: 1, transform: 'translateX(-50%) rotate(-2deg) scale(1)', offset: 0.18 },
      { opacity: 1, offset: 0.75 },
      { opacity: 0, transform: 'translateX(-50%) rotate(-2deg) scale(0.94)' },
    ],
    { duration: 1200, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fill: 'forwards' },
  ).onfinish = () => caption.remove();
};
