import type { EffectContext } from '../types';

/**
 * Sherlock — the case closes: an iris vignette draws the eye inward, then a
 * small evidence chip stamps the offending domain into the corner.
 */
export const sherlockEffect = ({ stage, accentColor, intensity }: EffectContext): void => {
  const strength = 0.5 + intensity * 0.5;

  const iris = document.createElement('div');
  iris.style.cssText = `position:absolute;inset:0;pointer-events:none;background:radial-gradient(circle at center, transparent 34%, ${accentColor}66 100%);`;
  iris.animate(
    [
      { opacity: 0 },
      { opacity: 0.85 * strength, offset: 0.45 },
      { opacity: 0 },
    ],
    { duration: 780, easing: 'ease-in-out', fill: 'forwards' },
  ).onfinish = () => iris.remove();
  stage.appendChild(iris);

  const ring = document.createElement('div');
  ring.style.cssText = 'position:absolute;top:50%;left:50%;width:180px;height:180px;margin:-90px 0 0 -90px;border:2px solid;border-radius:999px;pointer-events:none;';
  ring.style.borderColor = accentColor;
  stage.appendChild(ring);
  ring.animate(
    [
      { transform: 'scale(1.6)', opacity: 0.9 * strength },
      { transform: 'scale(0.55)', opacity: 0 },
    ],
    { duration: 620, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fill: 'forwards' },
  ).onfinish = () => ring.remove();

  const chip = document.createElement('div');
  chip.style.cssText = `position:absolute;right:18px;bottom:18px;padding:4px 10px;background:#0d111a;border:2px solid ${accentColor};box-shadow:3px 3px 0 #000;font-family:monospace;font-size:10px;font-weight:700;letter-spacing:0.08em;color:${accentColor};pointer-events:none;`;
  chip.textContent = '✓ EVIDENCE LOGGED';
  stage.appendChild(chip);
  chip.animate(
    [
      { opacity: 0, transform: 'translateY(8px) rotate(-2deg)' },
      { opacity: 1, transform: 'translateY(0) rotate(-2deg)', offset: 0.25 },
      { opacity: 1, transform: 'translateY(0) rotate(-2deg)', offset: 0.8 },
      { opacity: 0, transform: 'translateY(4px) rotate(-2deg)' },
    ],
    { duration: 1400, easing: 'ease-out', fill: 'forwards' },
  ).onfinish = () => chip.remove();
};
