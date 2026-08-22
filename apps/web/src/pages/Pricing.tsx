import React from 'react';
import { Check, KeyRound, Sparkles, Zap, MessageSquare } from 'lucide-react';
import { Reveal } from '../components/Reveal';

/* ------------------------------------------------------------------ */
/* Paper theme — the deliberate light route on the dark site.          */
/* Featured tier inverts back to dark: an island of the night mode.    */
/* ------------------------------------------------------------------ */

const PAPER_LABEL = 'inline-flex items-center gap-1.5 px-2.5 py-1 bg-pop-yellow border-2 border-coal shadow-[3px_3px_0_0_#12151A] font-mono text-[11px] font-bold tracking-wider text-coal';
const PAPER_GHOST_BTN =
  'w-full text-center block px-5 py-3 rounded-none border-2 border-coal bg-white font-display font-bold text-sm text-coal tracking-wide shadow-brut-sm transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brut active:translate-x-0 active:translate-y-0 active:shadow-none';

interface Tier {
  name: string;
  price: string;
  per: string;
  tag?: string;
  tagColor?: string;
  icon: React.ReactNode;
  blurb: string;
  features: string[];
  cta: string;
  highlight?: boolean;
}

const TIERS: Tier[] = [
  {
    name: 'Free BYOK',
    price: '$0',
    per: 'forever',
    icon: <KeyRound className="w-4 h-4" />,
    blurb: 'Use your own free API key with 100% private, on-device execution.',
    features: [
      'All 5 focus companion personalities',
      '100% On-device private execution (0 KB sent to servers)',
      'Works with free Google Gemini, OpenAI, Claude, Groq, or local Ollama',
      'Focus timer, distraction checks & procedural audio sound cues',
      'Daily sprint logs & local streak tracking',
    ],
    cta: 'Add to Chrome — Free',
  },
  {
    name: 'Gremlin Pro',
    price: '$5',
    per: '/ month',
    tag: 'Most popular',
    icon: <Zap className="w-4 h-4" />,
    blurb: 'Zero setup required. Hosted fast cloud AI and sync across all your devices.',
    features: [
      'Zero setup — no API keys or configuration needed',
      'Instant cloud AI evaluation & roast engine',
      'Multi-device focus streak & goal synchronization',
      'Custom companion personality tuning & roast slider',
      'Weekly focus insights & distraction trend breakdown',
    ],
    cta: 'Start Pro Trial',
    highlight: true,
  },
  {
    name: 'Founder Pass',
    price: '$49',
    per: 'one-time',
    tag: 'Limited to 200',
    tagColor: '#FF7EB0',
    icon: <Sparkles className="w-4 h-4" />,
    blurb: 'Lifetime Pro access for early backers. One simple payment, focus forever.',
    features: [
      'Lifetime access to all future Pro features & updates',
      'Exclusive “Gold Glitch” pixel mascot skin',
      'Founder badge & direct chat with the developer',
      'Early access to new companion personalities',
    ],
    cta: 'Claim Founder Pass',
  },
];

const FAQS: [string, string][] = [
  [
    'Do I need an API key to use Gremlin?',
    'Only if you choose the free tier! You can grab a free Google Gemini key in 30 seconds and run completely on-device. With Gremlin Pro, we handle the cloud AI so you never have to touch a single key.',
  ],
  [
    'Does Gremlin sell or read my private browsing data?',
    'Never. In free BYOK mode, zero data ever touches our servers. When an evaluation happens, only the active page title and domain are checked against your stated goal. Keystrokes, passwords, form inputs, and emails are never accessed or recorded.',
  ],
  [
    'Can I switch companions whenever I want?',
    'Yes, anytime! You can switch between Sarge, Waifu, Sherlock, Kuro, and Sensei right inside the extension popup mid-session.',
  ],
  [
    'What if I need help or want to suggest a companion?',
    'You can email us directly at rchdmaranga@gmail.com or send a message on X/Twitter (@rmarangaa). We read and reply to every message.',
  ],
];

export const Pricing: React.FC = () => {
  return (
    <main className="min-h-screen bg-paper text-paper-ink">
      <div className="container-site py-16 lg:py-24">
        <div className="max-w-2xl">
          <Reveal>
            <div className={PAPER_LABEL}>Pricing</div>
            <h1 className="mt-3 font-display text-4xl sm:text-5xl font-bold tracking-tight text-wrap-balance">
              Start free. Upgrade when the focus pays for itself.
            </h1>
            <p className="mt-4 text-paper-muted leading-relaxed text-base sm:text-lg">
              The core companion experience is completely free with your own key. Pro exists for
              anyone who wants zero setup and instant cloud sync across devices.
            </p>
          </Reveal>
        </div>

        <div className="mt-14 grid md:grid-cols-3 gap-6 items-stretch">
          {TIERS.map((tier, i) => (
            <Reveal key={tier.name} delay={i * 90} className="h-full">
              <div
                className={`relative h-full flex flex-col p-7 rounded-none border-2 transition-all duration-200 ${
                  tier.highlight
                    ? 'bg-base-deep text-ink border-coal shadow-[8px_8px_0_0_#65A30D]'
                    : 'bg-white border-coal shadow-brut hover:-translate-y-1 hover:shadow-brut-lg'
                }`}
              >
                {tier.tag && (
                  <div
                    className={`absolute -top-3 left-6 -rotate-3 font-mono text-[10px] font-bold tracking-wider px-2.5 py-1 border-2 ${
                      tier.highlight
                        ? 'bg-accent text-base-deep border-coal shadow-[3px_3px_0_0_#F5F6F1]'
                        : 'bg-white border-coal shadow-brut-sm'
                    }`}
                    style={
                      tier.highlight
                        ? undefined
                        : { color: tier.tagColor ?? '#FF7EB0', borderColor: '#12151A' }
                    }
                  >
                    {tier.tag}
                  </div>
                )}

                <div className="flex items-center gap-2.5">
                  <span
                    className={`inline-flex w-8 h-8 items-center justify-center border-2 ${
                      tier.highlight ? 'bg-accent/10 border-accent/30 text-accent-bright' : 'bg-paper border-coal text-[#4D7C0F]'
                    }`}
                  >
                    {tier.icon}
                  </span>
                  <span className="font-display font-semibold">{tier.name}</span>
                </div>

                <div className="mt-5 flex items-baseline gap-2">
                  <span className="font-display text-4xl font-bold tracking-tight">{tier.price}</span>
                  <span className={`font-mono text-xs ${tier.highlight ? 'text-ink-faint' : 'text-paper-faint'}`}>
                    {tier.per}
                  </span>
                </div>

                <p className={`mt-3 text-sm leading-relaxed min-h-[40px] ${tier.highlight ? 'text-ink-muted' : 'text-paper-muted'}`}>
                  {tier.blurb}
                </p>

                <div className={`mt-6 pt-6 flex-1 space-y-3 ${tier.highlight ? 'border-t border-line/60' : 'border-t border-paper-line'}`}>
                  <span className={`font-mono text-[11px] tracking-wider ${tier.highlight ? 'text-ink-faint' : 'text-paper-faint'}`}>
                    What's included:
                  </span>
                  <ul className={`space-y-2.5 text-xs sm:text-sm ${tier.highlight ? 'text-ink-muted' : 'text-paper-muted'}`}>
                    {tier.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2.5">
                        <Check className={`w-4 h-4 shrink-0 mt-0.5 ${tier.highlight ? 'text-accent-bright' : 'text-[#65A30D]'}`} />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-8 pt-4">
                  <a
                    href={tier.highlight ? '/auth' : 'https://chromewebstore.google.com'}
                    className={
                      tier.highlight
                        ? 'w-full text-center block px-5 py-3 rounded-xl bg-accent font-display font-semibold text-sm text-base-deep transition-colors hover:bg-accent-bright active:translate-y-[1px]'
                        : PAPER_GHOST_BTN
                    }
                  >
                    {tier.cta}
                  </a>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        {/* Frequently Asked Questions */}
        <section className="mt-24 pt-16 border-t-2 border-dashed border-coal/30">
          <div className="max-w-xl mb-10">
            <div className={PAPER_LABEL}>FAQ</div>
            <h2 className="mt-2 font-display text-2xl sm:text-3xl font-bold tracking-tight">
              Frequently asked questions.
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {FAQS.map(([q, a], idx) => (
              <div key={idx} className="p-6 rounded-none bg-white border-2 border-coal shadow-brut-sm space-y-2">
                <h3 className="font-display font-semibold text-base text-paper-ink flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-[#65A30D]" />
                  {q}
                </h3>
                <p className="text-sm text-paper-muted leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
};
