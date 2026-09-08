import React, { useState } from 'react';
import { Check, KeyRound, Zap, MessageSquare } from 'lucide-react';
import { Reveal } from '../components/Reveal';
import { authClient, API_URL } from '../lib/auth';
import { openPaddleCheckout, PADDLE_PRO_PRICE_ID } from '../lib/paddle';

/* ------------------------------------------------------------------ */
/* Paper theme — the deliberate light route on the dark site.          */
/* Featured tier inverts back to dark: an island of the night mode.    */
/* ------------------------------------------------------------------ */

const PAPER_GHOST_BTN =
  'w-full text-center block px-5 py-3 rounded-none border-2 border-coal dark:border-[#3F4740] bg-white dark:bg-[#161914] font-display font-bold text-sm text-coal dark:text-white tracking-wide shadow-brut-sm dark:shadow-[3px_3px_0_0_#A3E635] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brut active:translate-x-0 active:translate-y-0 active:shadow-none';

interface Tier {
  name: string;
  price: string;
  per: string;
  icon: React.ReactNode;
  blurb: string;
  features: string[];
  cta: string;
  highlight?: boolean;
}

const TIERS: Tier[] = [
  {
    name: 'Free (Local-first)',
    price: '$0',
    per: 'forever',
    icon: <KeyRound className="w-4 h-4" />,
    blurb: 'You run the code, you bring your own API key, and not a single byte leaves your machine. Free forever.',
    features: [
      'All 8 companion personalities',
      '100% on-device execution (zero data sent to our servers)',
      'Works with free Gemini, Claude, OpenAI, Groq, or local Ollama',
      'Context tracking, distraction intervention & procedural sound effects',
      'Digital self-awareness diary & local sprint history',
    ],
    cta: 'Add to Chrome — Free',
  },
  {
    name: 'Gremlin Pro',
    price: '$5',
    per: '/ month',
    icon: <Zap className="w-4 h-4" />,
    blurb: "For when you can't be bothered setting up keys. Fast hosted cloud AI and sync across all your devices.",
    features: [
      'Zero setup — ready to use right after install',
      'Instant cloud AI evaluation & roast engine',
      'Multi-device sync for sprint history, diaries & goals',
      'Custom companion personality tuning & roast sliders',
      'Priority updates & new companions first',
    ],
    cta: 'Start Pro Trial',
    highlight: true,
  },
];

const FAQS: [string, string][] = [
  [
    'Do I need an API key to use Gremlin?',
    'Only if you choose the free version. You can grab a free Google Gemini key in 30 seconds and run completely on-device. With Gremlin Pro, we handle the cloud AI so you never have to touch a key.',
  ],
  [
    'Does Gremlin read or sell my browsing data?',
    'Never. In free BYOK mode, zero data ever touches our servers. When an evaluation happens, only the active tab title and domain are checked against your stated goal. Keystrokes, passwords, form inputs, and personal emails are never accessed or recorded.',
  ],
  [
    'What is the "intention-action gap"?',
    'It’s the distance between what you planned to do this morning and what you actually spent the afternoon doing. Gremlin watches your context in real time and gently intervenes the minute you start drifting, before you lose three hours to rabbit holes.',
  ],
  [
    'Can I switch companions whenever I want?',
    'Anytime. You can switch between Sarge, Waifu, Sherlock, Kuro, Sensei, Byte, Pixel, and UFO right inside the extension popup mid-sprint.',
  ],
  [
    'Can I cancel my subscription anytime?',
    'Yes. One click in the billing portal cancels immediately. No emails, no phone calls, no guilt trips.',
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

  const handleCheckout = () => {
    if (!PADDLE_PRO_PRICE_ID) {
      alert(
        'Paddle Pro price ID (VITE_PADDLE_PRO_PRICE_ID) is not configured yet. Run the seed script in apps/backend or set it in .env.',
      );
      return;
    }
    openPaddleCheckout({
      priceId: PADDLE_PRO_PRICE_ID,
      userEmail: user?.email,
      userId: user?.id,
    });
  };

  return (
    <main className="min-h-screen transition-colors duration-200 text-coal dark:text-white">
      <div className="container-site py-16 lg:py-24">
        <div className="max-w-2xl">
          <Reveal>
            <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight text-coal dark:text-white text-wrap-balance">
              Close the intention-action gap.
            </h1>
            <p className="mt-4 text-[#374151] dark:text-[#D1D5DB] leading-relaxed text-base sm:text-lg">
              You know what you intend to do today. Gremlin makes sure you actually do it. Run it
              locally for free, or pay $5/month if you'd rather not manage your own keys.
            </p>
          </Reveal>
        </div>

        <div className="mt-14 max-w-4xl mx-auto grid md:grid-cols-2 gap-8 items-stretch">
          {TIERS.map((tier, i) => (
            <Reveal key={tier.name} delay={i * 90} className="h-full">
              <div
                className={`relative h-full flex flex-col p-7 rounded-none border-2 transition-all duration-200 ${
                  tier.highlight
                    ? 'bg-base-deep text-ink border-coal dark:border-[#3F4740] shadow-[8px_8px_0_0_#65A30D]'
                    : 'bg-white dark:bg-[#161914] border-coal dark:border-[#3F4740] text-coal dark:text-white shadow-brut dark:shadow-[4px_4px_0_0_#A3E635] hover:-translate-y-1 hover:shadow-brut-lg'
                }`}
              >
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
                  {tier.price === '$0' ? (
                    <a
                      href="https://chromewebstore.google.com"
                      className={PAPER_GHOST_BTN}
                    >
                      {tier.cta}
                    </a>
                  ) : userPlan === 'pro' ? (
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
                  ) : (
                    <button
                      type="button"
                      onClick={handleCheckout}
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
            <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-coal dark:text-white">
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
