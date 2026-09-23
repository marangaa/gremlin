import React, { useState, useEffect } from 'react';
import { Shield, Sparkles, Check, ArrowRight, Loader2, LogIn, Zap, LogOut, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { authClient } from '../lib/auth';

interface AuthProps {
  navigate?: (path: string) => void;
}

export const Auth: React.FC<AuthProps> = ({ navigate }) => {
  const { user, isAuthenticated, isPro, signInWithGoogle, signOut } = useAuth();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isAutostart =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('autostart') === 'google';

  const isConnected =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('connected') === 'true';

  // If extension launched this page with autostart=google, immediately initiate Google OAuth redirect
  useEffect(() => {
    if (isAutostart && !isAuthenticated) {
      void authClient.signIn.social({
        provider: 'google',
        callbackURL: '/auth?connected=true',
      });
    }
  }, [isAutostart, isAuthenticated]);

  // If redirected back with connected=true, auto-close after 2.5s if opened as a popup
  useEffect(() => {
    if (isConnected && isAuthenticated) {
      const timer = setTimeout(() => {
        try {
          window.close();
        } catch {}
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [isConnected, isAuthenticated]);

  const handleSignIn = async () => {
    setLoading(true);
    setErrorMsg(null);
    const result = await signInWithGoogle();
    setLoading(false);
    if (!result.success) {
      setErrorMsg(result.error || 'Sign-in failed. Please try again.');
    }
  };

  return (
    <main className="container-site py-20 relative z-10 flex flex-col items-center justify-center min-h-[75vh]">
      <div className="w-full max-w-md py-4 text-coal dark:text-white relative">
        {isAutostart && !isAuthenticated ? (
          <div className="bg-white dark:bg-[#161914] border-2 border-coal dark:border-[#3F4740] shadow-brut dark:shadow-[4px_4px_0_0_#A3E635] p-8 text-center space-y-4">
            <Loader2 className="w-8 h-8 animate-spin text-accent mx-auto" />
            <h2 className="font-display font-bold text-xl text-coal dark:text-white">
              Connecting to Google…
            </h2>
            <p className="font-mono text-xs text-[#5D6675] dark:text-[#9CA3AF]">
              Redirecting to Google authentication
            </p>
          </div>
        ) : isAuthenticated ? (
          <div className="bg-white dark:bg-[#161914] border-2 border-coal dark:border-[#3F4740] shadow-brut dark:shadow-[4px_4px_0_0_#A3E635] p-8 text-center space-y-5">
            <div className="w-14 h-14 border-2 border-coal bg-accent flex items-center justify-center text-coal shadow-[2px_2px_0_0_#12151A] mx-auto">
              <Check className="w-7 h-7 stroke-[2.5]" />
            </div>

            <div>
              <h2 className="font-display font-bold text-2xl text-coal dark:text-white">
                Account Connected
              </h2>
              <p className="text-xs text-[#5D6675] dark:text-[#9CA3AF] font-mono mt-1.5 truncate">
                Signed in as <span className="font-bold text-coal dark:text-white">{user?.email}</span>
              </p>
              <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 border border-coal text-xs font-mono font-bold uppercase tracking-wider bg-paper dark:bg-[#1E2219]">
                {isPro ? (
                  <>
                    <Zap className="w-3.5 h-3.5 text-accent fill-accent" />
                    <span className="text-accent">Pro Active</span>
                  </>
                ) : (
                  <>
                    <span className="text-paper-muted">Free Plan</span>
                  </>
                )}
              </div>
              <p className="text-xs text-[#5D6675] dark:text-[#9CA3AF] mt-2">
                Your browser extension is now synced to Gremlin Cloud.
              </p>
            </div>

            <div className="space-y-2 pt-2">
              {isConnected ? (
                <button
                  type="button"
                  onClick={() => {
                    try {
                      window.close();
                    } catch {}
                  }}
                  className="w-full bg-accent hover:bg-accent-bright text-coal font-display font-bold tracking-wide py-2.5 border-2 border-coal shadow-brut flex items-center justify-center gap-2 text-xs cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  Close Window
                </button>
              ) : !isPro ? (
                <a
                  href="/pricing"
                  className="w-full bg-accent hover:bg-accent-bright text-coal font-display font-bold tracking-wide py-3 border-2 border-coal shadow-brut active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all flex items-center justify-center gap-2 text-sm cursor-pointer"
                >
                  <Zap className="w-4 h-4" />
                  Complete Pro Subscription ($5/mo)
                  <ArrowRight className="w-4 h-4" />
                </a>
              ) : (
                <a
                  href="/pricing"
                  className="w-full bg-paper dark:bg-[#1E2219] hover:bg-paper-subtle text-coal dark:text-white font-display font-bold py-3 border-2 border-coal dark:border-[#3F4740] shadow-brut flex items-center justify-center gap-2 text-sm cursor-pointer"
                >
                  Manage Billing
                </a>
              )}

              <button
                type="button"
                onClick={async () => {
                  await signOut();
                }}
                className="w-full bg-transparent hover:bg-coal/5 dark:hover:bg-white/5 text-coal dark:text-white font-mono text-xs font-bold py-2 border border-coal/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out
              </button>

              {navigate && !isConnected && (
                <button
                  type="button"
                  onClick={() => navigate('/')}
                  className="w-full bg-transparent text-paper-muted hover:text-coal dark:hover:text-white font-mono text-xs py-1 transition-all cursor-pointer"
                >
                  Skip to Dashboard →
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-[#161914] border-2 border-coal dark:border-[#3F4740] shadow-brut dark:shadow-[4px_4px_0_0_#A3E635] p-8 space-y-6">
            <div className="flex items-center gap-3 pb-2 border-b-2 border-coal/10 dark:border-white/10">
              <div className="w-10 h-10 border-2 border-coal bg-accent flex items-center justify-center text-coal shadow-[2px_2px_0_0_#12151A] shrink-0">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h1 className="font-display text-2xl font-bold text-coal dark:text-white">
                  Sign in to Gremlin
                </h1>
                <p className="text-xs text-[#5D6675] dark:text-[#9CA3AF] mt-0.5">
                  Cloud AI, multi-device sync, streak tracking · $5/mo after trial
                </p>
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-500 text-xs font-mono font-bold">
                {errorMsg}
              </div>
            )}

            {/* Google OAuth Button */}
            <button
              type="button"
              disabled={loading}
              onClick={handleSignIn}
              className="w-full flex items-center justify-center gap-2.5 bg-accent hover:bg-accent-bright text-coal font-display font-bold tracking-wide py-3.5 px-4 border-2 border-coal shadow-brut active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all text-sm disabled:opacity-60 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-coal" />
                  Opening Google sign-in…
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  Continue with Google
                </>
              )}
            </button>

            <div className="pt-2 text-center text-xs text-[#5D6675] dark:text-[#9CA3AF] font-mono flex items-center justify-center gap-1.5 border-t border-coal/10 dark:border-white/10 pt-4">
              <Sparkles className="w-3.5 h-3.5 text-accent shrink-0" />
              <span>Prefer local private AI? Switch to free BYOK anytime in settings.</span>
            </div>
          </div>
        )}
      </div>
    </main>
  );
};
