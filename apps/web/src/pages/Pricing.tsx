import React, { useEffect, useState } from 'react';
import { Check, KeyRound, Zap, MessageSquare } from 'lucide-react';
import { Reveal } from '../components/Reveal';
import { API_URL, authClient } from '../lib/auth';
import { useAuth } from '../context/AuthContext';
import { openCwsListing } from '../lib/links';

/* Paper theme: the deliberate light route on the dark site. */
/* Featured tier inverts back to dark: an island of the night mode. */

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
      'No setup needed, ready right after install',
      'Instant cloud AI evaluation & roast engine',
      'Multi-device sync for sprint history, diaries & goals',
      'Custom companion personality tuning & roast sliders',
      'Priority updates & new companions first',
    ],
    cta: 'Upgrade to Pro',
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
    'What does Gremlin help with?',
    'It bridges the difference between what you planned to do this morning and what you actually spent the afternoon doing. Gremlin watches your context in real time and gently intervenes the minute you start drifting, before you lose three hours to rabbit holes.',
  ],
  [
    'Can I switch companions whenever I want?',
    'Anytime. You can switch between Sarge, Momo, Sherlock, Kuro, Sensei, Byte, Pixel, and Zeta right inside the extension popup mid-sprint.',
  ],
  [
    'Can I cancel my subscription anytime?',
    'Yes. One click in the billing portal cancels immediately. You can cancel at any time with no hassle.',
  ],
];

export const Pricing: React.FC = () => {
  const { openAuthModal } = useAuth();
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const user = session?.user;
  const [profilePlan, setProfilePlan] = useState<'free' | 'pro' | null>(null);
  const [verifiedPro, setVerifiedPro] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [planNotice, setPlanNotice] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [portalError, setPortalError] = useState<string | null>(null);

  // Strict rule: the session cookie is a hint only. The DB mirror
  // (GET /api/user/profile) is the fast authority, and Polar
  // customer.state() is the final verifier — Pro renders ONLY when the
  // server or Polar confirms an active subscription.
  useEffect(() => {
    if (!user) {
      setProfilePlan(null);
      setVerifiedPro(false);
      return;
    }
    let cancelled = false;
    setVerifying(true);
    (async () => {
      try {
        const res = await fetch(`${API_URL}/api/user/profile`, { credentials: 'include' });
        if (!res.ok) return;
        const body = (await res.json()) as { data?: { plan?: string } };
        if (cancelled) return;
        if (body?.data?.plan === 'pro' || body?.data?.plan === 'free') {
          setProfilePlan(body.data.plan);
        }
        // Final verifier: live Polar customer state. Any failure keeps the
        // previous tier (fail-closed on upgrade, fail-open on downgrade is
        // handled by the profile mirror above).
        try {
          const state = await authClient.customer.state();
          const subs = (state?.data as { activeSubscriptions?: unknown[] } | undefined)
            ?.activeSubscriptions;
          if (!cancelled && Array.isArray(subs)) {
            setVerifiedPro(subs.length > 0);
          }
        } catch {
          /** Polar unreachable: trust the DB mirror. */
        }
      } catch {
        // Offline / backend down: fall back to session hint below.
      } finally {
        if (!cancelled) setVerifying(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  // Surface the Polar return-trip (?checkout_id=&success=) exactly once, then
  // re-verify the tier — the badge flips only when Polar confirms.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('success') === 'true' && params.get('checkout_id')) {
      setPlanNotice('Checkout complete — confirming your subscription with Polar…');
      params.delete('checkout_id');
      params.delete('success');
      const clean = `${window.location.pathname}${params.toString() ? `?${params}` : ''}`;
      window.history.replaceState({}, '', clean);
      void (async () => {
        try {
          const state = await authClient.customer.state();
          const subs = (state?.data as { activeSubscriptions?: unknown[] } | undefined)
            ?.activeSubscriptions;
          if (Array.isArray(subs) && subs.length > 0) {
            setVerifiedPro(true);
            setProfilePlan('pro');
            setPlanNotice('Pro Active — subscription confirmed.');
            if (user?.email) {
              window.postMessage(
                {
                  source: 'gremlin-web',
                  type: 'GREMLIN_AUTH_SUCCESS',
                  payload: { user: { ...user, plan: 'pro' } },
                },
                '*',
              );
            }
          } else {
            setPlanNotice('Checkout complete — your Pro subscription is activating. Usually ready within a minute; refresh if the badge lags.');
          }
        } catch {
          setPlanNotice('Checkout complete — your Pro subscription is activating. Usually ready within a minute; refresh if the badge lags.');
        }
      })();
    }
  }, [user]);

  // Strict: Pro renders ONLY on server confirmation. Session cookie alone
  // never grants Pro (it can lag webhook flips in either direction).
  const userPlan: 'free' | 'pro' = profilePlan === 'pro' || verifiedPro ? 'pro' : 'free';
  const planLoading = sessionPending || verifying;

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    setPortalError(null);
    try {
      const res = await authClient.customer.portal();
      if (res?.data?.url) {
        window.location.href = res.data.url;
      } else {
        setPortalError(res?.error?.message || 'Customer portal is not available yet.');
      }
    } catch (err: unknown) {
      setPortalError(err instanceof Error ? err.message : 'Failed to open customer portal');
    } finally {
      setPortalLoading(false);
    }
  };

  const handleCheckout = async () => {
    if (!user) {
      openAuthModal();
      return;
    }

    setCheckoutLoading(true);
    setCheckoutError(null);
    try {
      const res = await authClient.checkout({ slug: 'pro' });
      if (res?.data?.url) {
        window.location.href = res.data.url;
      } else {
        setCheckoutError(res?.error?.message || 'Checkout is not configured yet. Set POLAR_PRO_PRODUCT_ID on the backend.');
      }
    } catch (err: unknown) {
      setCheckoutError(err instanceof Error ? err.message : 'Failed to initiate checkout');
    } finally {
      setCheckoutLoading(false);
    }
  };

  return (
    <main className="min-h-screen transition-colors duration-200 text-coal dark:text-white">
      <div className="container-site py-16 lg:py-24">
        <div className="max-w-2xl">
          <Reveal>
            <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight text-coal dark:text-white text-wrap-balance">
              Do what you set out to do.
            </h1>
            <p className="mt-4 text-[#374151] dark:text-[#D1D5DB] leading-relaxed text-base sm:text-lg">
              You know what you intend to do today. Gremlin makes sure you actually do it. Run it
              locally for free, or pay $5/month if you'd rather not manage your own keys.
            </p>
          </Reveal>
        </div>

        {planNotice && (
          <div className="mt-8 max-w-4xl mx-auto p-4 border-2 border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-sm font-mono">
            {planNotice}
          </div>
        )}

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
                    <button
                      type="button"
                      onClick={openCwsListing}
                      className={PAPER_GHOST_BTN}
                    >
                      {tier.cta}
                    </button>
                  ) : userPlan === 'pro' ? (
                    <div className="space-y-2">
                      <p className="text-[11px] font-mono text-center text-emerald-700 dark:text-emerald-300 font-bold">
                        Pro Active — active subscription
                      </p>
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
                      {portalError && (
                        <p className="text-[11px] font-mono text-center text-red-600 dark:text-red-400">
                          {portalError}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={handleCheckout}
                        disabled={checkoutLoading}
                        className={
                          tier.highlight
                            ? 'w-full text-center block px-5 py-3 rounded-none border-2 border-coal bg-accent font-display font-bold text-sm text-coal shadow-[4px_4px_0_0_#12151A] transition-transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer disabled:opacity-50'
                            : PAPER_GHOST_BTN
                        }
                      >
                        {checkoutLoading
                          ? 'Starting checkout...'
                          : planLoading
                            ? 'Checking subscription…'
                            : !user
                              ? 'Sign in to get Pro'
                              : 'Upgrade to Pro — $5/mo'}
                      </button>
                      {checkoutError && (
                        <p className="text-[11px] font-mono text-center text-red-600 dark:text-red-400">
                          {checkoutError}
                        </p>
                      )}
                      {!user ? (
                        <p className="text-[11px] font-mono text-center text-[#5D6675] dark:text-[#9CA3AF]">
                          Sign in or create account to activate Pro
                        </p>
                      ) : (
                        <p className="text-[11px] font-mono text-center text-[#5D6675] dark:text-[#9CA3AF]">
                          Signed in as: {user.email}
                        </p>
                      )}
                    </div>
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
