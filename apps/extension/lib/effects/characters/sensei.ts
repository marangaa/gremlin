import type { EffectContext } from '../types';

/**
 * Sensei — a breathing ring expands from the companion, the page exhales
 * (brief desaturation), and balance returns.
 */
export const senseiEffect = ({ stage, accentColor, intensity }: EffectContext): void => {
  const strength = 0.5 + intensity * 0.5;

  const breathe = document.createElement('div');
  breathe.style.cssText = 'position:absolute;inset:0;pointer-events:none;backdrop-filter:saturate(0.35);';
  stage.appendChild(breathe);
  breathe.animate(
    [
      { opacity: 0 },
      { opacity: strength, offset: 0.4 },
      { opacity: 0 },
    ],
    { duration: 1100, easing: 'ease-in-out', fill: 'forwards' },
  ).onfinish = () => breathe.remove();

  for (let i = 0; i < 3; i++) {
    const ripple = document.createElement('div');
    const size = 120;
    ripple.style.cssText = `position:absolute;top:${window.innerHeight / 2 - size / 2}px;left:${window.innerWidth / 2 - size / 2}px;width:${size}px;height:${size}px;border:2px solid ${accentColor};border-radius:999px;pointer-events:none;`;
    stage.appendChild(ripple);
    ripple.animate(
      [
        { transform: 'scale(0.3)', opacity: 0.7 * strength },
        { transform: 'scale(3.2)', opacity: 0 },
      ],
      { duration: 950, delay: i * 220, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fill: 'forwards' },
    ).onfinish = () => ripple.remove();
  }

  const mantra = document.createElement('div');
  mantra.style.cssText = `position:absolute;top:16vh;left:50%;transform:translateX(-50%);font-family:monospace;font-size:12px;font-weight:700;letter-spacing:0.3em;color:${accentColor};pointer-events:none;`;
  mantra.textContent = 'BREATHE';
  stage.appendChild(mantra);
  mantra.animate(
    [
      { opacity: 0, letterSpacing: '0.6em' },
      { opacity: 0.95 * strength, letterSpacing: '0.3em', offset: 0.35 },
      { opacity: 0, letterSpacing: '0.24em' },
    ],
    { duration: 1300, easing: 'ease-in-out', fill: 'forwards' },
  ).onfinish = () => mantra.remove();
};
