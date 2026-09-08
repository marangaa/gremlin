import React, { useState } from 'react';
import { Target, MessageSquareQuote, ArrowDown, Volume2 } from 'lucide-react';
import { Sprite } from './Sprite';
import { COMPANIONS, type CompanionId, playCharacterVoice } from '../lib/companions';
import { Reveal } from './Reveal';

export const CardlessHowItWorks: React.FC = () => {
  // Step 1 interactive state
  const [selectedGoal, setSelectedGoal] = useState('Research Roman architecture & concrete');
  const [customGoal, setCustomGoal] = useState('');
  const [isEditingCustom, setIsEditingCustom] = useState(false);

  const GOAL_OPTIONS = [
    { label: 'Roman architecture', goal: 'Research Roman architecture & concrete' },
    { label: 'Debug payment webhook', goal: 'Fix Stripe subscription webhook timeouts' },
    { label: 'Q3 pitch deck', goal: 'Draft 10-slide quarterly product roadmap' },
  ];

  // Step 3 interactive state
  const [activeRoastCompanion, setActiveRoastCompanion] = useState<CompanionId>('kuro');

  const ROAST_OPTIONS: Record<CompanionId, string> = {
    kuro: '“Bro you were studying Roman concrete, why are we looking at Reddit?! 💀 Back to Caesar!”',
    Sarge: '“That essay will not write itself. Put the phone down. Hands on keyboard. Move!”',
    sherlock: '“We were researching architecture ten minutes ago. Now we are watching cats. Curious.”',
    waifu: '“Are we really looking at memes right now? Do it for me, close the tab 💕”',
    sensei: '“The mind wanders to the algorithm’s feed. Let us gently close the tab.”',
    byte: '> intrusion detected: reddit.com. terminating thread. back to root.',
    pixel: 'mrrp. caught you looking at nonsense. *bats cursor off desk*',
    ufo: 'specimen attention span: failing. beaming up distraction.',
  };

  const handleSelectCompanion = (id: CompanionId) => {
    setActiveRoastCompanion(id);
    playCharacterVoice(id);
  };

  return (
    <div className="relative space-y-12 sm:space-y-16 py-4">

      {/* ======================================================== */}
      {/* ROW 1: CARD ON LEFT, EXPLAINER ON RIGHT                  */}
      {/* ======================================================== */}
      <Reveal>
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-14 items-center">
          {/* Card: Goal Intention */}
          <div className="order-1 bg-white dark:bg-[#161914] border-2 border-coal dark:border-[#384333] p-6 sm:p-7 shadow-brut dark:shadow-[4px_4px_0_0_#000000]">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 mb-5 border-b-2 border-coal dark:border-[#384333]">
              <span className="font-mono text-xs font-bold tracking-tight flex items-center gap-2 text-coal dark:text-white">
                <span className="w-2.5 h-2.5 bg-accent border border-coal dark:border-white animate-pulse-dot" />
                Step 1 · Declare your intent
              </span>
            </div>

            <div className="space-y-4">
              <div>
                <span className="font-mono text-xs text-[#2A3240] dark:text-[#D1D5DB] block mb-2 font-bold">
                  Pick a focus target or type your own:
                </span>
                <div className="flex flex-wrap gap-2">
                  {GOAL_OPTIONS.map((opt) => {
                    const isSelected = selectedGoal === opt.goal && !isEditingCustom;
                    return (
                      <button
                        key={opt.label}
                        onClick={() => {
                          setSelectedGoal(opt.goal);
                          setIsEditingCustom(false);
                        }}
                        className={`px-3 py-1.5 font-mono text-xs transition-all cursor-pointer border-2 ${
                          isSelected
                            ? 'bg-accent border-coal text-coal font-bold shadow-[2px_2px_0_0_#12151A] -translate-y-0.5'
                            : 'bg-paper dark:bg-[#20261C] border-coal text-coal dark:text-white font-medium hover:bg-accent/40'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setIsEditingCustom(true)}
                    className={`px-3 py-1.5 font-mono text-xs transition-all cursor-pointer border-2 ${
                      isEditingCustom
                        ? 'bg-accent border-coal text-coal font-bold shadow-[2px_2px_0_0_#12151A] -translate-y-0.5'
                        : 'bg-paper dark:bg-[#20261C] border-coal text-coal dark:text-white font-medium hover:bg-accent/40'
                    }`}
                  >
                    + Custom
                  </button>
                </div>
              </div>

              {isEditingCustom && (
                <div className="flex gap-2 animate-fade-in">
                  <input
                    type="text"
                    value={customGoal}
                    onChange={(e) => setCustomGoal(e.target.value)}
                    placeholder="e.g. Draft quarterly presentation slides"
                    className="flex-1 px-3 py-2 text-xs font-mono bg-paper dark:bg-[#0E100D] border-2 border-coal text-coal dark:text-white placeholder:text-[#6B7280] focus:outline-none focus:border-accent"
                  />
                  <button
                    onClick={() => {
                      if (customGoal.trim()) {
                        setSelectedGoal(customGoal.trim());
                        setIsEditingCustom(false);
                      }
                    }}
                    className="px-4 py-2 bg-coal text-white dark:bg-accent dark:text-coal font-mono text-xs font-bold border-2 border-coal cursor-pointer shadow-[2px_2px_0_0_#12151A]"
                  >
                    Set
                  </button>
                </div>
              )}

              {/* Registered Target Display (Flat, unboxed) */}
              <div className="pt-4 border-t-2 border-coal dark:border-[#384333] space-y-2">
                <div className="font-mono text-xs text-[#3F6212] dark:text-accent font-bold flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Target className="w-4 h-4" />
                    Current focus:
                  </span>
                  <span className="px-2 py-0.5 bg-accent text-coal text-[10px] font-bold border border-coal">
                    active
                  </span>
                </div>
                <div className="font-display text-xl sm:text-2xl font-extrabold text-coal dark:text-white leading-snug">
                  “{selectedGoal}”
                </div>
                <div className="font-mono text-[11px] text-[#374151] dark:text-[#9CA3AF] flex items-center gap-2 pt-1">
                  <span className="w-2 h-2 bg-accent rounded-full border border-coal inline-block shrink-0" />
                  <span>Gremlin watches screen context. Off-task spirals trigger wake-ups.</span>
                </div>
              </div>
            </div>
          </div>

          {/* Explainer: Step 1 */}
          <div className="order-2 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-yellow-400 text-coal border-2 border-coal font-mono text-xs font-bold shadow-[2px_2px_0_0_#12151A]">
              <span>Phase 01</span>
              <span>·</span>
              <span>Intention over blacklists</span>
            </div>
            <h3 className="font-display text-2xl sm:text-4xl font-extrabold tracking-tight text-coal dark:text-white">
              Declare what "done" looks like.
            </h3>
            <p className="text-base text-[#374151] dark:text-[#D1D5DB] leading-relaxed font-medium">
              Forget setting up forty domain rules or fragile regex filters. Just tell Gremlin what you're trying to get done in plain English. That single goal becomes your compass.
            </p>
            <div className="pt-2 font-mono text-xs text-coal dark:text-white font-bold">
              <div className="flex items-center gap-2.5">
                <span className="w-5 h-5 bg-coal text-accent dark:bg-accent dark:text-coal border border-coal flex items-center justify-center text-[11px] font-extrabold shrink-0 shadow-[1px_1px_0_0_#12151A]">
                  ✓
                </span>
                <span>Zero blacklists to maintain</span>
              </div>
            </div>
          </div>
        </div>
      </Reveal>

      {/* ======================================================== */}
      {/* SVG CONNECTOR 1: SWOOP FROM CARD 1 (LEFT) TO CARD 2 (RIGHT) */}
      {/* ======================================================== */}
      <div className="hidden lg:block relative h-20 my-[-10px] pointer-events-none" aria-hidden="true">
        <svg
          className="w-full h-full overflow-visible"
          viewBox="0 0 1000 80"
          fill="none"
          preserveAspectRatio="none"
        >
          <defs>
            <marker
              id="arrow-head-1"
              viewBox="0 0 10 10"
              refX="6"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto"
            >
              <path d="M 0 1 L 9 5 L 0 9 z" className="fill-coal dark:fill-accent" />
            </marker>
          </defs>
          <path
            d="M 260 0 C 260 75, 740 5, 740 70"
            className="stroke-coal dark:stroke-accent animate-dash-flow"
            strokeWidth="3"
            strokeDasharray="8 6"
            markerEnd="url(#arrow-head-1)"
          />
        </svg>
      </div>

      {/* Mobile Downward Arrow Connector */}
      <div className="lg:hidden flex items-center justify-center my-2">
        <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-coal dark:text-white bg-paper dark:bg-[#161914] px-3.5 py-1.5 border-2 border-coal shadow-[2px_2px_0_0_#12151A]">
          <ArrowDown className="w-4 h-4 text-accent animate-bounce" />
          <span>Next step</span>
        </div>
      </div>

      {/* ======================================================== */}
      {/* ROW 2: EXPLAINER ON LEFT, CARD ON RIGHT                  */}
      {/* ======================================================== */}
      <Reveal>
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-14 items-center">
          {/* Explainer: Step 2 */}
          <div className="order-2 lg:order-1 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-accent text-coal border-2 border-coal font-mono text-xs font-bold shadow-[2px_2px_0_0_#12151A]">
              <span>Phase 02</span>
              <span>·</span>
              <span>Contextual Browsing</span>
            </div>
            <h3 className="font-display text-2xl sm:text-4xl font-extrabold tracking-tight text-coal dark:text-white">
              Research without dumb brick walls.
            </h3>
            <p className="text-base text-[#374151] dark:text-[#D1D5DB] leading-relaxed font-medium">
              Real work requires Reddit threads, video walk-throughs, and documentation. Traditional blockers treat them like contraband. Gremlin reads the actual page narrative—so legitimate research is never interrupted.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 font-mono text-xs text-coal dark:text-white font-bold">
              <div className="flex items-center gap-2.5">
                <span className="w-5 h-5 bg-coal text-accent dark:bg-accent dark:text-coal border border-coal flex items-center justify-center text-[11px] font-extrabold shrink-0 shadow-[1px_1px_0_0_#12151A]">
                  ✓
                </span>
                <span>Distinguishes study from doomscrolling</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="w-5 h-5 bg-coal text-accent dark:bg-accent dark:text-coal border border-coal flex items-center justify-center text-[11px] font-extrabold shrink-0 shadow-[1px_1px_0_0_#12151A]">
                  ✓
                </span>
                <span>Reddit & YouTube research stays open</span>
              </div>
            </div>
          </div>

          {/* Card: Research Streams Scanner */}
          <div className="order-1 lg:order-2 bg-white dark:bg-[#161914] border-2 border-coal dark:border-[#384333] p-6 sm:p-7 shadow-brut dark:shadow-[4px_4px_0_0_#000000]">
            <div className="flex items-center justify-between pb-3 mb-5 border-b-2 border-coal dark:border-[#384333]">
              <span className="font-mono text-xs font-bold tracking-tight flex items-center gap-2 text-coal dark:text-white">
                <span className="w-2.5 h-2.5 bg-[#6FE3F0] border border-coal dark:border-white animate-pulse" />
                Step 2 · Tab inspector
              </span>
              <span className="font-mono text-[11px] font-bold px-2.5 py-0.5 bg-[#6FE3F0] text-coal border border-coal shadow-[1px_1px_0_0_#12151A]">
                active
              </span>
            </div>

            <div className="divide-y-2 divide-coal/10 dark:divide-[#262E22]">
              {[
                { domain: 'wikipedia.org', label: 'Relevant research', allowed: true },
                { domain: 'reddit.com/r/AskHistorians', label: 'Source citation', allowed: true },
                { domain: 'youtube.com/shorts', label: 'Doomscroll detected', allowed: false },
              ].map((item, i) => (
                <div key={i} className="py-3 flex items-center justify-between gap-4 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`w-2 h-2 shrink-0 border border-coal ${item.allowed ? 'bg-accent' : 'bg-[#FB7185]'}`}
                    />
                    <span className="font-mono text-xs font-bold text-coal dark:text-white truncate">
                      {item.domain}
                    </span>
                  </div>
                  <span
                    className={`font-mono text-[10px] font-bold px-2 py-0.5 border shrink-0 ${
                      item.allowed
                        ? 'bg-accent/20 text-[#15803D] dark:text-accent border-[#15803D] dark:border-accent'
                        : 'bg-[#FB7185]/20 text-[#E11D48] dark:text-[#FB7185] border-[#E11D48] dark:border-[#FB7185]'
                    }`}
                  >
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </Reveal>

      {/* ======================================================== */}
      {/* SVG CONNECTOR 2: SWOOP FROM CARD 2 (RIGHT) TO CARD 3 (LEFT) */}
      {/* ======================================================== */}
      <div className="hidden lg:block relative h-20 my-[-10px] pointer-events-none" aria-hidden="true">
        <svg
          className="w-full h-full overflow-visible"
          viewBox="0 0 1000 80"
          fill="none"
          preserveAspectRatio="none"
        >
          <defs>
            <marker
              id="arrow-head-2"
              viewBox="0 0 10 10"
              refX="6"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto"
            >
              <path d="M 0 1 L 9 5 L 0 9 z" className="fill-coal dark:fill-accent" />
            </marker>
          </defs>
          <path
            d="M 740 0 C 740 75, 260 5, 260 70"
            className="stroke-coal dark:stroke-accent animate-dash-flow"
            strokeWidth="3"
            strokeDasharray="8 6"
            markerEnd="url(#arrow-head-2)"
          />
        </svg>
      </div>

      {/* Mobile Downward Arrow Connector */}
      <div className="lg:hidden flex items-center justify-center my-2">
        <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-coal dark:text-white bg-paper dark:bg-[#161914] px-3.5 py-1.5 border-2 border-coal shadow-[2px_2px_0_0_#12151A]">
          <ArrowDown className="w-4 h-4 text-accent animate-bounce" />
          <span>Next step</span>
        </div>
      </div>

      {/* ======================================================== */}
      {/* ROW 3: CARD ON LEFT, EXPLAINER ON RIGHT                  */}
      {/* ======================================================== */}
      <Reveal>
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-14 items-center">
          {/* Card: Wake-up Roast Preview */}
          <div className="order-1 bg-white dark:bg-[#161914] border-2 border-coal dark:border-[#384333] p-6 sm:p-7 shadow-brut dark:shadow-[4px_4px_0_0_#000000]">
            <div className="flex items-center justify-between pb-3 mb-5 border-b-2 border-coal dark:border-[#384333]">
              <span className="font-mono text-xs font-bold tracking-tight flex items-center gap-2 text-coal dark:text-white">
                <span className="w-2.5 h-2.5 bg-[#FF7EB0] border border-coal dark:border-white animate-pulse" />
                Step 3 · Point-of-drift intervention
              </span>
              <span className="font-mono text-[11px] font-bold px-2.5 py-0.5 bg-[#FF7EB0] text-coal border border-coal shadow-[1px_1px_0_0_#12151A]">
                wake-up roast
              </span>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-[#2A3240] dark:text-[#D1D5DB] font-bold">
                  Pick companion to test tone:
                </span>
                <span className="font-mono text-[11px] text-coal dark:text-white font-bold flex items-center gap-1">
                  <Volume2 className="w-3.5 h-3.5 text-[#65A30D] dark:text-accent" />
                  audio enabled
                </span>
              </div>

              {/* Character switcher strip */}
              <div className="flex gap-2 pb-1 overflow-x-auto">
                {COMPANIONS.map((c) => {
                  const isSelected = activeRoastCompanion === c.id;
                  return (
                    <button
                      key={c.id}
                      onClick={() => handleSelectCompanion(c.id)}
                      className={`p-2 border-2 transition-all cursor-pointer flex flex-col items-center gap-1 shrink-0 ${
                        isSelected
                          ? 'border-coal shadow-[2px_2px_0_0_#12151A] -translate-y-0.5'
                          : 'border-coal/60 dark:border-[#384333] bg-paper dark:bg-[#20261C] hover:border-coal'
                      }`}
                      style={isSelected ? { backgroundColor: c.color } : {}}
                      title={`Preview ${c.name}`}
                    >
                      <Sprite id={c.id} size={30} />
                      <span className={`font-mono text-[10px] font-bold ${isSelected ? 'text-coal' : 'text-[#4B5563] dark:text-[#D1D5DB]'}`}>
                        {c.name}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Speech balloon / roast quote (Flat, unboxed with accent border) */}
              <div className="pt-4 border-t-2 border-coal dark:border-[#384333] space-y-3">
                <div className="flex items-center justify-between font-mono text-xs font-bold text-coal dark:text-white">
                  <span className="flex items-center gap-1.5 text-coal dark:text-accent">
                    <MessageSquareQuote className="w-4 h-4" />
                    Wake-up call from {COMPANIONS.find((c) => c.id === activeRoastCompanion)?.name}:
                  </span>
                  <span className="px-2 py-0.5 bg-[#FB7185] text-coal text-[10px] font-bold border border-coal">
                    minute 14 check-in
                  </span>
                </div>
                <blockquote className="font-mono text-base sm:text-lg text-coal dark:text-white leading-relaxed font-bold pl-4 border-l-4 border-coal dark:border-accent">
                  {ROAST_OPTIONS[activeRoastCompanion]}
                </blockquote>
              </div>

              {/* Action status (Flat footer) */}
              <div className="pt-2 flex items-center justify-end">
                <span className="font-mono text-xs text-[#15803D] dark:text-accent font-bold">
                  ✓ Tab closed · Back on task
                </span>
              </div>
            </div>
          </div>

          {/* Explainer: Step 3 */}
          <div className="order-2 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#FF7EB0] text-coal border-2 border-coal font-mono text-xs font-bold shadow-[2px_2px_0_0_#12151A]">
              <span>Phase 03</span>
              <span>·</span>
              <span>Point-of-Drift Accountability</span>
            </div>
            <h3 className="font-display text-2xl sm:text-4xl font-extrabold tracking-tight text-coal dark:text-white">
              Intervention right when you slip.
            </h3>
            <p className="text-base text-[#374151] dark:text-[#D1D5DB] leading-relaxed font-medium">
              Post-mortem productivity apps tell you at 6 PM that you wasted three hours. Gremlin intervenes the moment you drift into an algorithmic spiral—calling you out in character before your afternoon is gone.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 font-mono text-xs text-coal dark:text-white font-bold">
              <div className="flex items-center gap-2.5">
                <span className="w-5 h-5 bg-coal text-accent dark:bg-accent dark:text-coal border border-coal flex items-center justify-center text-[11px] font-extrabold shrink-0 shadow-[1px_1px_0_0_#12151A]">
                  ✓
                </span>
                <span>Nudges you at the point of drift</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="w-5 h-5 bg-coal text-accent dark:bg-accent dark:text-coal border border-coal flex items-center justify-center text-[11px] font-extrabold shrink-0 shadow-[1px_1px_0_0_#12151A]">
                  ✓
                </span>
                <span>Audio alerts and screen roasts</span>
              </div>
            </div>
          </div>
        </div>
      </Reveal>

    </div>
  );
};
