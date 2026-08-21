import React, { useEffect, useRef } from 'react';
import { type OrganismId, type OrganismState } from '@/lib/personalities/types';
import { SpriteEngine } from '@/lib/organism/spriteEngine';

export interface AnimatedSpriteProps {
  id: OrganismId;
  state?: OrganismState;
  size?: number;
  className?: string;
  onClick?: () => void;
}

export const AnimatedSprite: React.FC<AnimatedSpriteProps> = ({
  id,
  state = 'idle',
  size = 32,
  className = '',
  onClick,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<SpriteEngine | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const engine = new SpriteEngine(canvasRef.current);
    engine.setOrganism(id);
    engine.setState(state);
    engineRef.current = engine;

    let rafId: number;
    let lastTime = performance.now();

    const loop = (now: number) => {
      const dt = Math.min(100, now - lastTime);
      lastTime = now;
      engine.update(dt);
      engine.render();
      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafId);
      engineRef.current = null;
    };
  }, [id, state]);

  return (
    <div
      className={`animated-sprite-container state-${state} ${className}`}
      style={{
        width: size,
        height: size,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        userSelect: 'none',
        position: 'relative',
        cursor: onClick ? 'pointer' : 'default',
      }}
      onClick={onClick}
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
    </div>
  );
};
