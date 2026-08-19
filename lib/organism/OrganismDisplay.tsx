import React, { useEffect, useRef } from 'react';
import { getOrganismSvg } from './sprites';
import { ORGANISM_MODELS, type OrganismId, type OrganismState } from '../personalities/types';
import './OrganismDisplay.css';

interface OrganismDisplayProps {
  organismId: OrganismId;
  state: OrganismState;
  remark?: string;
  onPopOutPiP?: () => void;
  supportsPiP?: boolean;
}

export const OrganismDisplay: React.FC<OrganismDisplayProps> = ({
  organismId,
  state,
  remark,
  onPopOutPiP,
  supportsPiP = true,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const model = ORGANISM_MODELS[organismId] || ORGANISM_MODELS.nexus;

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const offset = Math.max(-1, Math.min(1, (e.clientX - centerX) / 80)) * 3.5;
      containerRef.current.style.setProperty('--pupil-x', `${offset}px`);
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    return () => window.removeEventListener('pointermove', handlePointerMove);
  }, []);

  return (
    <div className="organism-stage">
      <div
        ref={containerRef}
        className={`organism-display-root state-${state}`}
      >
        {/* Thought Pill */}
        {remark && (
          <div className="thought-pill is-visible">
            <span>{remark}</span>
          </div>
        )}

        {/* Ambient Stage Backdrop Glow */}
        <div
          className="stage-glow"
          style={{ background: `radial-gradient(circle, ${model.accentColor}22 0%, transparent 70%)` }}
        />

        {/* Character Avatar */}
        <div
          className="organism-body"
          dangerouslySetInnerHTML={{ __html: getOrganismSvg(organismId) }}
        />
      </div>

      {/* Pop Out Floating PiP Button */}
      {supportsPiP && onPopOutPiP && (
        <button
          className="btn-pip-popout"
          onClick={onPopOutPiP}
          title="Detach into Always-on-Top Floating Organism"
        >
          <span>🪟 Pop Out Floating Viewport</span>
        </button>
      )}
    </div>
  );
};
