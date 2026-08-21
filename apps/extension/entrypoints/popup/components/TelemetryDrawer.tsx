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
    <div className="bg-white border border-gray-200 p-3">
      {/* Header Toggle */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between font-mono text-xs text-gray-900 hover:opacity-70 cursor-pointer transition-opacity"
      >
        <div className="flex items-center gap-2">
          <Terminal size={14} />
          <span className="font-display font-semibold text-sm">
            Telemetry Traces
          </span>
          {latest && (
            <span className="font-mono font-bold text-[10px] text-white px-1 border border-gray-200" style={{ backgroundColor: accentColor }}>
              {latest.latencyMs}ms
            </span>
          )}
        </div>
        {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {/* Expanded Traces View */}
      {isOpen && (
        <div className="space-y-3 pt-3 mt-3 border-t border-gray-200 text-xs">
          {traces.length === 0 ? (
            <div className="text-center py-4 text-gray-500 font-mono font-bold text-xs bg-gray-50 border border-dashed border-gray-300">
              No traces recorded yet.
            </div>
          ) : (
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
              {traces.map((t) => {
                const isDivergent = t.status === 'distracted' || t.status === 'exploring_tangent';
                return (
                  <div
                    key={t.id}
                    className="p-3 bg-white border border-gray-200 space-y-2 font-mono text-gray-900 transition-colors hover:bg-gray-50"
                  >
                    {/* Top row: Model + Latency + Tokens */}
                    <div className="flex items-center justify-between text-[10px] font-bold text-gray-500 border-b border-gray-300 pb-1">
                      <span className="text-gray-900 bg-gray-100 px-1 border border-gray-300">{t.model || t.provider}</span>
                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1">
                          <Clock size={10} /> {t.latencyMs}ms
                        </span>
                        <span>{t.totalTokens || (t.promptTokens + t.completionTokens)} tok</span>
                      </div>
                    </div>

                    {/* Context row */}
                    <div className="text-sm font-bold truncate">
                      <span className="text-gray-400 text-[10px]">Domain: </span> {t.activeDomain || 'browser'}
                    </div>

                    {/* Decision tag */}
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className="px-2 py-0.5 border border-gray-200 text-[10px] font-semibold text-white"
                        style={{ backgroundColor: isDivergent ? '#EF4444' : accentColor }}
                      >
                        {t.status}
                      </span>
                      <span className="text-gray-500 text-[10px] font-bold">Mood: {t.mood}</span>
                    </div>

                    {/* Reasoning trace */}
                    {t.reasoning && (
                      <div className="bg-gray-100 p-2 border-l border-gray-200 text-xs font-bold leading-relaxed mt-2 italic text-gray-700">
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
