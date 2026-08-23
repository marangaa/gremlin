import type { EffectContext } from '../types';

const rand = (min: number, max: number) => min + Math.random() * (max - min);

const GLYPHS = '01<>{}[]#$%&*/\\;:=ABCDEF';

/**
 * Byte — terminal intrusion: thin code-rain columns sweep down the page, a
 * scanline band flickers, then a terse mono log line types itself bottom-left.
 */
export const byteEffect = ({ stage, accentColor, intensity }: EffectContext): void => {
  const strength = 0.5 + intensity * 0.5;
  const columns = Math.round(3 + intensity * 2);

  // Code Rain Columns
  for (let i = 0; i < columns; i++) {
    const col = document.createElement('pre');
    let text = '';
    const rows = 8 + Math.floor(Math.random() * 8);
    for (let r = 0; r < rows; r++) {
      text += GLYPHS[Math.floor(Math.random() * GLYPHS.length)]! + '\n';
    }
    col.textContent = text;
    col.style.cssText = `position:absolute;top:-25%;left:${rand(4, 92)}%;margin:0;font-family:monospace;font-size:${rand(11, 15)}px;line-height:1.1;color:${accentColor};text-shadow:0 0 6px ${accentColor};opacity:${(0.55 * strength).toFixed(2)};pointer-events:none;`;
    stage.appendChild(col);
    col.animate(
      [
        { transform: 'translateY(-40px)' },
        { transform: `translateY(${window.innerHeight * 1.4}px)` },
      ],
      { duration: rand(700, 1000), delay: i * 90, easing: 'linear', fill: 'forwards' },
    ).onfinish = () => col.remove();
  }

  // Scanline Band Flicker
  const scan = document.createElement('div');
  scan.style.cssText =
    'position:absolute;inset:0;background:repeating-linear-gradient(0deg, rgba(0,0,0,0.28) 0px, rgba(0,0,0,0.28) 1px, transparent 1px, transparent 3px);mix-blend-mode:multiply;pointer-events:none;';
  stage.appendChild(scan);
  scan.animate(
    [
      { opacity: 0 },
      { opacity: strength, offset: 0.25 },
      { opacity: 0.2 * strength, offset: 0.55 },
      { opacity: strength, offset: 0.75 },
      { opacity: 0 },
    ],
    { duration: 420, easing: 'steps(5)', fill: 'forwards' },
  ).onfinish = () => scan.remove();

  // Typed Log Line
  const log = document.createElement('div');
  log.textContent = '> distraction terminated';
  log.style.cssText = `position:absolute;left:18px;bottom:16px;font-family:monospace;font-size:13px;font-weight:700;letter-spacing:0.06em;color:${accentColor};text-shadow:0 0 8px ${accentColor};pointer-events:none;`;
  stage.appendChild(log);
  log.animate(
    [
      { clipPath: 'inset(0 100% 0 0)', opacity: 1, easing: 'steps(14, end)' },
      { clipPath: 'inset(0 0% 0 0)', opacity: 1, offset: 0.55 },
      { clipPath: 'inset(0 0% 0 0)', opacity: 1, offset: 0.85 },
      { clipPath: 'inset(0 0% 0 0)', opacity: 0 },
    ],
    { duration: 800, delay: 520, fill: 'forwards' },
  ).onfinish = () => log.remove();
};
