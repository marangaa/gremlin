import type { EffectContext } from '../types';

const rand = (min: number, max: number) => min + Math.random() * (max - min);

/**
 * Waifu — soft sakura pulse: pink edge vignette breathing twice, with pixel
 * petals drifting down past the screen corners.
 */
export const waifuEffect = ({ stage, accentColor, secondaryColor, intensity }: EffectContext): void => {
  const strength = 0.5 + intensity * 0.5;

  const vignette = document.createElement('div');
  vignette.style.cssText = `position:absolute;inset:0;pointer-events:none;background:radial-gradient(ellipse at center, transparent 52%, ${accentColor}55 100%);`;
  vignette.animate(
    [
      { opacity: 0 },
      { opacity: 0.8 * strength, offset: 0.35 },
      { opacity: 0.25 * strength, offset: 0.65 },
      { opacity: 0.7 * strength },
      { opacity: 0 },
    ],
    { duration: 1100, easing: 'ease-in-out', fill: 'forwards' },
  ).onfinish = () => vignette.remove();
  stage.appendChild(vignette);

  const petalCount = Math.round(10 + intensity * 10);
  for (let i = 0; i < petalCount; i++) {
    const petal = document.createElement('div');
    const size = rand(4, 7);
    const startX = rand(0, window.innerWidth);
    petal.style.cssText = `position:absolute;top:-10px;left:${startX}px;width:${size}px;height:${size * 0.72}px;background:${Math.random() > 0.4 ? accentColor : secondaryColor};border-radius:${size}px ${size}px 0 ${size}px;pointer-events:none;`;
    stage.appendChild(petal);

    const fall = petal.animate(
      [
        { transform: 'translateY(0) rotate(0deg)', opacity: 0 },
        { opacity: 0.95, offset: 0.12 },
        { transform: `translateY(${window.innerHeight + 20}px) translateX(${rand(-70, 70)}px) rotate(${rand(240, 520)}deg)`, opacity: 0 },
      ],
      { duration: rand(1100, 2000), delay: rand(0, 350), easing: 'ease-in' },
    );
    fall.onfinish = () => petal.remove();
  }
};
