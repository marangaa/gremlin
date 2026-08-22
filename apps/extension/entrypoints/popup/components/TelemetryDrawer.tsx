import React from 'react';
import { Clock, Terminal, ChevronDown, ChevronUp } from 'lucide-react';
import type { AiTelemetryTrace } from '@gremlin/shared';

interface TelemetryDrawerProps {
  traces: AiTelemetryTrace[];
  isOpen: boolean;
  onToggle: () => void;
}

export const TelemetryDrawer: React.FC<TelemetryDrawerProps & { accentColor?: string }> = ({
  traces,
  isOpen,
  onToggle,
  accentColor = '#000',
}) => {
  const latest = traces[0];

  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between py-2 font-mono text-xs cursor-pointer group"
      >
        <span className="flex items-center gap-2">
          <Terminal size={13} className="text-paper-muted" />
          <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-paper-muted group-hover:text-paper-ink transition-colors">
            Telemetry
          </span>
          {latest && (
            <span className="font-mono font-bold text-[10px] px-1" style={{ color: accentColor }}>
              {latest.latencyMs}ms
            </span>
          )}
        </span>
        {isOpen ? <ChevronUp size={15} className="text-paper-faint" /> : <ChevronDown size={15} className="text-paper-faint" />}
      </button>

      {isOpen && (
        <div className="pt-2 space-y-3">
          {traces.length === 0 ? (
            <p className="py-4 text-center font-mono text-[10px] font-bold uppercase tracking-wider text-paper-faint border-t border-dashed border-line">
              No traces yet
            </p>
          ) : (
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
              {traces.map((t) => {
                const isDivergent = t.status === 'distracted' || t.status === 'exploring_tangent';
                return (
                  <div
                    key={t.id}
                    className="pl-3 pr-1 py-2 space-y-1.5 font-mono text-paper-ink border-l-[3px]"
                    style={{ borderColor: isDivergent ? '#DC2626' : accentColor }}
                  >
                    <div className="flex items-center justify-between text-[10px] font-bold text-paper-faint">
                      <span className="text-paper-muted">{t.model || t.provider}</span>
                      <span className="flex items-center gap-2">
                        <span className="flex items-center gap-0.5">
                          <Clock size={9} /> {t.latencyMs}ms
                        </span>
                        <span>{t.totalTokens || (t.promptTokens + t.completionTokens)} tok</span>
                      </span>
                    </div>

                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-xs font-bold truncate">{t.activeDomain || 'browser'}</span>
                      <span
                        className="shrink-0 font-bold text-[10px] uppercase tracking-wider"
                        style={{ color: isDivergent ? '#DC2626' : accentColor }}
                      >
                        {t.status}
                      </span>
                    </div>

                    <div className="text-[9px] font-bold uppercase tracking-wider text-paper-faint">
                      Mood · {t.mood}
                    </div>

                    {t.reasoning && (
                      <p className="text-[11px] italic leading-relaxed text-paper-muted pt-1 border-t border-dashed border-line">
                        🧠 {t.reasoning}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
