import React, { useState } from 'react';
import { Shield, Sparkles, Check, ArrowRight } from 'lucide-react';
import { authClient } from '../lib/auth';

interface AuthProps {
  navigate?: (path: string) => void;
}

export const Auth: React.FC<AuthProps> = ({ navigate }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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
      setSuccess(true);

      // Legacy handoff signal: kept for any opener that listens.
      if (window.opener) {
        window.opener.postMessage(
          {
            type: 'GREMLIN_AUTH_SUCCESS',
            user: { email, name: name || email.split('@')[0] },
          },
          '*',
        );
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="container-site py-20 relative z-10 flex flex-col items-center justify-center min-h-[75vh]">
      <div className="w-full max-w-md py-4 text-coal dark:text-white relative">
        {/* Refined inline badge */}
        <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-accent/20 border border-accent/40 text-coal dark:text-accent text-[11px] font-mono font-bold uppercase tracking-wider mb-5">
          <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
          <span>Gremlin Cloud</span>
        </div>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 border-2 border-coal bg-accent flex items-center justify-center text-coal shadow-[2px_2px_0_0_#12151A]">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-coal dark:text-white">
              {isSignUp ? 'Create your account' : 'Sign in to Gremlin'}
            </h1>
            <p className="text-xs text-[#5D6675] dark:text-[#9CA3AF] mt-0.5">
              {isSignUp ? 'Sync your companion, goals, and daily diaries everywhere.' : 'Welcome back! Pick up your active sprint and streak.'}
            </p>
          </div>
        </div>

        {success ? (
          <div className="bg-emerald-500/10 border-2 border-emerald-500/30 p-6 text-center space-y-4">
            <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center">
              <Check className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-display font-bold text-emerald-300 text-base">Account connected</h3>
              <p className="text-xs text-emerald-400/90 font-mono mt-1">
                Your browser extension is now synced to Gremlin Cloud.
              </p>
            </div>
            {navigate && (
              <button onClick={() => navigate('/')} className="btn-primary w-full text-xs py-2">
                Return to home
              </button>
            )}
          </div>
        ) : (
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
                  type="password"
                  required
                  className="w-full bg-white dark:bg-[#161914] border-2 border-coal dark:border-[#3F4740] px-3.5 py-2.5 text-sm text-coal dark:text-white placeholder:text-[#9CA3AF] focus:border-coal dark:focus:border-accent focus:outline-none focus:shadow-[2px_2px_0_0_#12151A] transition-all"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-accent hover:bg-accent-bright text-coal font-display font-bold tracking-wide py-3 border-2 border-coal shadow-brut active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Connecting…' : isSignUp ? 'Create Cloud Account' : 'Sign In to Cloud'}
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
        )}
      </div>

      <div className="mt-8 text-center text-xs text-[#5D6675] dark:text-[#9CA3AF] font-mono flex items-center gap-2">
        <Sparkles className="w-3.5 h-3.5 text-accent" />
        <span>Prefer local private AI? Switch to BYOK anytime in the extension settings.</span>
      </div>
    </main>
  );
};
