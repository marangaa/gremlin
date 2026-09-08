import React, { useState } from 'react';
import {
  Sparkles,
  Clock,
  Flame,
  FileText,
  Globe,
  Trash2,
  Target,
  Compass,
  Shuffle,
} from 'lucide-react';
import type { DailyDiary, CompanionDailyReflection } from '@gremlin/shared';
import { AnimatedSprite } from './AnimatedSprite';
import { type OrganismId } from '@/lib/personalities/types';

interface DiaryViewProps {
  diary: DailyDiary;
  companionId: OrganismId;
  accentColor: string;
  onGenerateReflection: () => Promise<CompanionDailyReflection>;
  onDeleteNote: (id: string) => void;
}

export const DiaryView: React.FC<DiaryViewProps> = ({
  diary,
  companionId,
  accentColor,
  onGenerateReflection,
  onDeleteNote,
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [reflection, setReflection] = useState<CompanionDailyReflection | undefined>(
    diary.companionReflection,
  );

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const res = await onGenerateReflection();
      setReflection(res);
    } finally {
      setIsGenerating(false);
    }
  };

  const currentSwitches = diary.contextSwitches ?? reflection?.digitalSelfAwareness?.contextSwitches ?? 0;

  return (
    <div className="text-paper-ink">
      {/* Metric strip — 4 columns with context switches */}
      <div className="grid grid-cols-4 border-y border-dashed border-line">
        <div className="py-3 pr-2 text-center border-r border-dashed border-line">
          <span className="font-mono text-[8px] font-bold uppercase tracking-wider text-paper-faint block">
            Focus
          </span>
          <span className="font-display font-bold text-xl text-paper-ink flex items-center justify-center gap-1">
            <Clock size={12} className="text-paper-muted" />
            {diary.totalFocusMinutes}m
          </span>
        </div>
        <div className="py-3 px-1.5 text-center border-r border-dashed border-line">
          <span className="font-mono text-[8px] font-bold uppercase tracking-wider text-paper-faint block">
            Switches
          </span>
          <span className="font-display font-bold text-xl text-paper-ink flex items-center justify-center gap-1">
            <Shuffle size={12} className="text-paper-muted" />
            {currentSwitches}
          </span>
        </div>
        <div className="py-3 px-1.5 text-center border-r border-dashed border-line">
          <span className="font-mono text-[8px] font-bold uppercase tracking-wider text-paper-faint block">
            Detours
          </span>
          <span className="font-display font-bold text-xl flex items-center justify-center gap-1" style={{ color: accentColor }}>
            <Flame size={12} />
            {diary.totalDetours}
          </span>
        </div>
        <div className="py-3 pl-2 text-center">
          <span className="font-mono text-[8px] font-bold uppercase tracking-wider text-paper-faint block">
            Notes
          </span>
          <span className="font-display font-bold text-xl text-paper-ink flex items-center justify-center gap-1">
            <FileText size={12} className="text-paper-muted" />
            {diary.notes.length}
          </span>
        </div>
      </div>

      {/* Reflection */}
      <section className="pt-6">
        <div className="flex items-center justify-between pb-3 border-b border-dashed border-line">
          <span className="flex items-center gap-2">
            <span
              className="w-7 h-7 shrink-0 border-2 border-coal shadow-[2px_2px_0_0_#12151A] flex items-center justify-center overflow-hidden"
              style={{ backgroundColor: accentColor }}
            >
              <AnimatedSprite id={companionId} size={19} state="idle" />
            </span>
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-paper-muted">
              Reflection
            </span>
          </span>
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="font-mono text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 transition-opacity hover:opacity-75 cursor-pointer disabled:opacity-40"
            style={{ color: accentColor }}
          >
            <Sparkles size={11} />
            <span>{isGenerating ? '…' : 'Synthesize'}</span>
          </button>
        </div>

        {reflection ? (
          <div className="pt-3 space-y-3">
            <div className="flex items-start justify-between gap-4">
              <h3 className="font-display font-bold text-lg leading-tight">
                “{reflection.headline}”
              </h3>
              <span className="shrink-0 font-display font-bold text-lg" style={{ color: accentColor }}>
                {reflection.score}<span className="text-paper-faint text-sm">/10</span>
              </span>
            </div>

            <p className="font-mono text-xs font-bold leading-relaxed text-paper-muted">
              {reflection.summary}
            </p>

            <p className="pl-3 border-l-[3px] font-mono text-[11px] font-bold italic leading-relaxed text-paper-muted" style={{ borderColor: accentColor }}>
              💡 {reflection.advice}
            </p>

            {/* Digital Self-Awareness Behavioral Mirror */}
            {reflection.digitalSelfAwareness && (
              <div className="mt-4 p-3 bg-white border-2 border-coal shadow-[2px_2px_0_0_#12151A] space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-coal">
                    <Compass size={13} style={{ color: accentColor }} />
                    <span>Digital Self-Awareness</span>
                  </span>
                  <span className="font-mono text-[9px] font-bold text-paper-faint">
                    {reflection.digitalSelfAwareness.contextSwitches} tab switches
                  </span>
                </div>

                {/* Research vs Production Ratio */}
                {(() => {
                  const res = reflection.digitalSelfAwareness.researchMinutes;
                  const prod = reflection.digitalSelfAwareness.productionMinutes;
                  const sum = Math.max(1, res + prod);
                  const prodPct = Math.round((prod / sum) * 100);
                  const resPct = 100 - prodPct;

                  return (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between font-mono text-[10px] font-bold">
                        <span className="text-paper-muted flex items-center gap-1">
                          <span className="w-2 h-2 inline-block bg-[#6B7280]" /> Research {res}m ({resPct}%)
                        </span>
                        <span className="text-coal flex items-center gap-1">
                          <span className="w-2 h-2 inline-block" style={{ backgroundColor: accentColor }} /> Production {prod}m ({prodPct}%)
                        </span>
                      </div>
                      <div className="h-2 w-full bg-[#E5E7EB] flex overflow-hidden border border-coal">
                        <div style={{ width: `${resPct}%` }} className="bg-[#9CA3AF] h-full transition-all" title={`Research: ${res}m`} />
                        <div style={{ width: `${prodPct}%`, backgroundColor: accentColor }} className="h-full transition-all" title={`Production: ${prod}m`} />
                      </div>
                    </div>
                  );
                })()}

                {/* Mirror insight */}
                {reflection.digitalSelfAwareness.mirrorInsight && (
                  <p className="font-mono text-[11px] font-bold text-coal leading-snug pt-1 border-t border-dashed border-line">
                    <span className="text-paper-faint uppercase text-[9px] block mb-0.5">Behavioral Mirror:</span>
                    “{reflection.digitalSelfAwareness.mirrorInsight}”
                  </p>
                )}
              </div>
            )}
          </div>
        ) : (
          <p className="py-5 text-center font-mono text-[10px] font-bold uppercase tracking-wider text-paper-faint">
            Hit synthesize — your companion reviews the day.
          </p>
        )}
      </section>

      {/* Domain breakdown */}
      {diary.topDomains.length > 0 && (
        <section className="pt-6">
          <div className="pb-2 border-b border-dashed border-line">
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-paper-muted">
              Where focus went
            </span>
          </div>
          <div className="space-y-2.5 pt-3">
            {diary.topDomains.map((item) => {
              const total = Math.max(1, diary.totalFocusMinutes);
              const pct = Math.min(100, Math.round((item.minutes / total) * 100));
              return (
                <div key={item.domain}>
                  <div className="flex items-center justify-between font-mono text-[11px] font-bold">
                    <span className="truncate max-w-[70%]">{item.domain}</span>
                    <span className="text-paper-faint">{item.minutes}m · {pct}%</span>
                  </div>
                  <div className="mt-1 h-1 w-full bg-paper-line">
                    <div className="h-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: accentColor }} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Notes stream */}
      <section className="pt-6 pb-2">
        <div className="flex items-center justify-between pb-2 border-b border-dashed border-line">
          <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-paper-muted">
            Today's notes{diary.notes.length > 0 ? ` · ${diary.notes.length}` : ''}
          </span>
        </div>

        {diary.notes.length === 0 ? (
          <p className="py-6 text-center font-mono text-[10px] font-bold uppercase tracking-wider text-paper-faint">
            Nothing yet — jot thoughts while browsing.
          </p>
        ) : (
          <div className="divide-y divide-dashed divide-line">
            {diary.notes.map((note) => (
              <article key={note.id} className="group py-4 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <a
                    href={note.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 min-w-0 font-mono text-[11px] font-bold hover:underline underline-offset-2"
                  >
                    <Globe size={12} className="text-paper-faint shrink-0" />
                    <span className="truncate">{note.domain}</span>
                  </a>
                  <button
                    onClick={() => onDeleteNote(note.id)}
                    className="opacity-0 group-hover:opacity-100 text-paper-faint hover:text-red-600 transition-all cursor-pointer shrink-0"
                    title="Delete note"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>

                {note.snippet && (
                  <p className="pl-3 border-l-[3px] font-mono text-[10px] font-bold italic text-paper-faint" style={{ borderColor: accentColor }}>
                    “{note.snippet}”
                  </p>
                )}

                <p className="font-display font-semibold text-sm leading-relaxed">
                  {note.content}
                </p>

                <div className="flex items-center justify-between gap-2 font-mono text-[9px] font-bold uppercase tracking-wider text-paper-faint">
                  <span>{new Date(note.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  {note.goalTitle && (
                    <span className="truncate max-w-[60%] inline-flex items-center gap-1" style={{ color: accentColor }}>
                      <Target size={9} /> {note.goalTitle}
                    </span>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
