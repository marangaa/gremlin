import React, { useState } from 'react';
import { Check, KeyRound, Sparkles, Zap, MessageSquare } from 'lucide-react';
import { Reveal } from '../components/Reveal';
import { authClient, API_URL } from '../lib/auth';
import { openPaddleCheckout, PADDLE_PRO_PRICE_ID, PADDLE_FOUNDER_PRICE_ID } from '../lib/paddle';

/* ------------------------------------------------------------------ */
/* Paper theme — the deliberate light route on the dark site.          */
/* Featured tier inverts back to dark: an island of the night mode.    */
/* ------------------------------------------------------------------ */

const PAPER_LABEL = 'inline-flex items-center gap-1.5 px-2.5 py-1 bg-pop-yellow border-2 border-coal shadow-[3px_3px_0_0_#12151A] font-mono text-[11px] font-bold tracking-wider text-coal';
const PAPER_GHOST_BTN =
  'w-full text-center block px-5 py-3 rounded-none border-2 border-coal dark:border-[#3F4740] bg-white dark:bg-[#161914] font-display font-bold text-sm text-coal dark:text-white tracking-wide shadow-brut-sm dark:shadow-[3px_3px_0_0_#A3E635] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brut active:translate-x-0 active:translate-y-0 active:shadow-none';

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
      'All 8 focus companion personalities',
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
    'Yes, anytime! You can switch between Sarge, Waifu, Sherlock, Kuro, Sensei, Byte, Pixel, and Zeta right inside the extension popup mid-session.',
  ],
  [
    'What if I need help or want to suggest a companion?',
    'You can email us directly at rchdmaranga@gmail.com or send a message on X/Twitter (@rmarangaa). We read and reply to every message.',
  ],
];

export const Pricing: React.FC = () => {
  const { data: session } = authClient.useSession();
  const user = session?.user;
  const userPlan = (user as any)?.plan || 'free';
  const [portalLoading, setPortalLoading] = useState(false);

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/billing/portal`, {
        method: 'POST',
        credentials: 'include',
      });
      const data: any = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || 'Failed to open customer portal');
      }
    } catch (err: any) {
      alert(err?.message || 'Failed to open customer portal');
    } finally {
      setPortalLoading(false);
    }
  };

  const handleCheckout = (tierName: string) => {
    if (tierName === 'Gremlin Pro') {
      if (!PADDLE_PRO_PRICE_ID) {
        alert('Paddle Pro price ID (VITE_PADDLE_PRO_PRICE_ID) is not configured yet. Run the seed script in apps/backend or set it in .env.');
        return;
      }
      openPaddleCheckout({
        priceId: PADDLE_PRO_PRICE_ID,
        userEmail: user?.email,
        userId: user?.id,
      });
    } else if (tierName === 'Founder Pass') {
      if (!PADDLE_FOUNDER_PRICE_ID) {
        alert('Paddle Founder price ID (VITE_PADDLE_FOUNDER_PRICE_ID) is not configured yet. Run the seed script in apps/backend or set it in .env.');
        return;
      }
      openPaddleCheckout({
        priceId: PADDLE_FOUNDER_PRICE_ID,
        userEmail: user?.email,
        userId: user?.id,
        customData: { tier: 'founder' },
      });
    }
  };

  return (
    <main className="min-h-screen transition-colors duration-200 text-coal dark:text-white">
      <div className="container-site py-16 lg:py-24">
        <div className="max-w-2xl">
          <Reveal>
            <div className={PAPER_LABEL}>Pricing</div>
            <h1 className="mt-3 font-display text-4xl sm:text-5xl font-bold tracking-tight text-coal dark:text-white text-wrap-balance">
              Start free. Upgrade when the focus pays for itself.
            </h1>
            <p className="mt-4 text-[#374151] dark:text-[#D1D5DB] leading-relaxed text-base sm:text-lg">
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
                    ? 'bg-base-deep text-ink border-coal dark:border-[#3F4740] shadow-[8px_8px_0_0_#65A30D]'
                    : 'bg-white dark:bg-[#161914] border-coal dark:border-[#3F4740] text-coal dark:text-white shadow-brut dark:shadow-[4px_4px_0_0_#A3E635] hover:-translate-y-1 hover:shadow-brut-lg'
                }`}
              >
                {tier.tag && (
                  <div
                    className={`absolute -top-3 left-6 -rotate-3 font-mono text-[10px] font-bold tracking-wider px-2.5 py-1 border-2 ${
                      tier.highlight
                        ? 'bg-accent text-base-deep border-coal shadow-[3px_3px_0_0_#F5F6F1]'
                        : 'bg-white dark:bg-[#161914] border-coal dark:border-[#3F4740] shadow-brut-sm text-coal dark:text-white'
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
                      tier.highlight
                        ? 'bg-accent/10 border-accent/30 text-accent-bright'
                        : 'bg-paper dark:bg-[#20261C] border-coal dark:border-[#3F4740] text-[#4D7C0F] dark:text-accent'
                    }`}
                  >
                    {tier.icon}
                  </span>
                  <span className="font-display font-semibold">{tier.name}</span>
                </div>

                <div className="mt-5 flex items-baseline gap-2">
                  <span className="font-display text-4xl font-bold tracking-tight">{tier.price}</span>
                  <span className={`font-mono text-xs ${tier.highlight ? 'text-ink-faint' : 'text-[#6B7280] dark:text-[#9CA3AF]'}`}>
                    {tier.per}
                  </span>
                </div>

                <p className={`mt-3 text-sm leading-relaxed min-h-[40px] ${tier.highlight ? 'text-ink-muted' : 'text-[#4B5563] dark:text-[#D1D5DB]'}`}>
                  {tier.blurb}
                </p>

                <div className={`mt-6 pt-6 flex-1 space-y-3 ${tier.highlight ? 'border-t border-line/60' : 'border-t border-coal/10 dark:border-[#262E22]'}`}>
                  <span className={`font-mono text-[11px] tracking-wider ${tier.highlight ? 'text-ink-faint' : 'text-[#6B7280] dark:text-[#9CA3AF]'}`}>
                    What's included:
                  </span>
                  <ul className={`space-y-2.5 text-xs sm:text-sm ${tier.highlight ? 'text-ink-muted' : 'text-[#4B5563] dark:text-[#D1D5DB]'}`}>
                    {tier.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2.5">
                        <Check className={`w-4 h-4 shrink-0 mt-0.5 ${tier.highlight ? 'text-accent-bright' : 'text-[#65A30D] dark:text-accent'}`} />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-8 pt-4">
                  {tier.name === 'Free BYOK' ? (
                    <a
                      href="https://chromewebstore.google.com"
                      className={PAPER_GHOST_BTN}
                    >
                      {tier.cta}
                    </a>
                  ) : tier.name === 'Gremlin Pro' && (userPlan === 'pro' || userPlan === 'founder') ? (
                    <button
                      type="button"
                      onClick={handleManageSubscription}
                      disabled={portalLoading}
                      className={
                        tier.highlight
                          ? 'w-full text-center block px-5 py-3 rounded-none border-2 border-coal bg-accent font-display font-bold text-sm text-coal shadow-[4px_4px_0_0_#12151A] transition-transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer disabled:opacity-50'
                          : PAPER_GHOST_BTN
                      }
                    >
                      {portalLoading ? 'Opening portal...' : 'Manage Subscription →'}
                    </button>
                  ) : tier.name === 'Founder Pass' && userPlan === 'founder' ? (
                    <div className="w-full text-center py-3 border-2 border-[#FF7EB0] bg-[#FF7EB0]/10 font-mono text-xs font-bold text-[#FF7EB0]">
                      Founder Access Active ✨
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleCheckout(tier.name)}
                      className={
                        tier.highlight
                          ? 'w-full text-center block px-5 py-3 rounded-none border-2 border-coal bg-accent font-display font-bold text-sm text-coal shadow-[4px_4px_0_0_#12151A] transition-transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer'
                          : PAPER_GHOST_BTN
                      }
                    >
                      {tier.cta}
                    </button>
                  )}
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        {/* Frequently Asked Questions */}
        <section className="mt-24 pt-16 border-t-2 border-dashed border-coal/30 dark:border-[#2A2E27]">
          <div className="max-w-xl mb-10">
            <div className={PAPER_LABEL}>FAQ</div>
            <h2 className="mt-2 font-display text-2xl sm:text-3xl font-bold tracking-tight text-coal dark:text-white">
              Frequently asked questions.
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {FAQS.map(([q, a], idx) => (
              <div key={idx} className="p-6 rounded-none bg-white dark:bg-[#161914] border-2 border-coal dark:border-[#3F4740] shadow-brut-sm dark:shadow-[3px_3px_0_0_#A3E635] space-y-2">
                <h3 className="font-display font-semibold text-base text-coal dark:text-white flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-[#65A30D] dark:text-accent" />
                  {q}
                </h3>
                <p className="text-sm text-[#4B5563] dark:text-[#D1D5DB] leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
};
