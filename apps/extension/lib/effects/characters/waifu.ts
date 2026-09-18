import type { EffectContext, SentenceTarget, WordTarget } from '../types';
import { sprintStorage } from '@/lib/storage';

/** Flight time for Momo's graceful flutter to the target. */
const FLUTTER_MS = 640;

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Momo (Waifu) — TSUNDERE STICKY-NOTE PIN, avatar-led.
 *
 * Momo flutters down to the distraction text near the cursor, drops a
 * few floating sakura petals, and pins a physical illustrated pastel sticky note
 * directly over the distraction text:
 *
 *   ┌───────────────────────────────────┐
 *   │         [==== washi tape ====]    │
 *   │  📌 NOTE FOR BAKA:                │
 *   │  Stop reading this distraction!   │
 *   │  Finish your sprint first! (≧ロ≦) │
 *   │                           — Momo ♡│
 *   └───────────────────────────────────┘
 *
 * PERMANENT INTERVENTION — ZERO RESTORE:
 * The sticky note stays pinned in the webpage layout, physically concealing
 * the distraction until refresh.
 *
 * @param ctx Effect context with motion hooks and target pickers.
 */
export const waifuEffect = (ctx: EffectContext): void => {
  const { accentColor, stage } = ctx;

  let sentence: SentenceTarget | null = null;
  try {
    sentence = ctx.pickSentenceTarget();
  } catch {
    sentence = null;
  }

  if (sentence && sentence.chars.length >= 5) {
    try {
      runMomoStickyPin(ctx, sentence);
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
      runMomoWordPin(ctx, word);
      return;
    } catch {
      ctx.returnAvatarToDock();
    }
  }

  runMomoSakuraShower(ctx);
};

/**
 * Executes Momo's sticky-note pin over a targeted sentence.
 */
function runMomoStickyPin(ctx: EffectContext, target: SentenceTarget): void {
  const { stage, accentColor, secondaryColor, glideAvatarTo, returnAvatarToDock, scriptCtx } = ctx;
  const { anchorNode, anchorStart, anchorLength, element } = target;

  if (!anchorNode.isConnected || anchorNode.data.length < anchorStart + anchorLength) {
    throw new Error('stale anchor');
  }

  const targetCenterX = target.left + target.width / 2;
  const targetTop = target.top;
  const hoverY = Math.max(8, targetTop - 85);

  // Fetch active goal for personalized note
  let noteBody = 'Stop reading this distraction! Finish your sprint first! (≧ロ≦)';
  void sprintStorage.getValue().then((sprint) => {
    if (sprint?.goal?.trim()) {
      noteBody = `Stop reading this! Get back to: <span style="color:#db2777;font-weight:700;">${escapeHtml(sprint.goal.trim())}</span>! (≧ロ≦)`;
    }
  }).catch(() => {});

  glideAvatarTo(targetCenterX + 35, hoverY, FLUTTER_MS, () => {
    if (scriptCtx.isInvalid) {
      returnAvatarToDock();
      return;
    }

    // 1. Soft sakura vignette pulse
    const vignette = document.createElement('div');
    vignette.style.cssText = `position:absolute;inset:0;pointer-events:none;background:radial-gradient(ellipse at center, transparent 55%, ${accentColor}44 100%);`;
    stage.appendChild(vignette);
    vignette.animate(
      [
        { opacity: 0 },
        { opacity: 0.8, offset: 0.35 },
        { opacity: 0 },
      ],
      { duration: 950, fill: 'forwards' },
    ).onfinish = () => vignette.remove();

    // 2. Floating hearts / petals burst around the companion
    for (let i = 0; i < 6; i++) {
      const petal = document.createElement('div');
      petal.style.cssText = `position:absolute;left:${targetCenterX + 20 + Math.random() * 40}px;top:${hoverY + 20}px;color:${i % 2 === 0 ? accentColor : '#ec4899'};font-size:${12 + Math.random() * 8}px;pointer-events:none;z-index:93;`;
      petal.textContent = i % 2 === 0 ? '🌸' : '♥';
      stage.appendChild(petal);
      petal.animate(
        [
          { transform: 'translate(0, 0) scale(0.6)', opacity: 1 },
          {
            transform: `translate(${(Math.random() - 0.5) * 80}px, ${-30 - Math.random() * 40}px) scale(1.1) rotate(${Math.random() * 40}deg)`,
            opacity: 0.9,
            offset: 0.5,
          },
          {
            transform: `translate(${(Math.random() - 0.5) * 120}px, ${20 + Math.random() * 40}px) scale(0.8)`,
            opacity: 0,
          },
        ],
        { duration: 1100, delay: i * 80, easing: 'ease-out', fill: 'forwards' },
      ).onfinish = () => petal.remove();
    }

    // 3. Pin the physical sticky note directly into the DOM (Permanent until refresh)
    try {
      const sliceEnd = anchorStart + anchorLength;
      anchorNode.splitText(sliceEnd);
      const sliceNode = anchorNode.splitText(anchorStart);

      const noteWrap = document.createElement('span');
      noteWrap.setAttribute('data-gremlin-abducted', '1');
      noteWrap.style.cssText = `display:inline-block;margin:6px 0;vertical-align:middle;`;

      const sticky = document.createElement('div');
      sticky.style.cssText = `display:inline-block;max-width:280px;background:#fef08a;color:#1c1917;padding:10px 14px 12px 14px;border-radius:2px;box-shadow:2px 6px 18px rgba(0,0,0,0.18),0 1px 3px rgba(0,0,0,0.12);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;line-height:1.35;`;

      sticky.innerHTML = `
        <div style="background:rgba(236,72,153,0.75);width:42px;height:11px;margin:-14px auto 6px auto;border-left:2px dashed rgba(255,255,255,0.5);border-right:2px dashed rgba(255,255,255,0.5);box-shadow:0 1px 3px rgba(0,0,0,0.15);"></div>
        <div style="font-family:monospace;font-size:9.5px;font-weight:800;letter-spacing:0.08em;color:#db2777;margin-bottom:3px;">📌 FOCUS REMINDER:</div>
        <div style="font-size:11.5px;font-weight:600;color:#292524;margin-bottom:4px;">${noteBody}</div>
        <div style="font-size:10px;font-weight:700;color:#ec4899;text-align:right;">♡ Momo</div>
      `;

      noteWrap.appendChild(sticky);
      sliceNode.replaceWith(noteWrap);
      element.setAttribute('data-gremlin-hole', '1');

      // Note drop-in pop animation (flat, no rotation)
      sticky.animate(
        [
          { transform: 'scale(0.5)', opacity: 0 },
          { transform: 'scale(1.05)', opacity: 1, offset: 0.6 },
          { transform: 'scale(1)', opacity: 1 },
        ],
        { duration: 280, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)', fill: 'forwards' },
      );
    } catch {
      /** DOM mutation safety */
    }

    // 4. Proud pause, then flutter home
    scriptCtx.setTimeout(() => {
      returnAvatarToDock(620);
    }, 1700);
  });
}

/**
 * Word-level sticky note fallback.
 */
function runMomoWordPin(ctx: EffectContext, word: WordTarget): void {
  const { stage, accentColor, glideAvatarTo, returnAvatarToDock, scriptCtx } = ctx;
  const targetCenterX = word.left + word.width / 2;
  const hoverY = Math.max(8, word.top - 80);

  let wordText = 'FOCUS ON YOUR GOAL ♡';
  void sprintStorage.getValue().then((sprint) => {
    if (sprint?.goal?.trim()) {
      const shortGoal = sprint.goal.trim().slice(0, 16);
      wordText = `FOCUS ON ${escapeHtml(shortGoal).toUpperCase()}! ♡`;
    }
  }).catch(() => {});

  glideAvatarTo(targetCenterX + 30, hoverY, FLUTTER_MS, () => {
    const note = document.createElement('div');
    note.style.cssText = `position:absolute;left:${word.left - 10}px;top:${word.top - 20}px;background:#fef08a;color:#1c1917;padding:6px 10px;border-radius:2px;box-shadow:2px 4px 12px rgba(0,0,0,0.18);font-family:monospace;font-size:10px;font-weight:700;z-index:92;pointer-events:none;`;
    note.innerHTML = `<span style="color:#db2777;">📌</span> ${wordText}`;
    stage.appendChild(note);

    note.animate(
      [
        { transform: 'scale(0.4)', opacity: 0 },
        { transform: 'scale(1)', opacity: 1 },
      ],
      { duration: 240, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)', fill: 'forwards' },
    );

    // Hide underlying word
    scriptCtx.setTimeout(() => {
      try {
        const hit = document.elementFromPoint(targetCenterX, word.top + word.height / 2);
        if (hit instanceof HTMLElement) hit.style.opacity = '0.05';
      } catch {
        /** Safe fallback */
      }
    }, 200);

    scriptCtx.setTimeout(() => {
      returnAvatarToDock(620);
    }, 1400);
  });
}

/**
 * Full-screen sakura shower fallback for opaque/non-injectable targets.
 */
function runMomoSakuraShower(ctx: EffectContext): void {
  const { stage, accentColor, returnAvatarToDock, scriptCtx } = ctx;
  const petalCount = 18;

  for (let i = 0; i < petalCount; i++) {
    const petal = document.createElement('div');
    const size = 5 + Math.random() * 5;
    const startX = Math.random() * window.innerWidth;
    petal.style.cssText = `position:absolute;top:-10px;left:${startX}px;width:${size}px;height:${size * 0.75}px;background:${accentColor};border-radius:${size}px ${size}px 0 ${size}px;pointer-events:none;`;
    stage.appendChild(petal);

    petal.animate(
      [
        { transform: 'translateY(0) rotate(0deg)', opacity: 0 },
        { opacity: 0.9, offset: 0.15 },
        {
          transform: `translateY(${window.innerHeight + 20}px) translateX(${(Math.random() - 0.5) * 120}px) rotate(${260 + Math.random() * 260}deg)`,
          opacity: 0,
        },
      ],
      { duration: 1400 + Math.random() * 800, delay: Math.random() * 300, easing: 'ease-in' },
    ).onfinish = () => petal.remove();
  }

  scriptCtx.setTimeout(() => returnAvatarToDock(520), 800);
}
