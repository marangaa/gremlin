import React, { useState } from 'react';
import {
  Calendar,
  Sparkles,
  Clock,
  Flame,
  FileText,
  Globe,
  Trash2,
  ExternalLink,
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
    <div className="space-y-6 text-gray-900">
      {/* 3 Metric Stats Row - Flattened Cardless look */}
      <div className="grid grid-cols-3 gap-0 border border-gray-200 bg-white">
        <div className="p-3 border-r border-gray-200 space-y-1 text-center">
          <span className="font-display font-semibold text-[10px] text-gray-500 block">
            Deep focus
          </span>
          <span className="font-display text-xl font-semibold text-gray-900 flex items-center justify-center gap-1.5">
            <Clock size={16} />
            {diary.totalFocusMinutes}m
          </span>
        </div>

        <div className="p-3 border-r border-gray-200 space-y-1 text-center text-white" style={{ backgroundColor: accentColor }}>
          <span className="font-display font-semibold text-[10px] text-white/80 block">
            Divergences
          </span>
          <span className="font-display text-xl font-semibold flex items-center justify-center gap-1.5">
            <Flame size={16} />
            {diary.totalDetours}
          </span>
        </div>

        <div className="p-3 space-y-1 text-center bg-gray-100">
          <span className="font-display font-semibold text-[10px] text-gray-500 block">
            Page notes
          </span>
          <span className="font-display text-xl font-semibold text-gray-900 flex items-center justify-center gap-1.5">
            <FileText size={16} />
            {diary.notes.length}
          </span>
        </div>
      </div>

      {/* Companion Reflection Section */}
      <div className="space-y-4 p-4 bg-white border border-gray-200">
        <div className="flex items-center justify-between pb-2 border-b border-dashed border-gray-300">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 border border-gray-200 flex items-center justify-center transition-colors" style={{ backgroundColor: accentColor }}>
              <AnimatedSprite id={companionId} size={22} state="idle" />
            </div>
            <span className="font-display font-semibold text-sm text-gray-900 tracking-wider">
              Reflection
            </span>
          </div>
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="bg-black text-white font-display font-semibold border border-gray-200 px-3 py-1.5 text-[10px] hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
          >
            <Sparkles size={12} />
            <span>{isGenerating ? 'Synthesizing…' : 'Synthesize AI'}</span>
          </button>
        </div>

        {reflection ? (
          <div className="space-y-4 pt-2">
            <div className="flex items-start justify-between gap-4">
              <div className="font-display font-semibold text-lg text-gray-900 leading-tight">
                “{reflection.headline}”
              </div>
              <span className="font-mono text-xl text-white font-semibold px-2 py-1 border border-gray-200" style={{ backgroundColor: accentColor }}>
                {reflection.score}/10
              </span>
            </div>

            <p className="text-gray-700 leading-relaxed text-sm font-mono font-bold">
              {reflection.summary}
            </p>

            <div className="p-3 border border-gray-200 text-xs font-mono text-gray-900 leading-relaxed font-bold bg-gray-50">
              💡 <strong>Coaching tip:</strong> {reflection.advice}
            </div>
          </div>
        ) : (
          <div className="py-4 text-center text-sm font-mono font-bold text-gray-500 border border-dashed border-gray-300 bg-gray-50">
            Click <strong>Synthesize AI</strong> to have your companion analyze today's focus and write your daily reflection.
          </div>
        )}
      </div>

      {/* Top Domains Dwell Distribution */}
      {diary.topDomains.length > 0 && (
        <div className="space-y-3 bg-white border border-gray-200 p-4">
          <span className="font-display font-semibold text-sm text-gray-900 block border-b border-gray-200 pb-2">
            Domain focus breakdown
          </span>
          <div className="space-y-2 pt-2">
            {diary.topDomains.map((item) => {
              const total = Math.max(1, diary.totalFocusMinutes);
              const pct = Math.min(100, Math.round((item.minutes / total) * 100));
              return (
                <div key={item.domain} className="space-y-1 text-xs">
                  <div className="flex items-center justify-between font-mono font-bold text-gray-900 text-[11px]">
                    <span className="truncate max-w-[200px]">{item.domain}</span>
                    <span>{item.minutes}m ({pct}%)</span>
                  </div>
                  <div className="h-3 w-full bg-gray-200 border border-gray-200 relative">
                    <div
                      className="absolute top-0 left-0 h-full border-r border-gray-200 transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: accentColor }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Saved Smart Page Notes Stream */}
      <div className="space-y-3">
        <div className="flex items-center justify-between border-b border-gray-200 pb-1">
          <span className="font-display font-semibold text-xs text-gray-900">
            Today's notes ({diary.notes.length})
          </span>
        </div>

        {diary.notes.length === 0 ? (
          <div className="py-8 text-center text-sm font-mono font-bold text-gray-500 border border-dashed border-gray-300 bg-white">
            No notes taken today. Enter a note above while browsing!
          </div>
        ) : (
          <div className="space-y-3">
            {diary.notes.map((note) => (
              <div
                key={note.id}
                className="p-4 bg-white border border-gray-200 space-y-3 text-sm transition-colors group hover:bg-gray-50"
              >
                <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                  <div className="flex items-center gap-2 min-w-0">
                    <Globe size={14} className="text-gray-900 shrink-0" />
                    <a
                      href={note.url}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono text-xs font-bold text-gray-900 hover:bg-black hover:text-white px-1 transition-colors truncate max-w-[200px]"
                    >
                      {note.domain}
                    </a>
                  </div>
                  <button
                    onClick={() => onDeleteNote(note.id)}
                    className="w-6 h-6 flex items-center justify-center bg-white border border-gray-200 text-gray-900 hover:bg-black hover:text-white transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
                    title="Delete note"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>

                {note.snippet && (
                  <div className="font-mono text-[11px] font-bold text-gray-600 pl-3 border-l border-gray-200 italic bg-gray-100 py-2 pr-2">
                    “{note.snippet}”
                  </div>
                )}

                <div className="text-gray-900 font-display font-bold leading-relaxed text-sm">
                  {note.content}
                </div>

                <div className="text-[10px] font-mono font-bold text-gray-500 pt-2 flex items-center justify-between border-t border-dashed border-gray-300">
                  <span>{new Date(note.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  {note.goalTitle && <span className="truncate max-w-[140px] text-white px-1" style={{ backgroundColor: accentColor }}>🎯 {note.goalTitle}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
