import React, { useState } from 'react';
import {
  Trash2,
  Plus,
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
    <div className="flex flex-col min-h-0 flex-1">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-paper-muted">
          Milestones{activeGoals.length > 0 ? ` · ${activeGoals.length}` : ''}
        </span>
        <button
          type="button"
          onClick={() => setShowAddManual(!showAddManual)}
          className="font-mono text-[10px] font-bold uppercase tracking-wider flex items-center gap-0.5 transition-opacity hover:opacity-75 cursor-pointer"
          style={{ color: accentColor }}
        >
          {showAddManual ? <span aria-hidden="true">✕</span> : <Plus size={11} />}
          <span>{showAddManual ? 'Cancel' : 'Add'}</span>
        </button>
      </div>

      {showAddManual && (
        <form onSubmit={handleManualAdd} className="mt-2">
          <input
            type="text"
            className="w-full bg-transparent border-0 border-b-2 pb-1 font-mono text-xs text-paper-ink placeholder:text-paper-faint focus:outline-none"
            style={{ borderColor: accentColor }}
            placeholder="New milestone…"
            value={manualTitle}
            onChange={(e) => setManualTitle(e.target.value)}
            autoFocus
          />
        </form>
      )}

      {goals.length === 0 && !showAddManual ? (
        <p className="py-4 text-center font-mono text-[10px] font-bold uppercase tracking-wider text-paper-faint">
          Nothing yet
        </p>
      ) : (
        <div className="mt-1 space-y-px overflow-y-auto flex-1 min-h-0 pr-0.5">
          {activeGoals.map((g) => (
            <div
              key={g.id}
              className={`group flex items-center gap-2 px-1.5 py-1.5 -mx-1.5 transition-colors ${g.isActive ? '' : 'hover:bg-black/[0.04]'}`}
              style={g.isActive ? { backgroundColor: `${accentColor}1A` } : {}}
            >
              <button
                type="button"
                onClick={() => onToggleGoal(g.id, true)}
                className="shrink-0 cursor-pointer"
                title="Complete"
              >
                <span
                  className={`block w-3.5 h-3.5 border-2 transition-colors ${g.isActive ? '' : 'border-paper-faint group-hover:border-coal'}`}
                  style={g.isActive ? { backgroundColor: accentColor, borderColor: accentColor } : {}}
                />
              </button>
              <span
                className={`flex-1 min-w-0 truncate font-mono text-xs font-bold cursor-pointer ${g.isActive ? 'text-paper-ink' : 'text-paper-muted'}`}
                onClick={() => onToggleGoal(g.id, true)}
              >
                {g.title}
              </span>
              <button
                type="button"
                className="opacity-0 group-hover:opacity-100 text-paper-faint hover:text-red-600 transition-all cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteGoal(g.id);
                }}
                title="Delete"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}

          {completedGoals.map((g) => (
            <div
              key={g.id}
              className="group flex items-center gap-2 px-1.5 py-1 -mx-1.5 opacity-50 hover:opacity-100 transition-opacity"
            >
              <button type="button" onClick={() => onToggleGoal(g.id, false)} className="shrink-0 cursor-pointer" title="Reopen">
                <CheckCircleIcon color={accentColor} />
              </button>
              <span
                className="flex-1 min-w-0 truncate font-mono text-xs font-bold line-through text-paper-faint cursor-pointer"
                onClick={() => onToggleGoal(g.id, false)}
              >
                {g.title}
              </span>
              <button
                type="button"
                className="opacity-0 group-hover:opacity-100 text-paper-faint hover:text-red-600 transition-all cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteGoal(g.id);
                }}
                title="Delete"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const CheckCircleIcon: React.FC<{ color: string }> = ({ color }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <path d="m9 11 3 3L22 4" />
  </svg>
);
