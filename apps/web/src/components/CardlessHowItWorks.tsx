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
      <div className="flex items-center justify-start gap-3 pb-6 overflow-x-auto">
        {STEPS.map((s, idx) => {
          const isActive = activeStep === idx;
          return (
            <button
              key={s.num}
              onClick={() => setActiveStep(idx)}
              className={`flex items-center gap-2 px-3 py-2 border-2 font-mono text-xs font-bold transition-all cursor-pointer shrink-0 ${
                isActive
                  ? 'bg-accent border-coal shadow-brut-sm -translate-y-0.5 text-coal font-bold'
                  : 'bg-white border-paper-line text-paper-muted hover:border-coal hover:text-coal'
              }`}
            >
              <span className={`px-2 py-0.5 ${isActive ? 'bg-coal text-accent' : 'bg-paper border border-paper-line text-paper-muted'}`}>
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
            <span className="font-mono text-xs font-bold tracking-widest text-[#4D7C0F] flex items-center gap-2">
              <span className="w-2 h-2 bg-accent border border-coal animate-pulse-dot" />
              {STEPS[activeStep]!.tag}
            </span>
            <h3 className="font-display text-3xl sm:text-5xl font-bold tracking-tight text-coal">
              {STEPS[activeStep]!.headline}
            </h3>
          </div>

          <p className="text-base sm:text-lg text-paper-muted leading-relaxed max-w-xl">
            {STEPS[activeStep]!.description}
          </p>

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={() => setActiveStep((prev) => (prev + 1) % 3)}
              className="inline-flex items-center gap-2 px-4 py-2 border-2 border-coal bg-white font-mono text-xs font-bold shadow-brut-sm transition-all hover:-translate-y-0.5 hover:shadow-brut cursor-pointer"
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
                <span className="font-mono text-xs text-paper-faint tracking-wider block">
                  Click a real-world focus intent:
                </span>
                <div className="flex flex-wrap gap-2">
                  {GOAL_OPTIONS.map((opt) => (
                    <button
                      key={opt.label}
                      onClick={() => setSelectedGoal(opt.goal)}
                      className={`px-3.5 py-1.5 font-mono text-xs transition-all cursor-pointer ${
                        selectedGoal === opt.goal
                          ? 'bg-accent border-2 border-coal text-coal font-bold shadow-brut-sm'
                          : 'bg-white border-2 border-paper-line text-paper-muted hover:border-coal hover:text-coal'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-paper-line space-y-2">
                <div className="font-mono text-xs text-[#4D7C0F] flex items-center gap-1.5">
                  <Target className="w-4 h-4" />
                  Companion Goal Registered:
                </div>
                <div className="font-display text-xl font-bold text-coal">
                  “{selectedGoal}”
                </div>
              </div>
            </div>
          )}

          {/* Step 2 Interactive: Verified Research Feeds */}
          {activeStep === 1 && (
            <div className="space-y-3 animate-fade-in">
              <div className="font-mono text-xs text-paper-faint tracking-wider">
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
                  className="flex items-center justify-between gap-3 p-3 bg-white border-2 border-coal shadow-brut-sm font-mono text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Check className="w-4 h-4 text-[#65A30D] shrink-0" />
                    <span className="text-coal truncate">{item.site}</span>
                  </div>
                  <span className="text-[11px] text-[#65A30D] shrink-0 hidden sm:inline">
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Step 3 Interactive: Live Roast Preview */}
          {activeStep === 2 && (
            <div className="space-y-4 animate-fade-in">
              <div className="font-mono text-xs text-paper-faint tracking-wider">
                Pick companion to test wake-up roast:
              </div>

              <div className="flex gap-2">
                {(['kuro', 'Sarge', 'sherlock', 'waifu', 'sensei'] as CompanionId[]).map((id) => (
                  <button
                    key={id}
                    onClick={() => setActiveRoastCompanion(id)}
                    className={`p-2 border-2 transition-all cursor-pointer ${
                      activeRoastCompanion === id
                        ? 'border-coal bg-accent shadow-brut-sm -translate-y-0.5'
                        : 'border-paper-line bg-white hover:border-coal'
                    }`}
                  >
                    <Sprite id={id} size={28} />
                  </button>
                ))}
              </div>

              {/* Floating Speech Cloud */}
              <div className="relative p-4 bg-white border-2 border-coal space-y-2 shadow-brut">
                <div className="flex items-center gap-2 font-mono text-xs text-[#4D7C0F] font-bold">
                  <MessageSquareQuote className="w-3.5 h-3.5" />
                  Wake-Up Remark:
                </div>
                <p className="font-mono text-sm text-coal italic leading-relaxed m-0">
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
