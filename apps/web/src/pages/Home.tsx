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
  const mascotRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const el = mascotRef.current;
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const dx = Math.max(-1, Math.min(1, (e.clientX - cx) / r.width));
      const dy = Math.max(-1, Math.min(1, (e.clientY - cy) / r.height));
      el.style.transform = `translate(${dx * 16}px, ${dy * 10}px) rotate(${dx * 4}deg)`;
    };
    window.addEventListener('mousemove', onMove, { passive: true });
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  return (
    <main className="relative z-10">
      {/* ================= HERO ================= */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-dots" aria-hidden="true" />
        <div className="container-site relative pt-28 pb-16 sm:pt-32 lg:pb-24">
          <div className="grid lg:grid-cols-[1.05fr,0.95fr] items-center gap-12">
            {/* Copy */}
            <div>
              <Reveal>
                <div className="inline-flex items-center gap-2 bg-pop-yellow border-2 border-coal shadow-[3px_3px_0_0_#12151A] px-2.5 py-1 -rotate-2">
                  <span className="w-2 h-2 bg-coal animate-pulse-dot" />
                  <span className="font-mono text-[11px] font-bold tracking-wider">Focus companion · Free</span>
                </div>
              </Reveal>

              <Reveal delay={80}>
                <h1 className="mt-6 font-display font-extrabold text-[2.9rem] leading-[0.95] sm:text-6xl lg:text-7xl tracking-tight">
                  Stop
                  <br />
                  doomscrolling.
                  <br />
                  <span className="mt-3 inline-block">
                    Get <span className="mark-lime">roasted</span> back on task.
                  </span>
                </h1>
              </Reveal>

              <Reveal delay={160}>
                <p className="mt-6 text-base sm:text-lg text-paper-muted leading-relaxed max-w-md font-medium">
                  A pixel desk companion living in your browser. Real research is never blocked —
                  but distraction spirals get called out in seconds.
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

            {/* Console window with voxel gremlin */}
            <Reveal delay={200} className="relative">
              <div className="absolute -top-4 -right-3 z-10 rotate-6 bg-pop-pink border-2 border-coal shadow-[3px_3px_0_0_#12151A] px-2.5 py-1 font-mono text-[11px] font-bold tracking-wide">
                It blinks
              </div>
              <div className="border-2 border-coal bg-base-deep shadow-[8px_8px_0_0_#12151A]">
                {/* Window chrome */}
                <div className="flex items-center justify-between px-3 py-1.5 bg-accent border-b-2 border-coal">
                  <span className="font-mono text-[10px] font-bold tracking-wider text-coal">
                    gremlin.exe — companion 001
                  </span>
                  <span className="flex gap-1">
                    <span className="w-2.5 h-2.5 bg-coal" />
                    <span className="w-2.5 h-2.5 bg-coal" />
                    <span className="w-2.5 h-2.5 bg-white border border-coal" />
                  </span>
                </div>
                {/* Screen */}
                <div className="relative h-[340px] sm:h-[420px] flex items-end justify-center overflow-hidden">
                  <div ref={mascotRef} className="transition-transform duration-100 ease-out will-change-transform pb-2">
                    <Sprite id={activeCompanion.id} size={200} />
                  </div>
                </div>
                {/* Caption strip */}
                <div className="border-t-2 border-accent/40 px-3 py-2 font-mono text-[11px] text-ink-muted flex justify-between">
                  <span>{activeCompanion.name.toLowerCase()} · your companion</span>
                  <span className="text-accent">● rendering live</span>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ================= PERSONALITIES STAGE ================= */}
      <section id="companions" className="container-site scroll-mt-24 pt-16 lg:pt-24 pb-16 lg:pb-24">
        <div className="max-w-2xl mb-12">
          <Reveal>
            <div className="eyebrow -rotate-1">Personalities</div>
            <h2 className="mt-4 font-display text-3xl sm:text-5xl font-extrabold tracking-tight">
              Pick your accountability style.
            </h2>
            <p className="mt-3 text-sm sm:text-base text-paper-muted leading-relaxed font-medium">
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
                      ? 'bg-accent border-coal shadow-brut -translate-y-1'
                      : 'bg-white border-line hover:border-coal hover:shadow-brut-sm hover:-translate-y-0.5'
                  }`}
                >
                  <Sprite id={c.id} size={isSelected ? 52 : 44} />
                  <span className="font-mono text-[10px] font-bold tracking-wide">{c.name}</span>
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
              <div className="relative w-full max-w-md bg-white border-2 border-coal p-5 shadow-brut">
                <div className="flex items-center justify-between pb-2.5 mb-3 border-b-2 border-coal">
                  <span className="font-mono text-[10px] font-bold tracking-wider flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 border border-coal" style={{ background: activeCompanion.color }} />
                    When you start drifting
                  </span>
                  <button
                    onClick={() => playCharacterVoice(activeCompanion.id)}
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 border-2 border-coal bg-white font-mono text-[10px] font-bold hover:bg-accent transition-colors cursor-pointer"
                    title="Play voice sound"
                  >
                    <Volume2 className="w-3 h-3" />
                    Hear voice
                  </button>
                </div>

                <p className="font-mono text-sm sm:text-base leading-relaxed min-h-[3.5rem]">
                  “{shown}
                  {!done && <span className="animate-caret-blink">▍</span>}
                  {done && '”'}
                </p>

                <div className="absolute -bottom-[10px] left-10 w-4 h-4 bg-white border-r-2 border-b-2 border-coal transform rotate-45" />
              </div>

              <div className="flex items-center gap-5 pl-1">
                <div className="animate-float-soft">
                  <Sprite id={activeCompanion.id} size={96} />
                </div>
                <div>
                  <div className="font-mono text-[10px] font-bold tracking-wider text-paper-muted">Coach archetype</div>
                  <div className="font-display font-extrabold text-xl" style={{ color: activeCompanion.color }}>
                    {activeCompanion.archetype}
                  </div>
                </div>
              </div>
            </div>

            {/* Narrative */}
            <div className="space-y-5 text-center lg:text-left">
              <span className="inline-block border-2 border-coal bg-white px-3 py-1 font-mono text-xs shadow-brut-sm rotate-1">
                Best for: <strong>{BEST_FOR_TAGS[activeCompanion.id]}</strong>
              </span>
              <h3 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight">
                Meet {activeCompanion.name}
                <span style={{ color: activeCompanion.color }}>.</span>
              </h3>
              <p className="text-base text-paper-muted leading-relaxed max-w-lg font-medium">{activeCompanion.lore}</p>
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-1">
                <button
                  onClick={() => playCharacterVoice(activeCompanion.id)}
                  className="inline-flex items-center gap-2 px-4 py-2 border-2 border-coal bg-white font-mono text-xs font-bold hover:bg-accent transition-colors cursor-pointer"
                >
                  <Volume2 className="w-4 h-4" />
                  Test voice tone
                </button>
                <span className="font-mono text-xs text-paper-muted font-bold">
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
              <div className="eyebrow rotate-1">How it works</div>
              <h2 className="mt-4 font-display text-3xl sm:text-5xl font-extrabold tracking-tight">
                Three steps to effortless focus.
              </h2>
              <p className="mt-3 text-sm sm:text-base text-paper-muted leading-relaxed font-medium">
                No complex rules, no rigid domain blacklists, no setup friction.
              </p>
            </Reveal>
          </div>

          <CardlessHowItWorks />
        </div>
      </section>

      {/* ================= FINAL CTA BAND ================= */}
      <section className="relative bg-accent overflow-hidden">
        <div className="absolute top-6 left-8 hidden lg:block -rotate-6 bg-white border-2 border-coal shadow-[3px_3px_0_0_#12151A] px-3 py-1.5 font-mono text-xs font-bold">
          No blocklists
        </div>
        <div className="absolute bottom-6 right-8 hidden lg:block rotate-3 bg-pop-blue text-white border-2 border-coal shadow-[3px_3px_0_0_#12151A] px-3 py-1.5 font-mono text-xs font-bold">
          100% on-device AI
        </div>

        <div className="container-site relative py-16 lg:py-24 text-center">
          <Reveal>
            <h2 className="font-display font-extrabold text-4xl sm:text-6xl tracking-tight text-coal text-wrap-balance">
              Get more done.
              <br />
              Scroll less.
            </h2>
            <p className="mt-4 text-coal/80 max-w-md mx-auto text-sm sm:text-base leading-relaxed font-semibold">
              Add your desk companion, lock in your goal, and protect your focus.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <a
                href="https://chromewebstore.google.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-7 py-4 bg-coal text-paper border-2 border-coal font-display font-bold text-sm tracking-wide shadow-[4px_4px_0_0_#F5F6F1] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[7px_7px_0_0_#F5F6F1] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer"
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
