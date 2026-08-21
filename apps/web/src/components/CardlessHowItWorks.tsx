import React, { useState } from 'react';
import { Target, MessageSquareQuote, Check } from 'lucide-react';
import { Sprite } from './Sprite';
import { type CompanionId } from '../lib/companions';

interface StepData {
  num: string;
  tag: string;
  headline: string;
  description: string;
  interactiveType: 'goals' | 'sources' | 'roast';
}

const STEPS: StepData[] = [
  {
    num: '01',
    tag: 'Phase 01 · Intention',
    headline: 'Declare your finish line.',
    description:
      'Tell your companion what you want to accomplish in plain English. No complicated regex rules, no site blacklists to configure—just a clear goal.',
    interactiveType: 'goals',
  },
  {
    num: '02',
    tag: 'Phase 02 · Exploration',
    headline: 'Research & browse freely.',
    description:
      'Read Wikipedia, check Reddit source discussions, and watch educational tutorials without getting shut down by frustrating block walls.',
    interactiveType: 'sources',
  },
  {
    num: '03',
    tag: 'Phase 03 · Accountability',
    headline: 'Get roasted back on track.',
    description:
      'If you slide into a 20-minute mindless scrolling spiral, your companion steps in with a witty wake-up call to protect your focus.',
    interactiveType: 'roast',
  },
];

export const CardlessHowItWorks: React.FC = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [selectedGoal, setSelectedGoal] = useState('Finish Roman History Essay by 5 PM');
  const [activeRoastCompanion, setActiveRoastCompanion] = useState<CompanionId>('kuro');

  const GOAL_OPTIONS = [
    { label: 'History Essay', goal: 'Finish Roman Architecture Essay by 5 PM' },
    { label: 'Spanish Practice', goal: 'Practice 30 mins conversational Spanish' },
    { label: 'Pitch Deck', goal: 'Draft quarterly product presentation slides' },
  ];

  const ROAST_OPTIONS: Record<CompanionId, string> = {
    kuro: '“Bro you were studying Roman concrete, why are we looking at kittens?! 💀 Back to Caesar!”',
    Sarge: '“That essay will not write itself. Hands on keyboard. Move!”',
    sherlock: '“A curious detour into kitten reels, Watson. The crime scene remains unsolved.”',
    waifu: '“Anata, why are we looking at memes? Stay focused for me, okay? 💕”',
    sensei: '“Breathe. Close the distraction feed. Return your mind to your goal.”',
  };

  return (
    <div className="space-y-16 sm:space-y-24">
      {/* Step Navigation Runway */}
      <div className="flex items-center justify-between sm:justify-start gap-4 sm:gap-8 pb-4 border-b border-line/40 overflow-x-auto">
        {STEPS.map((s, idx) => {
          const isActive = activeStep === idx;
          return (
            <button
              key={s.num}
              onClick={() => setActiveStep(idx)}
              className={`flex items-center gap-3 pb-3 border-b-2 font-mono text-xs transition-all cursor-pointer shrink-0 ${
                isActive
                  ? 'border-accent text-accent font-bold scale-105'
                  : 'border-transparent text-ink-muted hover:text-ink hover:border-line-bright'
              }`}
            >
              <span className={`px-2 py-0.5 rounded-md ${isActive ? 'bg-accent/15 text-accent' : 'bg-surface text-ink-faint'}`}>
                {s.num}
              </span>
              <span className="font-display font-semibold sm:text-sm">
                {s.headline.split('.')[0]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Active Step Spatial Stage (Cardless Showcase) */}
      <div className="grid lg:grid-cols-[1.1fr,0.9fr] gap-12 sm:gap-16 items-center">
        {/* Left: Unboxed Editorial Typography */}
        <div className="space-y-6">
          <div className="space-y-2">
            <span className="font-mono text-xs font-bold uppercase tracking-widest text-accent flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse-dot" />
              {STEPS[activeStep]!.tag}
            </span>
            <h3 className="font-display text-3xl sm:text-5xl font-bold tracking-tight text-ink">
              {STEPS[activeStep]!.headline}
            </h3>
          </div>

          <p className="text-base sm:text-lg text-ink-muted leading-relaxed max-w-xl">
            {STEPS[activeStep]!.description}
          </p>

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={() => setActiveStep((prev) => (prev + 1) % 3)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-line bg-surface hover:bg-surface-raised font-mono text-xs text-ink transition-colors cursor-pointer"
            >
              Next Step: {STEPS[(activeStep + 1) % 3]!.num} →
            </button>
          </div>
        </div>

        {/* Right: Floating Interactive Micro-Widget */}
        <div className="relative">
          {/* Step 1 Interactive: Live Goal Intention Picker */}
          {activeStep === 0 && (
            <div className="space-y-4 animate-fade-in">
              <div className="space-y-2">
                <span className="font-mono text-xs text-ink-faint uppercase tracking-wider block">
                  Click a real-world focus intent:
                </span>
                <div className="flex flex-wrap gap-2">
                  {GOAL_OPTIONS.map((opt) => (
                    <button
                      key={opt.label}
                      onClick={() => setSelectedGoal(opt.goal)}
                      className={`px-3.5 py-1.5 rounded-full font-mono text-xs transition-all cursor-pointer ${
                        selectedGoal === opt.goal
                          ? 'bg-accent text-base-deep font-bold shadow-glow'
                          : 'bg-surface/60 text-ink-muted border border-line hover:border-line-bright hover:text-ink'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-line/40 space-y-2">
                <div className="font-mono text-xs text-accent flex items-center gap-1.5">
                  <Target className="w-4 h-4" />
                  Companion Goal Registered:
                </div>
                <div className="font-display text-xl font-bold text-ink">
                  “{selectedGoal}”
                </div>
              </div>
            </div>
          )}

          {/* Step 2 Interactive: Verified Research Feeds */}
          {activeStep === 1 && (
            <div className="space-y-3 animate-fade-in">
              <div className="font-mono text-xs text-ink-faint uppercase tracking-wider">
                Live Topic Recognition Stream:
              </div>

              {[
                {
                  site: 'en.wikipedia.org/wiki/Roman_Colosseum',
                  type: 'Encyclopedia',
                  status: 'Allowed · Relevant Research',
                },
                {
                  site: 'reddit.com/r/AskHistorians/caesar_concrete',
                  type: 'Academic Thread',
                  status: 'Allowed · Source Citation',
                },
                {
                  site: 'youtube.com/watch?v=madrid_tapas_guide',
                  type: 'Audio Lesson',
                  status: 'Allowed · Language Immersion',
                },
              ].map((item, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-surface/50 border border-line/60 font-mono text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Check className="w-4 h-4 text-accent shrink-0" />
                    <span className="text-ink truncate">{item.site}</span>
                  </div>
                  <span className="text-[11px] text-accent shrink-0 hidden sm:inline">
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Step 3 Interactive: Live Roast Preview */}
          {activeStep === 2 && (
            <div className="space-y-4 animate-fade-in">
              <div className="font-mono text-xs text-ink-faint uppercase tracking-wider">
                Pick companion to test wake-up roast:
              </div>

              <div className="flex gap-2">
                {(['kuro', 'Sarge', 'sherlock', 'waifu', 'sensei'] as CompanionId[]).map((id) => (
                  <button
                    key={id}
                    onClick={() => setActiveRoastCompanion(id)}
                    className={`p-2 rounded-xl border transition-all cursor-pointer ${
                      activeRoastCompanion === id
                        ? 'border-accent/40 bg-accent/15 scale-105'
                        : 'border-line bg-surface/50 hover:bg-surface'
                    }`}
                  >
                    <Sprite id={id} size={28} />
                  </button>
                ))}
              </div>

              {/* Floating Speech Cloud */}
              <div className="p-4 rounded-2xl bg-surface/80 border border-line-bright space-y-2 shadow-lift">
                <div className="flex items-center gap-2 font-mono text-xs text-accent font-bold uppercase">
                  <MessageSquareQuote className="w-3.5 h-3.5" />
                  Wake-Up Remark:
                </div>
                <p className="font-mono text-sm text-ink italic leading-relaxed m-0">
                  {ROAST_OPTIONS[activeRoastCompanion]}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
