import React, { useState } from 'react';
import {
  Sparkles,
  Clock,
  Flame,
  FileText,
  Globe,
  Trash2,
  Target,
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

  return (
    <div className="space-y-6 text-paper-ink">
      {/* Metric strip */}
      <div className="grid grid-cols-3 gap-0 bg-white border-2 border-coal shadow-brut-sm overflow-hidden">
        <div className="p-3 border-r-2 border-coal space-y-1 text-center">
          <span className="font-mono font-bold text-[9px] uppercase tracking-wider text-paper-muted block">
            Focus
          </span>
          <span className="font-display font-semibold text-xl text-paper-ink flex items-center justify-center gap-1.5">
            <Clock size={15} />
            {diary.totalFocusMinutes}m
          </span>
        </div>

        <div className="p-3 border-r-2 border-coal space-y-1 text-center text-white" style={{ backgroundColor: accentColor }}>
          <span className="font-mono font-bold text-[9px] uppercase tracking-wider text-white/85 block">
            Detours
          </span>
          <span className="font-display font-semibold text-xl flex items-center justify-center gap-1.5">
            <Flame size={15} />
            {diary.totalDetours}
          </span>
        </div>

        <div className="p-3 space-y-1 text-center bg-paper">
          <span className="font-mono font-bold text-[9px] uppercase tracking-wider text-paper-muted block">
            Notes
          </span>
          <span className="font-display font-semibold text-xl text-paper-ink flex items-center justify-center gap-1.5">
            <FileText size={15} />
            {diary.notes.length}
          </span>
        </div>
      </div>

      {/* Reflection */}
      <div className="space-y-4 p-4 bg-white border-2 border-coal shadow-brut-sm">
        <div className="flex items-center justify-between pb-2 border-b-2 border-dashed border-line">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 border-2 border-coal shadow-[2px_2px_0_0_#12151A] flex items-center justify-center" style={{ backgroundColor: accentColor }}>
              <AnimatedSprite id={companionId} size={22} state="idle" />
            </div>
            <span className="font-display font-bold text-sm text-paper-ink tracking-wider">
              Reflection
            </span>
          </div>
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="bg-accent text-coal border-2 border-coal font-display font-bold px-2.5 py-1.5 text-[10px] shadow-[2px_2px_0_0_#12151A] transition-all hover:-translate-y-px hover:shadow-[3px_3px_0_0_#12151A] active:translate-y-0 active:shadow-none cursor-pointer disabled:opacity-50 disabled:shadow-none disabled:translate-y-0 flex items-center gap-1.5"
          >
            <Sparkles size={11} />
            <span>{isGenerating ? '…' : 'SYNTHESIZE'}</span>
          </button>
        </div>

        {reflection ? (
          <div className="space-y-4 pt-1">
            <div className="flex items-start justify-between gap-4">
              <div className="font-display font-bold text-lg text-paper-ink leading-tight">
                “{reflection.headline}”
              </div>
              <span className="font-mono text-lg text-white font-bold px-2 py-1 shrink-0 border-2 border-coal" style={{ backgroundColor: accentColor }}>
                {reflection.score}/10
              </span>
            </div>

            <p className="text-paper-muted leading-relaxed text-sm font-mono font-bold">
              {reflection.summary}
            </p>

            <div className="p-3 bg-paper border-2 border-dashed border-line text-xs font-mono text-paper-ink leading-relaxed font-bold">
              💡 <strong>Tip:</strong> {reflection.advice}
            </div>
          </div>
        ) : (
          <div className="py-4 text-center text-sm font-mono font-bold text-paper-faint border-2 border-dashed border-line bg-paper">
            Hit SYNTHESIZE — your companion reviews the day.
          </div>
        )}
      </div>

      {/* Domain breakdown */}
      {diary.topDomains.length > 0 && (
        <div className="space-y-3 bg-white border-2 border-coal shadow-brut-sm p-4">
          <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-paper-muted block border-b-2 border-dashed border-line pb-2">
            Where focus went
          </span>
          <div className="space-y-2 pt-2">
            {diary.topDomains.map((item) => {
              const total = Math.max(1, diary.totalFocusMinutes);
              const pct = Math.min(100, Math.round((item.minutes / total) * 100));
              return (
                <div key={item.domain} className="space-y-1 text-xs">
                  <div className="flex items-center justify-between font-mono font-bold text-paper-ink text-[11px]">
                    <span className="truncate max-w-[200px]">{item.domain}</span>
                    <span>{item.minutes}m ({pct}%)</span>
                  </div>
                  <div className="h-3 w-full bg-paper border-2 border-coal relative overflow-hidden">
                    <div
                      className="absolute top-0 left-0 h-full transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: accentColor }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Notes stream */}
      <div className="space-y-3">
        <div className="flex items-center justify-between border-b-2 border-dashed border-line pb-1">
          <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-paper-muted">
            Today's notes · {diary.notes.length}
          </span>
        </div>

        {diary.notes.length === 0 ? (
          <div className="py-8 text-center text-sm font-mono font-bold text-paper-faint border-2 border-dashed border-line bg-paper">
            No notes yet — jot thoughts while browsing.
          </div>
        ) : (
          <div className="space-y-3">
            {diary.notes.map((note) => (
              <div
                key={note.id}
                className="p-4 bg-white border-2 border-coal shadow-brut-sm space-y-3 text-sm transition-shadow group hover:shadow-brut"
              >
                <div className="flex items-center justify-between pb-2 border-b-2 border-dashed border-line">
                  <div className="flex items-center gap-2 min-w-0">
                    <Globe size={14} className="text-paper-muted shrink-0" />
                    <a
                      href={note.url}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono text-xs font-bold text-paper-ink hover:text-paper-muted transition-colors truncate max-w-[200px]"
                    >
                      {note.domain}
                    </a>
                  </div>
                  <button
                    onClick={() => onDeleteNote(note.id)}
                    className="w-6 h-6 flex items-center justify-center bg-paper border-2 border-coal text-paper-muted hover:text-red-600 transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
                    title="Delete note"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>

                {note.snippet && (
                  <div className="font-mono text-[11px] font-bold text-paper-muted pl-3 border-l-4 italic bg-paper py-2 pr-2" style={{ borderColor: accentColor }}>
                    “{note.snippet}”
                  </div>
                )}

                <div className="text-paper-ink font-display font-bold leading-relaxed text-sm">
                  {note.content}
                </div>

                <div className="text-[10px] font-mono font-bold text-paper-muted pt-2 flex items-center justify-between border-t-2 border-dashed border-line">
                  <span>{new Date(note.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  {note.goalTitle && (
                    <span className="truncate max-w-[140px] text-white px-1.5 py-0.5 inline-flex items-center gap-1 border-2 border-coal" style={{ backgroundColor: accentColor }}>
                      <Target size={9} /> {note.goalTitle}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
