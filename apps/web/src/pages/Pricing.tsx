import React from 'react';
import { Check, KeyRound, Sparkles, Zap, MessageSquare } from 'lucide-react';
import { Reveal } from '../components/Reveal';

interface Tier {
  name: string;
  price: string;
  per: string;
  tag?: string;
  tagColor?: string;
  icon: React.ReactNode;
  iconColor: string;
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
    iconColor: 'text-ink-muted',
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
    iconColor: 'text-accent',
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
    iconColor: 'text-[#FF7EB0]',
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
    'Yes, anytime! You can switch between Goggins, Waifu, Sherlock, Kuro, and Sensei right inside the extension popup mid-session.',
  ],
  [
    'What if I need help or want to suggest a companion?',
    'You can email us directly at rchdmaranga@gmail.com or send a message on X/Twitter (@rmarangaa). We read and reply to every message.',
  ],
];

export const Pricing: React.FC = () => {
  return (
    <main className="container-site py-16 lg:py-24">
      <div className="max-w-2xl">
        <Reveal>
          <div className="eyebrow">Pricing</div>
          <h1 className="mt-3 font-display text-4xl sm:text-5xl font-bold tracking-tight text-wrap-balance">
            Start free. Upgrade when the focus pays for itself.
          </h1>
          <p className="mt-4 text-ink-muted leading-relaxed text-base sm:text-lg">
            The core companion experience is completely free with your own key.
            Pro exists for anyone who wants zero setup and instant cloud sync across devices.
          </p>
        </Reveal>
      </div>

      <div className="mt-14 grid md:grid-cols-3 gap-6 items-stretch">
        {TIERS.map((tier, i) => (
          <Reveal key={tier.name} delay={i * 90} className="h-full">
            <div
              className={`relative h-full flex flex-col p-7 rounded-2xl border transition-all duration-300 ${
                tier.highlight
                  ? 'border-accent/40 bg-[#12151d] shadow-glow-lg'
                  : 'border-line bg-[#10121a] shadow-card hover:border-line-bright'
              }`}
            >
              {tier.tag && (
                <div
                  className="absolute -top-3 left-6 font-mono text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-md border"
                  style={
                    tier.highlight
                      ? { background: '#A3E635', color: '#0B0D10', borderColor: '#A3E635' }
                      : {
                          background: '#1a1015',
                          color: tier.tagColor ?? '#FF7EB0',
                          borderColor: `${tier.tagColor ?? '#FF7EB0'}55`,
                        }
                  }
                >
                  {tier.tag}
                </div>
              )}

              <div className="flex items-center gap-2.5">
                <span
                  className={`inline-flex w-8 h-8 items-center justify-center rounded-lg border ${
                    tier.highlight ? 'bg-accent/10 border-accent/30' : 'bg-base border-line'
                  } ${tier.iconColor}`}
                >
                  {tier.icon}
                </span>
                <span className="font-display font-semibold">{tier.name}</span>
              </div>

              <div className="mt-5 flex items-baseline gap-2">
                <span className="font-display text-4xl font-bold tracking-tight">{tier.price}</span>
                <span className="font-mono text-xs text-ink-faint">{tier.per}</span>
              </div>

              <p className="mt-3 text-sm text-ink-muted leading-relaxed min-h-[40px]">
                {tier.blurb}
              </p>

              <div className="mt-6 pt-6 border-t border-line/60 flex-1 space-y-3">
                <span className="font-mono text-[11px] uppercase tracking-wider text-ink-faint">
                  What's included:
                </span>
                <ul className="space-y-2.5 text-xs sm:text-sm text-ink-muted">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5">
                      <Check className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-8 pt-4">
                <a
                  href={
                    tier.highlight
                      ? '/auth'
                      : 'https://chromewebstore.google.com'
                  }
                  className={`w-full text-center block ${tier.highlight ? 'btn-primary' : 'btn-ghost'}`}
                >
                  {tier.cta}
                </a>
              </div>
            </div>
          </Reveal>
        ))}
      </div>

      {/* Frequently Asked Questions */}
      <section className="mt-24 pt-16 border-t border-line/40">
        <div className="max-w-xl mb-10">
          <div className="eyebrow">FAQ</div>
          <h2 className="mt-2 font-display text-2xl sm:text-3xl font-bold tracking-tight">
            Frequently asked questions.
          </h2>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {FAQS.map(([q, a], idx) => (
            <div key={idx} className="p-6 rounded-2xl bg-[#10121a] border border-line-bright space-y-2">
              <h3 className="font-display font-semibold text-base text-ink flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-accent" />
                {q}
              </h3>
              <p className="text-sm text-ink-muted leading-relaxed">
                {a}
              </p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
};
