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
    <div className="bg-surface border border-line p-3">
      {/* Header Toggle */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between font-mono text-xs text-ink hover:opacity-70 cursor-pointer transition-opacity"
      >
        <div className="flex items-center gap-2">
          <Terminal size={14} />
          <span className="font-display font-semibold text-sm">
            Telemetry Traces
          </span>
          {latest && (
            <span className="font-mono font-bold text-[10px] text-white px-1 border border-line" style={{ backgroundColor: accentColor }}>
              {latest.latencyMs}ms
            </span>
          )}
        </div>
        {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {/* Expanded Traces View */}
      {isOpen && (
        <div className="space-y-3 pt-3 mt-3 border-t border-line text-xs">
          {traces.length === 0 ? (
            <div className="text-center py-4 text-ink-muted font-mono font-bold text-xs bg-base border border-dashed border-line-bright">
              No traces recorded yet.
            </div>
          ) : (
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
              {traces.map((t) => {
                const isDivergent = t.status === 'distracted' || t.status === 'exploring_tangent';
                return (
                  <div
                    key={t.id}
                    className="p-3 bg-surface border border-line space-y-2 font-mono text-ink transition-colors hover:bg-base"
                  >
                    {/* Top row: Model + Latency + Tokens */}
                    <div className="flex items-center justify-between text-[10px] font-bold text-ink-muted border-b border-line-bright pb-1">
                      <span className="text-ink bg-surface-raised px-1 border border-line-bright">{t.model || t.provider}</span>
                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1">
                          <Clock size={10} /> {t.latencyMs}ms
                        </span>
                        <span>{t.totalTokens || (t.promptTokens + t.completionTokens)} tok</span>
                      </div>
                    </div>

                    {/* Context row */}
                    <div className="text-sm font-bold truncate">
                      <span className="text-ink-faint text-[10px]">Domain: </span> {t.activeDomain || 'browser'}
                    </div>

                    {/* Decision tag */}
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className="px-2 py-0.5 border border-line text-[10px] font-semibold text-white"
                        style={{ backgroundColor: isDivergent ? '#EF4444' : accentColor }}
                      >
                        {t.status}
                      </span>
                      <span className="text-ink-muted text-[10px] font-bold">Mood: {t.mood}</span>
                    </div>

                    {/* Reasoning trace */}
                    {t.reasoning && (
                      <div className="bg-surface-raised p-2 border-l border-line text-xs font-bold leading-relaxed mt-2 italic text-ink-muted">
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
