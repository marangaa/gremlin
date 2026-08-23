import type { EffectContext } from '../types';

const rand = (min: number, max: number) => min + Math.random() * (max - min);

/**
 * Sarge — drill-sergeant burst: screen-edge orange flash, a short vertical
 * jolt, and a hazard-stripe sliver that drops in from the top and retracts.
 */
export const sargeEffect = ({ stage, accentColor, intensity }: EffectContext): void => {
  const strength = 0.5 + intensity * 0.5;

  const flash = document.createElement('div');
  flash.style.cssText = 'position:absolute;inset:0;pointer-events:none;';
  flash.style.boxShadow = `inset 0 0 140px 30px ${accentColor}`;
  flash.animate(
    [
      { opacity: 0 },
      { opacity: 0.55 * strength, offset: 0.25 },
      { opacity: 0 },
    ],
    { duration: 420, easing: 'ease-out', fill: 'forwards' },
  ).onfinish = () => flash.remove();
  stage.appendChild(flash);

  stage.animate(
    [
      { transform: 'translateY(0)' },
      { transform: 'translateY(7px)', offset: 0.3 },
      { transform: 'translateY(-4px)', offset: 0.6 },
      { transform: 'translateY(0)' },
    ],
    { duration: 260, easing: 'ease-in-out' },
  );

  const sliver = document.createElement('div');
  sliver.style.cssText = `position:absolute;top:0;left:0;right:0;height:12px;background:repeating-linear-gradient(-45deg, ${accentColor}, ${accentColor} 12px, #000000 12px, #000000 24px);`;
  stage.appendChild(sliver);
  sliver.animate(
    [
      { transform: 'translateY(-100%)' },
      { transform: 'translateY(0)', offset: 0.35 },
      { transform: 'translateY(0)', offset: 0.75 },
      { transform: 'translateY(-100%)' },
    ],
    { duration: 900, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' },
  ).onfinish = () => sliver.remove();
};
