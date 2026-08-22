import React, { useState } from 'react';
import {
  Trash2,
  CheckCircle2,
} from 'lucide-react';
import type { DecomposedGoal } from '@gremlin/shared';

interface GoalStackProps {
  goals: DecomposedGoal[];
  accentColor: string;
  onDecompose: (intent: string) => Promise<void>;
  onToggleGoal: (id: string, completed?: boolean, isActive?: boolean) => void;
  onDeleteGoal: (id: string) => void;
  onAddGoal: (title: string, category: string) => void;
}

export const GoalStack: React.FC<GoalStackProps> = ({
  goals,
  accentColor,
  onDecompose,
  onToggleGoal,
  onDeleteGoal,
  onAddGoal,
}) => {
  const [manualTitle, setManualTitle] = useState('');
  const [showAddManual, setShowAddManual] = useState(false);

  const handleManualAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualTitle.trim()) return;
    onAddGoal(manualTitle.trim(), 'task');
    setManualTitle('');
    setShowAddManual(false);
  };

  const activeGoals = goals.filter((g) => !g.completed);
  const completedGoals = goals.filter((g) => g.completed);

  return (
    <div className="flex flex-col h-full bg-white border-2 border-coal shadow-brut-sm p-2">
      <div className="flex items-center justify-between pb-2 border-b-2 border-dashed border-line mb-2">
        <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-paper-muted">
          Milestones · {activeGoals.length}
        </span>
        <button
          type="button"
          onClick={() => setShowAddManual(!showAddManual)}
          className="font-mono text-[10px] font-bold text-white px-1.5 py-0.5 border-2 border-coal cursor-pointer transition-all hover:-translate-y-px hover:shadow-[2px_2px_0_0_#12151A] active:translate-y-0 active:shadow-none"
          style={{ backgroundColor: accentColor }}
        >
          {showAddManual ? '✕' : '+ ADD'}
        </button>
      </div>

      {showAddManual && (
        <form onSubmit={handleManualAdd} className="flex gap-1.5 mb-2">
          <input
            type="text"
            className="flex-1 min-w-0 bg-paper border-2 border-coal p-1.5 text-paper-ink font-mono text-xs placeholder:text-paper-faint focus:outline-none focus:shadow-brut-sm transition-shadow"
            placeholder="New milestone…"
            value={manualTitle}
            onChange={(e) => setManualTitle(e.target.value)}
            autoFocus
          />
          <button
            type="submit"
            className="text-white font-display font-bold px-3 border-2 border-coal shadow-[2px_2px_0_0_#12151A] text-xs transition-all hover:-translate-y-px hover:shadow-[3px_3px_0_0_#12151A] active:translate-y-0 active:shadow-none cursor-pointer"
            style={{ backgroundColor: accentColor }}
          >
            ADD
          </button>
        </form>
      )}

      {goals.length === 0 ? (
        <div className="py-6 text-center text-xs text-paper-faint font-mono font-bold flex-1 flex items-center justify-center border-2 border-dashed border-line">
          Nothing yet
        </div>
      ) : (
        <div className="space-y-1 overflow-y-auto flex-1 pr-1">
          {activeGoals.map((g) => (
            <div
              key={g.id}
              className={`p-1.5 flex items-center justify-between gap-2 transition-colors group ${g.isActive ? 'border-transparent' : 'hover:bg-paper'}`}
              style={g.isActive ? { backgroundColor: accentColor } : {}}
            >
              <div
                className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer"
                onClick={() => onToggleGoal(g.id, true)}
              >
                <div className={`w-4 h-4 shrink-0 border-2 ${g.isActive ? 'border-white' : 'border-paper-muted group-hover:border-coal'}`} />
                <span className={`text-xs font-mono font-bold block truncate ${g.isActive ? 'text-white' : 'text-paper-ink'}`}>
                  {g.title}
                </span>
              </div>
              <button
                className={`opacity-0 group-hover:opacity-100 transition-all cursor-pointer ${g.isActive ? 'text-white/85 hover:text-white' : 'text-paper-faint hover:text-red-600'}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteGoal(g.id);
                }}
                title="Delete"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}

          {completedGoals.map((g) => (
            <div
              key={g.id}
              className="p-1.5 flex items-center justify-between gap-2 opacity-55 transition-opacity hover:opacity-100 group"
            >
              <div
                className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer"
                onClick={() => onToggleGoal(g.id, false)}
              >
                <CheckCircle2 size={15} className="shrink-0" style={{ color: accentColor }} />
                <span className="text-xs text-paper-muted font-mono font-bold line-through block truncate">
                  {g.title}
                </span>
              </div>
              <button
                className="opacity-0 group-hover:opacity-100 text-paper-faint hover:text-red-600 transition-colors cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteGoal(g.id);
                }}
                title="Delete"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
