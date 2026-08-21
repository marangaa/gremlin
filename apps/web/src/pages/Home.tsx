import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Download, Volume2 } from 'lucide-react';
import { COMPANIONS, type CompanionId } from '../lib/companions';
import { Reveal } from '../components/Reveal';
import { Sprite } from '../components/Sprite';
import { VoxelGremlin } from '../three/VoxelGremlin';
import { CardlessHowItWorks } from '../components/CardlessHowItWorks';

/* ------------------------------------------------------------------ */
/* Typewriter for the live reaction                                    */
/* ------------------------------------------------------------------ */
function useTypewriter(text: string, speed = 16) {
  const [shown, setShown] = useState('');
  const reduced = useMemo(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  );

  useEffect(() => {
    if (reduced) {
      setShown(text);
      return;
    }
    setShown('');
    let i = 0;
    const timer = setInterval(() => {
      i += 1;
      setShown(text.slice(0, i));
      if (i >= text.length) clearInterval(timer);
    }, speed);
    return () => clearInterval(timer);
  }, [text, speed, reduced]);

  return { shown, done: shown.length >= text.length };
}

/* ------------------------------------------------------------------ */
/* Procedural Audio preview using Web Audio API                        */
/* ------------------------------------------------------------------ */
function playCharacterVoice(id: CompanionId) {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;
    if (id === 'goggins') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(75, now + 0.18);
    } else if (id === 'waifu') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(780, now + 0.15);
    } else if (id === 'sherlock') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.setValueAtTime(330, now + 0.08);
      osc.frequency.setValueAtTime(260, now + 0.16);
    } else if (id === 'kuro') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(320, now + 0.12);
    } else {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(260, now + 0.25);
    }

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.start(now);
    osc.stop(now + 0.25);
  } catch {
    // Audio context not allowed or supported
  }
}

const BEST_FOR_TAGS: Record<CompanionId, string> = {
  goggins: 'Tight deadlines & zero-excuse focus',
  waifu: 'Friendly, encouraging study sessions',
  sherlock: 'Deep reading & analytical investigation',
  kuro: 'Chronic tab hoarders & meme scrollers',
  sensei: 'Calm, mindful writing & steady pacing',
};

/* ------------------------------------------------------------------ */
/* Home                                                                */
/* ------------------------------------------------------------------ */
export const Home: React.FC<{ navigate: (path: string) => void }> = ({ navigate }) => {
  const [selected, setSelected] = useState<CompanionId>('kuro');
  const activeCompanion = COMPANIONS.find((c) => c.id === selected) || COMPANIONS[0]!;
  const { shown, done } = useTypewriter(activeCompanion.remark);

  return (
    <main className="relative z-10">
      {/* ================= HERO ================= */}
      <section className="relative pt-24 sm:pt-32 pb-16 lg:pb-24">
        <div className="container-site relative">
          <div className="grid lg:grid-cols-[1.1fr,0.9fr] items-center gap-12">
            {/* Copy */}
            <div className="max-w-xl">
              <Reveal>
                <div className="inline-flex items-center gap-2.5 rounded-full border border-line bg-surface/70 py-1.5 pl-2 pr-4 backdrop-blur-md">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 border border-accent/25 px-2.5 py-0.5 font-mono text-[11px] font-medium text-accent">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse-dot" />
                    Focus Companion
                  </span>
                  <span className="font-mono text-[11px] tracking-wide text-ink-muted">
                    Your AI focus buddy
                  </span>
                </div>
              </Reveal>

              <Reveal delay={80}>
                <h1 className="mt-6 font-display text-[2.75rem] leading-[1.05] sm:text-6xl sm:leading-[1.04] font-bold tracking-tight text-wrap-balance">
                  Stop doomscrolling.
                  <br />
                  <span className="text-gradient">Get roasted back on task.</span>
                </h1>
              </Reveal>

              <Reveal delay={160}>
                <p className="mt-5 text-base sm:text-lg text-ink-muted leading-relaxed max-w-md">
                  A pixel desk companion living in your browser. Real research is never blocked — but distraction spirals get called out in seconds.
                </p>
              </Reveal>

              <Reveal delay={240}>
                <div className="mt-8 flex flex-wrap items-center gap-3">
                  <a
                    href="https://chromewebstore.google.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary"
                  >
                    <Download className="w-4 h-4" />
                    Add to Chrome — Free
                  </a>
                  <button
                    onClick={() =>
                      document.getElementById('companions')?.scrollIntoView({ behavior: 'smooth' })
                    }
                    className="btn-ghost"
                  >
                    Meet the companions
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </Reveal>
            </div>

            {/* Voxel gremlin turntable */}
            <Reveal delay={200} className="relative h-[380px] sm:h-[440px]">
              <div
                className="absolute inset-0 m-auto w-[75%] aspect-square rounded-full bg-[radial-gradient(closest-side,rgba(163,230,53,0.12),transparent)] blur-2xl"
                aria-hidden="true"
              />
              <VoxelGremlin />
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 font-mono text-[11px] text-ink-faint whitespace-nowrap">
                companion 001 — “kuro” · it blinks
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ================= CARDLESS PERSONALITIES STAGE ================= */}
      <section id="companions" className="container-site scroll-mt-24 py-16 lg:py-24">
        <div className="border-t border-line/40 pt-16">
          <div className="max-w-2xl mb-12">
            <Reveal>
              <div className="eyebrow">Personalities</div>
              <h2 className="mt-2 font-display text-3xl sm:text-5xl font-bold tracking-tight">
                Pick your accountability style.
              </h2>
              <p className="mt-3 text-sm sm:text-base text-ink-muted leading-relaxed">
                Choose the companion that matches your wavelength — from tough love to calm mindfulness.
              </p>
            </Reveal>
          </div>

          {/* Cardless Floating Character Stage */}
          <div className="relative pt-6">
            {/* Fluid Character Selector Row */}
            <Reveal delay={60}>
              <div className="flex items-center justify-between sm:justify-start gap-4 sm:gap-8 pb-8 overflow-x-auto">
                {COMPANIONS.map((c) => {
                  const isSelected = selected === c.id;
                  return (
                    <button
                      key={c.id}
                      onClick={() => {
                        setSelected(c.id);
                        playCharacterVoice(c.id);
                      }}
                      className={`group relative flex flex-col items-center gap-2.5 transition-all duration-300 cursor-pointer shrink-0 pb-2 ${
                        isSelected ? 'scale-110 opacity-100' : 'opacity-40 hover:opacity-80 hover:scale-105'
                      }`}
                    >
                      {/* Character Sprite with Floating Soft Shadow */}
                      <div className="relative w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center">
                        {isSelected && (
                          <div
                            className="absolute inset-0 rounded-full blur-xl transition-all duration-500 opacity-60"
                            style={{ background: c.glow }}
                          />
                        )}
                        <div className={isSelected ? 'animate-float-soft' : ''}>
                          <Sprite id={c.id} size={isSelected ? 54 : 44} />
                        </div>
                      </div>

                      {/* Character Label */}
                      <span
                        className={`font-display font-semibold text-xs sm:text-sm tracking-wide transition-colors ${
                          isSelected ? 'text-ink' : 'text-ink-muted group-hover:text-ink'
                        }`}
                      >
                        {c.name}
                      </span>

                      {/* Selection Glow Bar */}
                      {isSelected ? (
                        <div
                          className="w-6 h-0.5 rounded-full transition-all duration-300"
                          style={{ background: c.color }}
                        />
                      ) : (
                        <div className="w-1.5 h-1.5 rounded-full bg-transparent group-hover:bg-line-bright transition-all" />
                      )}
                    </button>
                  );
                })}
              </div>
            </Reveal>

            {/* Cardless Dynamic Spotlight Showcase */}
            <Reveal delay={120}>
              <div className="relative mt-8 grid lg:grid-cols-[1fr,1.2fr] gap-10 items-center">
                {/* Ambient Radial Spotlight Floor */}
                <div
                  className="absolute -top-12 left-1/4 -translate-x-1/2 w-[420px] h-[340px] rounded-full blur-[120px] transition-colors duration-700 pointer-events-none opacity-40"
                  style={{ background: activeCompanion.glow }}
                />

                {/* Left: Giant Floating Character with Speech Bubble */}
                <div className="relative flex flex-col items-center lg:items-start gap-6">
                  {/* Floating Speech Cloud */}
                  <div className="relative max-w-md w-full bg-[#10121a] border border-line-bright rounded-2xl p-5 shadow-lift backdrop-blur-xl">
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-line/60">
                      <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-accent flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: activeCompanion.color }} />
                        When you start drifting
                      </span>
                      <button
                        onClick={() => playCharacterVoice(activeCompanion.id)}
                        className="inline-flex items-center gap-1.5 font-mono text-[11px] text-ink-muted hover:text-ink transition-colors cursor-pointer"
                        title="Play voice sound"
                      >
                        <Volume2 className="w-3.5 h-3.5 text-accent" />
                        Hear Voice
                      </button>
                    </div>

                    <p className="font-mono text-sm sm:text-base leading-relaxed text-ink italic">
                      “{shown}
                      {!done && <span className="animate-caret-blink text-ink-muted">▍</span>}
                      {done && '”'}
                    </p>

                    {/* Speech Bubble Tail */}
                    <div className="absolute -bottom-2 left-10 w-4 h-4 bg-[#10121a] border-r border-b border-line-bright transform rotate-45" />
                  </div>

                  {/* Big Hero Sprite */}
                  <div className="pt-2 pl-4 flex items-center gap-6">
                    <div className="animate-float-soft drop-shadow-2xl">
                      <Sprite id={activeCompanion.id} size={96} />
                    </div>
                    <div>
                      <div className="font-mono text-xs text-ink-faint">Coach Archetype</div>
                      <div className="font-display font-semibold text-lg text-ink" style={{ color: activeCompanion.color }}>
                        {activeCompanion.archetype}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right: Clean Editorial Narrative */}
                <div className="space-y-6 text-center lg:text-left">
                  <div>
                    <span className="inline-block font-mono text-xs px-3 py-1 rounded-full border border-line bg-surface/60 text-ink-muted mb-3">
                      Best For: <strong className="text-ink font-semibold">{BEST_FOR_TAGS[activeCompanion.id]}</strong>
                    </span>
                    <h3 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-ink">
                      Meet {activeCompanion.name}<span style={{ color: activeCompanion.color }}>.</span>
                    </h3>
                  </div>

                  <p className="text-base text-ink-muted leading-relaxed max-w-lg">
                    {activeCompanion.lore}
                  </p>

                  <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-2">
                    <button
                      onClick={() => playCharacterVoice(activeCompanion.id)}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-surface border border-line hover:border-line-bright text-xs font-mono font-medium text-ink transition-all cursor-pointer shadow-sm hover:scale-[1.02]"
                    >
                      <Volume2 className="w-4 h-4 text-accent" />
                      Test Voice Tone
                    </button>
                    <span className="font-mono text-xs text-ink-faint">
                      Sound: {activeCompanion.voice}
                    </span>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ================= CARDLESS 3 STEPS TO FOCUS ================= */}
      <section id="how-it-works" className="container-site scroll-mt-24 py-16 lg:py-24">
        <div className="border-t border-line/40 pt-16">
          <div className="max-w-2xl mb-12">
            <Reveal>
              <div className="eyebrow">How It Works</div>
              <h2 className="mt-2 font-display text-3xl sm:text-5xl font-bold tracking-tight">
                Three steps to effortless focus.
              </h2>
              <p className="mt-3 text-sm sm:text-base text-ink-muted leading-relaxed">
                No complex rules, no rigid domain blacklists, no setup friction.
              </p>
            </Reveal>
          </div>

          <CardlessHowItWorks />
        </div>
      </section>

      {/* ================= FINAL CTA ================= */}
      <section className="relative overflow-hidden py-20 lg:py-28 text-center">
        <div className="container-site relative border-t border-line/40 pt-16">
          <Reveal>
            <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-wrap-balance">
              Get more done. Scroll less.
            </h2>
            <p className="mt-3 text-ink-muted max-w-sm mx-auto text-sm sm:text-base leading-relaxed">
              Add your desk companion, lock in your goal, and protect your focus.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <a
                href="https://chromewebstore.google.com"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary px-7"
              >
                <Download className="w-4 h-4" />
                Add to Chrome — Free
              </a>
              <button onClick={() => navigate('/pricing')} className="btn-ghost">
                View pricing
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </Reveal>
        </div>
      </section>
    </main>
  );
};
