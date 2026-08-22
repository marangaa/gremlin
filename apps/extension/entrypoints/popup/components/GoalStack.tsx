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
    <div className="flex flex-col h-full bg-surface p-2">
      {/* Header with Add Milestone toggle */}
      <div className="flex items-center justify-between pb-2 border-b border-line mb-2">
        <span className="font-display font-semibold text-xs text-ink">
          Milestones ({activeGoals.length})
        </span>
        <button
          type="button"
          onClick={() => setShowAddManual(!showAddManual)}
          className="font-mono text-[10px] font-bold text-white px-2 py-0.5 cursor-pointer hover:opacity-90 transition-opacity"
          style={{ backgroundColor: accentColor }}
        >
          {showAddManual ? 'Cancel' : '+ Add'}
        </button>
      </div>

      {/* Manual Quick Add Form */}
      {showAddManual && (
        <form onSubmit={handleManualAdd} className="flex gap-2 mb-2">
          <input
            type="text"
            className="flex-1 bg-base border border-line-bright p-2 text-ink font-mono text-xs placeholder:text-ink-faint focus:outline-none focus:bg-surface transition-colors"
            placeholder="e.g. Write unit tests..."
            value={manualTitle}
            onChange={(e) => setManualTitle(e.target.value)}
            autoFocus
          />
          <button type="submit" className="text-white font-display font-semibold px-3 text-xs hover:opacity-90 transition-opacity cursor-pointer" style={{ backgroundColor: accentColor }}>
            Add
          </button>
        </form>
      )}

      {/* Goal Items Checklist */}
      {goals.length === 0 ? (
        <div className="py-6 text-center text-xs text-ink-muted font-mono font-bold flex-1 flex items-center justify-center">
          No sub-goals yet.
        </div>
      ) : (
        <div className="space-y-1.5 overflow-y-auto flex-1 pr-1">
          {/* Active Goals */}
          {activeGoals.map((g) => (
            <div
              key={g.id}
              className={`p-2 border flex items-center justify-between gap-2 transition-colors group ${ g.isActive ? 'border-transparent text-white' : 'border-transparent bg-surface hover:bg-base' } `}
              style={g.isActive ? { backgroundColor: accentColor } : {}}
            >
              <div
                className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer"
                onClick={() => onToggleGoal(g.id, true)}
              >
                <div className={`w-4 h-4 border border-current transition-colors shrink-0 ${g.isActive ? 'bg-surface' : 'bg-transparent group-hover:bg-surface-raised'} `} />
                <div className="flex-1 min-w-0">
                  <span className={`text-xs font-mono font-bold block truncate ${g.isActive ? 'text-white' : 'text-ink'}`}>
                    {g.title}
                  </span>
                </div>
              </div>
              <button
                className={`opacity-0 group-hover:opacity-100 hover:text-ink transition-all cursor-pointer ${g.isActive ? 'text-white/80' : 'text-ink-faint'}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteGoal(g.id);
                }}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}

          {/* Completed Goals */}
          {completedGoals.map((g) => (
            <div
              key={g.id}
              className="p-2 flex items-center justify-between gap-2 opacity-50 transition-opacity hover:opacity-100 group border-b border-line"
            >
              <div
                className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer"
                onClick={() => onToggleGoal(g.id, false)}
              >
                <CheckCircle2 size={16} className="text-ink shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-xs text-ink-muted font-mono font-bold line-through block truncate">
                    {g.title}
                  </span>
                </div>
              </div>
              <button
                className="opacity-0 group-hover:opacity-100 text-ink-faint hover:text-black transition-colors cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteGoal(g.id);
                }}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
