import React from 'react';
import type { AgentTelemetryData, FocusScorePoint } from '@/lib/storage';

interface FocusTelemetryHUDProps {
  telemetry: AgentTelemetryData;
  now: number;
  goal: string;
  elapsedSecs: number;
  accentColor: string;
  onPoke?: () => void;
}

export const FocusTelemetryHUD: React.FC<FocusTelemetryHUDProps> = ({
  telemetry,
  elapsedSecs,
}) => {
  const isEvaluating = telemetry.isEvaluating;
  const lastScore = telemetry.lastScore;
  const history = telemetry.history || [];

  // Determine refined status and dot color (lowercase, calm)
  let statusText = 'observing';
  let dotColor = 'bg-paper-muted';

  if (isEvaluating) {
    statusText = 'checking context…';
    dotColor = 'bg-amber-400 animate-pulse';
  } else if (lastScore !== undefined) {
    if (lastScore >= 70) {
      statusText = telemetry.lastDomain ? `on track · ${telemetry.lastDomain}` : 'on track';
      dotColor = 'bg-emerald-500';
    } else if (lastScore >= 40) {
      statusText = telemetry.lastDomain ? `tangent · ${telemetry.lastDomain}` : 'tangent';
      dotColor = 'bg-amber-500';
    } else {
      statusText = telemetry.lastDomain ? `detour · ${telemetry.lastDomain}` : 'detour';
      dotColor = 'bg-rose-500';
    }
  }

  const formatElapsed = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}m ${s < 10 ? '0' : ''}${s}s`;
  };

  const companionThought = telemetry.lastRemark || telemetry.lastReasoning;

  return (
    <div className="flex flex-col gap-2 pt-0.5">
      {/* 1. Header: Elapsed time and clean lowercase status */}
      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-1.5">
          <span className="font-display font-bold text-2xl tracking-tight text-coal tabular-nums">
            {formatElapsed(elapsedSecs)}
          </span>
          <span className="font-mono text-[10px] text-paper-faint lowercase">elapsed</span>
        </div>

        <div className="flex items-center gap-1.5 font-mono text-[10.5px] text-paper-muted lowercase">
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} />
          <span className="truncate max-w-[170px]">{statusText}</span>
        </div>
      </div>

      {/* 2. Focus Activity Ribbon (Minimalist sparkline) */}
      <div className="flex flex-col gap-1">
        <div className="h-6 flex items-end gap-[3px] bg-paper-card px-2 py-1 border border-line/60 rounded-xs">
          {history.length === 0 ? (
            <div className="w-full h-full flex items-center justify-center font-mono text-[9.5px] text-paper-faint lowercase">
              starting focus monitor…
            </div>
          ) : (
            history.map((pt: FocusScorePoint, idx: number) => {
              const heightPct = Math.max(20, Math.min(100, pt.score));
              const isLast = idx === history.length - 1;
              let barColor = 'bg-rose-400';
              if (pt.score >= 70) barColor = 'bg-emerald-500';
              else if (pt.score >= 40) barColor = 'bg-amber-400';

              return (
                <div
                  key={`${pt.timestamp}-${idx}`}
                  className="flex-1 flex flex-col items-center justify-end h-full group relative"
                >
                  <div
                    className={`w-full rounded-[1px] transition-all duration-300 ${barColor} ${
                      isLast ? 'ring-1 ring-coal/40' : 'opacity-80'
                    }`}
                    style={{ height: `${heightPct}%` }}
                  />
                  {/* Subtle tooltip */}
                  <div className="absolute bottom-full mb-1 hidden group-hover:flex flex-col items-center z-30 pointer-events-none">
                    <div className="bg-coal text-white font-mono text-[8px] py-0.5 px-1.5 rounded-xs lowercase whitespace-nowrap shadow-xs">
                      {pt.score}% · {pt.domain || 'web'}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 3. Quiet Companion Murmur (Refined, no loud debug card) */}
      {companionThought && (
        <p className="font-mono text-[10.5px] leading-relaxed text-paper-muted lowercase line-clamp-2 pt-0.5">
          “{companionThought.replace(/^["']|["']$/g, '')}”
        </p>
      )}
    </div>
  );
};
