import React, { useEffect, useRef } from 'react';
import { type CompanionId } from '../lib/companions';

interface SpriteProps {
  id: CompanionId;
  size?: number;
  state?: 'idle' | 'action';
  className?: string;
  alt?: string;
}

export const Sprite: React.FC<SpriteProps> = ({
  id,
  size = 48,
  state = 'idle',
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;

    let frame = 0;
    let timer = 0;
    let rafId: number;
    let lastTime = performance.now();

    const render = (f: number) => {
      ctx.clearRect(0, 0, 96, 96);
      const isBlinking = f === 3 && state === 'idle';

      switch (id) {
        case 'Sarge': {
          // Sweatband
          ctx.fillStyle = '#ea580c';
          ctx.fillRect(26, 20, 44, 8);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(44, 22, 8, 4);

          // Body
          ctx.fillStyle = '#f97316';
          pixelRect(ctx, 26, 26, 44, 42, 6);

          // Shoulders
          ctx.fillStyle = '#c2410c';
          ctx.fillRect(20, 36, 6, 16);
          ctx.fillRect(70, 36, 6, 16);

          // Feet
          ctx.fillStyle = '#9a3412';
          ctx.fillRect(30, 68, 12, 8);
          ctx.fillRect(54, 68, 12, 8);

          // Visor
          ctx.fillStyle = '#0f172a';
          pixelRect(ctx, 30, 34, 36, 16, 4);

          // Scanner eyes
          if (isBlinking) {
            ctx.fillStyle = '#f97316';
            ctx.fillRect(34, 41, 28, 2);
          } else {
            ctx.fillStyle = '#fb923c';
            ctx.fillRect(38, 37, 8, 8);
            ctx.fillRect(50, 37, 8, 8);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(40, 39, 3, 3);
            ctx.fillRect(52, 39, 3, 3);
          }

          // Mouth
          ctx.fillStyle = '#7c2d12';
          if (state === 'action') {
            ctx.fillRect(42, 54, 12, 4);
          } else {
            ctx.fillRect(42, 54, 12, 2);
          }
          break;
        }

        case 'waifu': {
          // Bunny/Cat Ears
          ctx.fillStyle = '#db2777';
          ctx.fillRect(24, 16, 8, 14);
          ctx.fillRect(64, 16, 8, 14);
          ctx.fillStyle = '#fbcfe8';
          ctx.fillRect(26, 18, 4, 8);
          ctx.fillRect(66, 18, 4, 8);

          // Soft Pink Body
          ctx.fillStyle = '#ec4899';
          pixelRect(ctx, 26, 26, 44, 44, 12);

          // Cheeks
          ctx.fillStyle = '#f472b6';
          ctx.fillRect(30, 48, 6, 4);
          ctx.fillRect(60, 48, 6, 4);

          // Feet
          ctx.fillStyle = '#be185d';
          ctx.fillRect(34, 70, 8, 6);
          ctx.fillRect(54, 70, 8, 6);

          // Eyes
          drawEyes(ctx, 40, 40, 56, 40, isBlinking);

          // Smile
          ctx.fillStyle = '#831843';
          if (state === 'action') {
            ctx.fillRect(44, 52, 8, 4);
          } else {
            ctx.fillRect(46, 52, 4, 3);
          }
          break;
        }

        case 'sherlock': {
          // Hat
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(22, 20, 52, 6);
          ctx.fillRect(30, 10, 36, 12);
          ctx.fillStyle = '#3b82f6';
          ctx.fillRect(30, 18, 36, 3);

          // Body
          ctx.fillStyle = '#1e293b';
          pixelRect(ctx, 28, 26, 40, 44, 8);

          // Monocle / Scanner on Left Eye
          ctx.fillStyle = '#3b82f6';
          ctx.fillRect(34, 36, 14, 14);
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(36, 38, 10, 10);

          if (isBlinking) {
            ctx.fillStyle = '#60a5fa';
            ctx.fillRect(38, 42, 6, 2);
            ctx.fillRect(56, 42, 6, 2);
          } else {
            ctx.fillStyle = '#60a5fa';
            ctx.fillRect(38, 40, 6, 6);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(39, 40, 2, 2);

            // Right Eye
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(54, 38, 10, 10);
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(56, 40, 6, 6);
          }

          // Feet
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(32, 70, 10, 6);
          ctx.fillRect(54, 70, 10, 6);
          break;
        }

        case 'kuro': {
          // Horns
          ctx.fillStyle = '#991b1b';
          ctx.fillRect(28, 14, 6, 14);
          ctx.fillRect(62, 14, 6, 14);
          ctx.fillStyle = '#ef4444';
          ctx.fillRect(30, 12, 4, 6);
          ctx.fillRect(62, 12, 4, 6);

          // Body
          ctx.fillStyle = '#ef4444';
          pixelRect(ctx, 26, 26, 44, 42, 8);

          // Feet
          ctx.fillStyle = '#991b1b';
          ctx.fillRect(32, 68, 10, 8);
          ctx.fillRect(54, 68, 10, 8);

          // Eyes
          drawEyes(ctx, 38, 38, 58, 38, isBlinking);

          // Fangs
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(44, 52, 3, 4);
          ctx.fillRect(50, 52, 3, 4);
          break;
        }

        case 'sensei': {
          // Antennae
          ctx.fillStyle = '#047857';
          ctx.fillRect(36, 16, 4, 10);
          ctx.fillRect(56, 16, 4, 10);
          ctx.fillStyle = '#34d399';
          ctx.fillRect(34, 12, 8, 8);
          ctx.fillRect(54, 12, 8, 8);

          // Body
          ctx.fillStyle = '#10b981';
          pixelRect(ctx, 28, 24, 40, 44, 10);

          // Belly patch
          ctx.fillStyle = '#6ee7b7';
          pixelRect(ctx, 36, 46, 24, 18, 4);

          // Feet
          ctx.fillStyle = '#059669';
          ctx.fillRect(32, 68, 10, 8);
          ctx.fillRect(54, 68, 10, 8);

          // Eyes
          drawEyes(ctx, 38, 38, 58, 38, isBlinking);

          // Mouth
          ctx.fillStyle = '#064e3b';
          if (state === 'action') {
            ctx.fillRect(44, 50, 8, 4);
          } else {
            ctx.fillRect(44, 50, 8, 2);
          }
          break;
        }

        case 'byte': {
          // Hooded Charcoal Cloak
          ctx.fillStyle = '#1e293b';
          pixelRect(ctx, 26, 24, 44, 44, 10);

          // Deep Hood Shadow Around The Face
          ctx.fillStyle = '#0f172a';
          pixelRect(ctx, 31, 29, 34, 20, 8);

          // Glowing Terminal Glasses
          if (isBlinking) {
            ctx.fillStyle = '#22d3ee';
            ctx.fillRect(34, 38, 12, 2);
            ctx.fillRect(50, 38, 12, 2);
          } else {
            ctx.fillStyle = '#22d3ee';
            ctx.fillRect(33, 35, 13, 8);
            ctx.fillRect(50, 35, 13, 8);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(35, 37, 2, 2);
            ctx.fillRect(52, 37, 2, 2);
          }

          // Cyan Mouth Line
          ctx.fillStyle = '#22d3ee';
          if (state === 'action') {
            ctx.fillRect(42, 46, 12, 3);
          } else {
            ctx.fillRect(44, 47, 8, 2);
          }

          // Laptop Lid + Base In Front
          ctx.fillStyle = '#334155';
          ctx.fillRect(32, 58, 32, 12);
          ctx.fillRect(28, 70, 40, 7);

          // Flickering Screen Glow
          ctx.fillStyle = ['#164e63', '#0e7490', '#67e8f9', '#0891b2'][f % 4];
          ctx.fillRect(36, 61, 24, 6);
          break;
        }

        case 'pixel': {
          // Triangle Ears
          ctx.fillStyle = '#18181b';
          ctx.fillRect(28, 22, 12, 5);
          ctx.fillRect(31, 17, 6, 5);
          ctx.fillRect(56, 22, 12, 5);
          ctx.fillRect(59, 17, 6, 5);

          // Sleek Loaf Body
          ctx.fillStyle = '#18181b';
          pixelRect(ctx, 22, 26, 52, 44, 14);

          // Highlights
          ctx.fillStyle = '#27272a';
          ctx.fillRect(34, 29, 28, 4);

          // Big Yellow Eyes With Vertical Slit Pupils
          if (isBlinking) {
            ctx.fillStyle = '#facc15';
            ctx.fillRect(34, 45, 11, 2);
            ctx.fillRect(51, 45, 11, 2);
          } else {
            ctx.fillStyle = '#facc15';
            ctx.fillRect(34, 40, 11, 11);
            ctx.fillRect(51, 40, 11, 11);
            ctx.fillStyle = '#18181b';
            ctx.fillRect(39, 43, 3, 7);
            ctx.fillRect(56, 43, 3, 7);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(35, 41, 2, 2);
            ctx.fillRect(52, 41, 2, 2);
          }

          // Tiny Pink Nose
          ctx.fillStyle = '#f9a8d4';
          ctx.fillRect(45, 55, 6, 3);

          // Whiskers
          ctx.fillStyle = '#a1a1aa';
          ctx.fillRect(8, 52, 12, 1);
          ctx.fillRect(8, 56, 12, 1);
          ctx.fillRect(76, 52, 12, 1);
          ctx.fillRect(76, 56, 12, 1);

          // Tail Curl
          ctx.fillStyle = '#27272a';
          ctx.fillRect(72, 58, 8, 6);
          break;
        }

        case 'ufo':
        default: {
          const oy = (y: number) => y + (f % 2 === 1 ? 2 : 0);

          // Glass Dome
          ctx.fillStyle = isBlinking ? '#7cb8d4' : '#bae6fd';
          ctx.fillRect(38, oy(24), 20, 4);
          ctx.fillRect(34, oy(28), 28, 6);

          // Alien Pilot Silhouette
          ctx.fillStyle = '#7c3aed';
          ctx.fillRect(43, oy(27), 10, 4);
          ctx.fillRect(41, oy(31), 14, 3);

          // Metallic Hull
          ctx.fillStyle = '#64748b';
          ctx.fillRect(24, oy(34), 48, 8);
          ctx.fillRect(18, oy(40), 60, 10);

          // Underside
          ctx.fillStyle = '#475569';
          ctx.fillRect(26, oy(50), 44, 6);
          ctx.fillRect(40, oy(56), 16, 5);

          // Beam Emitter Glow
          ctx.fillStyle = '#8b5cf6';
          ctx.fillRect(44, oy(60), 8, 3);

          // Hull Lights
          for (let i = 0; i < 6; i++) {
            ctx.fillStyle = i === f % 6 ? '#8b5cf6' : '#334155';
            ctx.fillRect(23 + i * 9, oy(43), 4, 4);
          }
          break;
        }
      }
    };

    const loop = (now: number) => {
      const dt = now - lastTime;
      lastTime = now;
      timer += dt;
      if (timer >= 350) {
        timer = 0;
        frame = (frame + 1) % 4;
      }
      render(frame);
      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafId);
    };
  }, [id, state]);

  return (
    <span
      className={`inline-flex items-center justify-center select-none ${className}`}
      style={{ width: size, height: size }}
    >
      <canvas
        ref={canvasRef}
        width={96}
        height={96}
        style={{
          width: '100%',
          height: '100%',
          imageRendering: 'pixelated',
        }}
      />
    </span>
  );
};

function pixelRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r = 0,
) {
  if (r === 0) {
    ctx.fillRect(x, y, w, h);
    return;
  }
  ctx.fillRect(x + r, y, w - r * 2, h);
  ctx.fillRect(x, y + r, w, h - r * 2);
  ctx.fillRect(x + 2, y + 2, w - 4, h - 4);
}

function drawEyes(
  ctx: CanvasRenderingContext2D,
  leftX: number,
  leftY: number,
  rightX: number,
  rightY: number,
  isBlinking: boolean,
) {
  if (isBlinking) {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(leftX - 4, leftY + 2, 8, 3);
    ctx.fillRect(rightX - 4, rightY + 2, 8, 3);
    return;
  }

  // Eye Whites
  ctx.fillStyle = '#ffffff';
  pixelRect(ctx, leftX - 6, leftY - 6, 12, 14, 3);
  pixelRect(ctx, rightX - 6, rightY - 6, 12, 14, 3);

  // Pupils
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(leftX - 2, leftY - 2, 6, 6);
  ctx.fillRect(rightX - 2, rightY - 2, 6, 6);

  // White Glint
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(leftX - 1, leftY - 2, 2, 2);
  ctx.fillRect(rightX - 1, rightY - 2, 2, 2);
}
