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
    <div className="bg-white border-2 border-coal shadow-brut-sm p-3">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between font-mono text-xs text-paper-ink hover:opacity-70 cursor-pointer transition-opacity"
      >
        <div className="flex items-center gap-2">
          <Terminal size={14} />
          <span className="font-display font-bold text-sm">
            Telemetry
          </span>
          {latest && (
            <span className="font-mono font-bold text-[10px] text-white px-1 border border-transparent" style={{ backgroundColor: accentColor }}>
              {latest.latencyMs}ms
            </span>
          )}
        </div>
        {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {isOpen && (
        <div className="space-y-3 pt-3 mt-3 border-t-2 border-dashed border-line text-xs">
          {traces.length === 0 ? (
            <div className="text-center py-4 text-paper-faint font-mono font-bold text-xs bg-paper border-2 border-dashed border-line">
              No traces yet
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
              {traces.map((t) => {
                const isDivergent = t.status === 'distracted' || t.status === 'exploring_tangent';
                return (
                  <div
                    key={t.id}
                    className="p-3 bg-paper border-2 border-coal space-y-2 font-mono text-paper-ink transition-shadow hover:shadow-brut-sm"
                  >
                    <div className="flex items-center justify-between text-[10px] font-bold text-paper-muted border-b border-dashed border-line pb-1">
                      <span className="text-paper-ink bg-white px-1 border border-coal">{t.model || t.provider}</span>
                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1">
                          <Clock size={10} /> {t.latencyMs}ms
                        </span>
                        <span>{t.totalTokens || (t.promptTokens + t.completionTokens)} tok</span>
                      </div>
                    </div>

                    <div className="text-sm font-bold truncate">
                      <span className="text-paper-faint text-[10px]">Domain: </span> {t.activeDomain || 'browser'}
                    </div>

                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className="px-2 py-0.5 border-2 border-coal text-[10px] font-semibold text-white"
                        style={{ backgroundColor: isDivergent ? '#DC2626' : accentColor }}
                      >
                        {t.status}
                      </span>
                      <span className="text-paper-muted text-[10px] font-bold">Mood: {t.mood}</span>
                    </div>

                    {t.reasoning && (
                      <div className="bg-white p-2 border-l-4 text-xs font-bold leading-relaxed mt-2 italic text-paper-muted" style={{ borderColor: accentColor }}>
                        🧠 {t.reasoning}
                      </div>
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
