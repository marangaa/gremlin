import React, { useState } from 'react';
import { Shield, Sparkles, Check, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { authClient } from '../lib/auth';

interface AuthProps {
  navigate?: (path: string) => void;
}

export const Auth: React.FC<AuthProps> = ({ navigate }) => {
  const [isSignUp, setIsSignUp] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('mode') === 'signup' || params.get('signup') === 'true';
    }
    return false;
  });
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  React.useEffect(() => {
    void authClient.getSession().then(({ data }) => {
      if (data?.user) {
        setEmail(data.user.email);
        setSuccess(true);
        window.postMessage(
          {
            source: 'gremlin-web',
            type: 'GREMLIN_AUTH_SUCCESS',
            payload: { user: data.user },
          },
          '*',
        );
      }
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    setErrorMsg(null);

    try {
      // Real Better Auth call against the backend: creates the Neon user
      // row and sets a session cookie scoped to the backend domain.
      const result = isSignUp
        ? await authClient.signUp.email({ email, password, name: name || email.split('@')[0] })
        : await authClient.signIn.email({ email, password });

      if (result.error) {
        throw new Error(result.error.message ?? 'Authentication failed.');
      }

      if (result.data?.user) {
        // Broadcast authentication to Gremlin Extension content script running on this tab
        window.postMessage(
          {
            source: 'gremlin-web',
            type: 'GREMLIN_AUTH_SUCCESS',
            payload: { user: result.data.user },
          },
          '*',
        );
      }

      // Option A: If signing up, immediately initiate Polar checkout for the managed Pro tier
      if (isSignUp) {
        try {
          const checkoutRes = await authClient.checkout({ slug: 'pro' });
          if (checkoutRes?.data?.url) {
            window.location.href = checkoutRes.data.url;
            return;
          }
        } catch (checkoutErr) {
          console.warn('Auto-redirect to Polar checkout failed:', checkoutErr);
        }
      }

      setSuccess(true);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="container-site py-20 relative z-10 flex flex-col items-center justify-center min-h-[75vh]">
      <div className="w-full max-w-md py-4 text-coal dark:text-white relative">
        {success ? (
          <div className="bg-white dark:bg-[#161914] border-2 border-coal shadow-brut p-8 text-center space-y-5">
            <div className="w-14 h-14 border-2 border-coal bg-accent flex items-center justify-center text-coal shadow-[2px_2px_0_0_#12151A] mx-auto">
              <Check className="w-7 h-7 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="font-display font-bold text-2xl text-coal dark:text-white">
                Account Connected
              </h2>
              <p className="text-xs text-[#5D6675] dark:text-[#9CA3AF] font-mono mt-1.5">
                Signed in as <span className="font-bold text-coal dark:text-white">{email}</span>
              </p>
              <p className="text-xs text-[#5D6675] dark:text-[#9CA3AF] mt-1">
                Your browser extension is now synced to Gremlin Cloud.
              </p>
            </div>
            <div className="space-y-2">
              <a
                href="/pricing"
                className="w-full bg-accent hover:bg-accent-bright text-coal font-display font-bold tracking-wide py-3 border-2 border-coal shadow-brut active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all flex items-center justify-center gap-2 text-sm cursor-pointer"
              >
                Complete Pro Subscription ($5/mo)
                <ArrowRight className="w-4 h-4" />
              </a>
              {navigate && (
                <button
                  onClick={() => navigate('/')}
                  className="w-full bg-transparent hover:bg-coal/5 text-coal dark:text-white font-mono text-xs font-bold py-2 border border-coal/20 transition-all cursor-pointer"
                >
                  Skip to Dashboard →
                </button>
              )}
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 border-2 border-coal bg-accent flex items-center justify-center text-coal shadow-[2px_2px_0_0_#12151A]">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h1 className="font-display text-2xl font-bold text-coal dark:text-white">
                  {isSignUp ? 'Create your Cloud account' : 'Sign in to Gremlin'}
                </h1>
                <p className="text-xs text-[#5D6675] dark:text-[#9CA3AF] mt-0.5">
                  {isSignUp
                    ? '$5/mo · Turnkey hosted AI, multi-device sync, zero API setup.'
                    : 'Welcome back! Pick up your active sprint and streak.'}
                </p>
              </div>
            </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMsg && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-500 text-xs font-mono font-bold">
                {errorMsg}
              </div>
            )}

            {isSignUp && (
              <div>
                <label className="block text-xs font-mono font-bold text-coal dark:text-white mb-1.5 uppercase tracking-wider">
                  Your Name
                </label>
                <input
                  type="text"
                  className="w-full bg-white dark:bg-[#161914] border-2 border-coal dark:border-[#3F4740] px-3.5 py-2.5 text-sm text-coal dark:text-white placeholder:text-[#9CA3AF] focus:border-coal dark:focus:border-accent focus:outline-none focus:shadow-[2px_2px_0_0_#12151A] transition-all"
                  placeholder="e.g. Alex"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-mono font-bold text-coal dark:text-white mb-1.5 uppercase tracking-wider">
                Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  className="w-full bg-white dark:bg-[#161914] border-2 border-coal dark:border-[#3F4740] px-3.5 py-2.5 text-sm text-coal dark:text-white placeholder:text-[#9CA3AF] focus:border-coal dark:focus:border-accent focus:outline-none focus:shadow-[2px_2px_0_0_#12151A] transition-all"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono font-bold text-coal dark:text-white mb-1.5 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  className="w-full bg-white dark:bg-[#161914] border-2 border-coal dark:border-[#3F4740] pl-3.5 pr-10 py-2.5 text-sm text-coal dark:text-white placeholder:text-[#9CA3AF] focus:border-coal dark:focus:border-accent focus:outline-none focus:shadow-[2px_2px_0_0_#12151A] transition-all"
                  placeholder={isSignUp ? 'Min 8 characters' : '••••••••••••'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-coal dark:hover:text-white transition-colors cursor-pointer"
                  title={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {isSignUp && (
                <p className="text-[11px] font-mono text-[#5D6675] dark:text-[#9CA3AF] mt-1">
                  Must be at least 8 characters
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-accent hover:bg-accent-bright text-coal font-display font-bold tracking-wide py-3 border-2 border-coal shadow-brut active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50 cursor-pointer"
            >
              {loading
                ? (isSignUp ? 'Opening Checkout…' : 'Connecting…')
                : (isSignUp ? 'Continue to Checkout ($5/mo)' : 'Sign In to Cloud')}
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-xs text-[#5D6675] dark:text-[#9CA3AF] hover:text-coal dark:hover:text-white underline underline-offset-4 font-mono font-bold cursor-pointer transition-colors"
              >
                {isSignUp ? 'Already have an account? Sign in →' : "Don't have an account? Create one →"}
              </button>
            </div>
          </form>
        </>
        )}
      </div>

      <div className="mt-8 text-center text-xs text-[#5D6675] dark:text-[#9CA3AF] font-mono flex items-center gap-2">
        <Sparkles className="w-3.5 h-3.5 text-accent" />
        <span>Prefer local private AI? Switch to BYOK anytime in the extension settings.</span>
      </div>
    </main>
  );
};
