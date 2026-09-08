import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Download, Volume2 } from 'lucide-react';
import { COMPANIONS, type CompanionId } from '../lib/companions';
import { Reveal } from '../components/Reveal';
import { Sprite } from '../components/Sprite';
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
    if (id === 'Sarge') {
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
  Sarge: 'Tight deadlines & zero-excuse focus',
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
      <section className="relative">
        <div className="container-site relative pt-28 pb-16 sm:pt-32 lg:pb-24">
          <div className="grid lg:grid-cols-[1.05fr,0.95fr] items-center gap-12">
            {/* Copy */}
            <div>
              <Reveal>
                <h1 className="font-display font-extrabold text-[2.9rem] leading-[0.95] sm:text-6xl lg:text-7xl tracking-tight text-coal dark:text-white">
                  The internet
                  <br />
                  is a distraction.
                  <br />
                  <span className="mt-3 inline-block">
                    Meet your <span className="mark-lime text-coal">gremlin</span>.
                  </span>
                </h1>
              </Reveal>

              <Reveal delay={160}>
                <p className="mt-6 text-base sm:text-lg text-[#374151] dark:text-[#D1D5DB] leading-relaxed max-w-md font-medium">
                  A Chrome extension that watches your screen, keeps you accountable, and helps you stay focused.
                </p>
              </Reveal>

              <Reveal delay={240}>
                <div className="mt-8 flex flex-wrap items-center gap-4">
                  <a href="https://chromewebstore.google.com" target="_blank" rel="noopener noreferrer" className="btn-primary">
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

            {/* Hero Graphic - Static Gremlin */}
            <Reveal delay={200} className="relative">
              <div className="relative animate-fade-in flex justify-center lg:justify-end">
                <img
                  src="/gremlin.png"
                  alt="Gremlin peeking over a browser window"
                  className="w-full max-w-[500px] object-contain drop-shadow-2xl"
                />
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ================= PERSONALITIES STAGE ================= */}
      <section id="companions" className="container-site scroll-mt-24 pt-16 lg:pt-24 pb-16 lg:pb-24">
        <div className="max-w-2xl mb-12">
          <Reveal>
            <div className="eyebrow">Personalities</div>
            <h2 className="mt-4 font-display text-3xl sm:text-5xl font-extrabold tracking-tight text-coal dark:text-white">
              Pick your accountability style.
            </h2>
            <p className="mt-3 text-base sm:text-lg text-[#374151] dark:text-[#D1D5DB] leading-relaxed font-medium">
              Choose the companion that matches your wavelength — from tough love to calm mindfulness.
            </p>
          </Reveal>
        </div>

        {/* Selector row */}
        <Reveal delay={60}>
          <div className="flex items-stretch sm:items-center justify-between sm:justify-start gap-3 pb-8 overflow-x-auto">
            {COMPANIONS.map((c) => {
              const isSelected = selected === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => {
                    setSelected(c.id);
                    playCharacterVoice(c.id);
                  }}
                  className={`group relative flex flex-col items-center gap-1.5 p-3 shrink-0 border-2 transition-all duration-150 cursor-pointer ${
                    isSelected
                      ? 'border-coal shadow-brut -translate-y-1'
                      : 'bg-white dark:bg-[#161914] border-coal dark:border-[#384333] text-coal dark:text-white hover:shadow-brut-sm hover:-translate-y-0.5'
                  }`}
                  style={isSelected ? { backgroundColor: c.color } : {}}
                >
                  <Sprite id={c.id} size={isSelected ? 52 : 44} />
                  <span className={`font-mono text-[10px] font-bold tracking-wide ${isSelected ? 'text-coal' : 'text-coal dark:text-white'}`}>{c.name}</span>
                </button>
              );
            })}
          </div>
        </Reveal>

        {/* Spotlight showcase */}
        <Reveal delay={120}>
          <div className="mt-6 grid lg:grid-cols-[1fr,1.15fr] gap-10 items-center">
            {/* Speech card + sprite */}
            <div className="flex flex-col items-center lg:items-start gap-8">
              <div className="relative w-full max-w-md bg-white dark:bg-[#161914] border-2 border-coal dark:border-[#3F4740] p-5 shadow-brut dark:shadow-[4px_4px_0_0_#A3E635] text-coal dark:text-white">
                <div className="flex items-center justify-between pb-2.5 mb-3 border-b-2 border-coal dark:border-[#384333]">
                  <span className="font-mono text-[10px] font-bold tracking-wider flex items-center gap-1.5 text-coal dark:text-white">
                    <span className="w-2.5 h-2.5 border border-coal dark:border-white shrink-0" style={{ background: activeCompanion.color }} />
                    When you start drifting
                  </span>
                  <button
                    onClick={() => playCharacterVoice(activeCompanion.id)}
                    className="inline-flex items-center gap-1 px-2 py-0.5 border-2 border-coal bg-white dark:bg-[#20261C] font-mono text-[10px] font-bold transition-colors cursor-pointer text-coal dark:text-white hover:bg-[var(--companion-color)]"
                    style={{ '--companion-color': activeCompanion.color } as React.CSSProperties}
                    title="Play voice sound"
                  >
                    <Volume2 className="w-3 h-3" />
                    Hear voice
                  </button>
                </div>

                <p className="font-mono text-base sm:text-lg leading-relaxed min-h-[4rem] font-bold text-coal dark:text-white">
                  <span className="text-[#65A30D] dark:text-accent font-extrabold">“</span>
                  {shown}
                  {!done && <span className="animate-caret-blink text-[#65A30D] dark:text-accent font-extrabold">▍</span>}
                  {done && <span className="text-[#65A30D] dark:text-accent font-extrabold">”</span>}
                </p>

                <div className="absolute -bottom-[10px] left-10 w-4 h-4 bg-white dark:bg-[#161914] border-r-2 border-b-2 border-coal dark:border-[#3F4740] transform rotate-45" />
              </div>

              <div className="flex items-center gap-5 pl-1">
                <div className="animate-float-soft">
                  <Sprite id={activeCompanion.id} size={96} />
                </div>
                <div>
                  <div className="font-mono text-[10px] font-bold tracking-wider text-[#4B5563] dark:text-[#9CA3AF]">Coach archetype</div>
                  <div className="font-display font-extrabold text-xl text-coal dark:text-white flex items-center gap-2">
                    <span>{activeCompanion.archetype}</span>
                    <span className="w-3 h-3 border-2 border-coal dark:border-white inline-block shadow-[1px_1px_0_0_#12151A]" style={{ background: activeCompanion.color }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Narrative */}
            <div className="space-y-5 text-center lg:text-left">
              <span className="inline-block border-2 border-coal dark:border-[#384333] bg-white dark:bg-[#161914] text-coal dark:text-white px-3 py-1 font-mono text-xs shadow-brut-sm dark:shadow-[2px_2px_0_0_#000]">
                Best for: <strong>{BEST_FOR_TAGS[activeCompanion.id]}</strong>
              </span>
              <h3 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-coal dark:text-white">
                Meet {activeCompanion.name}
                <span style={{ color: activeCompanion.color }}>.</span>
              </h3>
              <p className="text-base sm:text-lg text-[#374151] dark:text-[#D1D5DB] leading-relaxed max-w-lg font-medium">{activeCompanion.lore}</p>
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-1">
                <button
                  onClick={() => playCharacterVoice(activeCompanion.id)}
                  className="inline-flex items-center gap-2 px-4 py-2 border-2 border-coal bg-white dark:bg-[#20261C] text-coal dark:text-white font-mono text-xs font-bold transition-colors cursor-pointer hover:bg-[var(--companion-color)] shadow-[2px_2px_0_0_#12151A]"
                  style={{ '--companion-color': activeCompanion.color } as React.CSSProperties}
                >
                  <Volume2 className="w-4 h-4" />
                  Test voice tone
                </button>
                <span className="font-mono text-xs text-[#4B5563] dark:text-[#9CA3AF] font-bold">
                  Sound: {activeCompanion.voice}
                </span>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ================= HOW IT WORKS ================= */}
      <section id="how-it-works" className="container-site scroll-mt-24 pb-16 lg:pb-24">
        <div>
          <div className="max-w-2xl mb-12">
            <Reveal>
              <div className="eyebrow">How it works</div>
              <h2 className="mt-4 font-display text-3xl sm:text-5xl font-extrabold tracking-tight text-coal dark:text-white">
                Three steps to effortless focus.
              </h2>
              <p className="mt-3 text-base sm:text-lg text-[#374151] dark:text-[#D1D5DB] leading-relaxed font-medium">
                No complex rules, no rigid domain blacklists, no setup friction.
              </p>
            </Reveal>
          </div>

          <CardlessHowItWorks />
        </div>
      </section>

      {/* ================= FINAL CTA ================= */}
      <section className="relative">
        <div className="container-site relative py-20 lg:py-28 text-center">
          <Reveal>
            <h2 className="font-display font-extrabold text-4xl sm:text-6xl tracking-tight text-coal dark:text-white text-wrap-balance">
              Get <span className="mark-lime text-coal">more done</span>.
              <br />
              Scroll <span className="mark-lime text-coal">less</span>.
            </h2>
            <p className="mt-6 text-[#374151] dark:text-[#D1D5DB] max-w-md mx-auto text-base sm:text-lg leading-relaxed font-medium">
              Add your desk companion, lock in your goal, and protect your focus.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <a
                href="https://chromewebstore.google.com"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary"
              >
                <Download className="w-4 h-4" />
                Add to Chrome — Free
              </a>
              <button onClick={() => navigate('/pricing')} className="btn-ghost">
                View pricing
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            <p className="mt-6 font-mono text-xs font-bold tracking-wide text-[#4B5563] dark:text-[#9CA3AF]">
              Free forever tier · Bring your own AI key · Nothing leaves your machine
            </p>
          </Reveal>
        </div>
      </section>
    </main>
  );
};
