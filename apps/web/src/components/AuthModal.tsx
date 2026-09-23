import React, { useState, useEffect } from 'react';
import { Shield, Check, X, ArrowRight, Loader2, LogIn, Sparkles, Zap, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const AuthModal: React.FC = () => {
  const {
    isAuthModalOpen,
    closeAuthModal,
    signInWithGoogle,
    user,
    isAuthenticated,
    isPro,
    signOut,
  } = useAuth();

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Close modal on Escape key press
  useEffect(() => {
    if (!isAuthModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeAuthModal();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAuthModalOpen, closeAuthModal]);

  if (!isAuthModalOpen) return null;

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-coal/70 backdrop-blur-sm animate-fade-in">
      {/* Backdrop click dismiss */}
      <div
        className="absolute inset-0"
        onClick={closeAuthModal}
        aria-hidden="true"
      />

      {/* Modal Dialog Card */}
      <div className="relative w-full max-w-md bg-white dark:bg-[#161914] border-2 border-coal dark:border-[#3F4740] shadow-brut dark:shadow-[4px_4px_0_0_#A3E635] p-6 z-10 text-coal dark:text-white transition-all">
        {/* Close Button */}
        <button
          type="button"
          onClick={closeAuthModal}
          className="absolute right-4 top-4 w-7 h-7 flex items-center justify-center border border-coal/20 dark:border-white/20 hover:border-coal dark:hover:border-white hover:bg-paper dark:hover:bg-[#1E2219] transition-colors cursor-pointer"
          title="Close dialog"
        >
          <X className="w-4 h-4" />
        </button>

        {isAuthenticated ? (
          <div className="text-center space-y-5 pt-2">
            <div className="w-12 h-12 border-2 border-coal bg-accent flex items-center justify-center text-coal shadow-[2px_2px_0_0_#12151A] mx-auto">
              <Check className="w-6 h-6 stroke-[2.5]" />
            </div>

            <div>
              <h2 className="font-display font-bold text-xl text-coal dark:text-white">
                Account Connected
              </h2>
              <p className="text-xs text-[#5D6675] dark:text-[#9CA3AF] font-mono mt-1 truncate">
                Signed in as <span className="font-bold text-coal dark:text-white">{user?.email}</span>
              </p>
              <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 border border-coal text-xs font-mono font-bold uppercase tracking-wider bg-paper dark:bg-[#1E2219]">
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
            </div>

            <p className="text-xs text-[#5D6675] dark:text-[#9CA3AF]">
              Your browser extension is now synced to Gremlin Cloud.
            </p>

            <div className="space-y-2 pt-2">
              {!isPro ? (
                <a
                  href="/pricing"
                  onClick={closeAuthModal}
                  className="w-full bg-accent hover:bg-accent-bright text-coal font-display font-bold tracking-wide py-2.5 border-2 border-coal shadow-brut active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all flex items-center justify-center gap-2 text-xs cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5" />
                  Upgrade to Pro ($5/mo)
                  <ArrowRight className="w-3.5 h-3.5" />
                </a>
              ) : (
                <a
                  href="/pricing"
                  onClick={closeAuthModal}
                  className="w-full bg-paper dark:bg-[#1E2219] hover:bg-paper-subtle text-coal dark:text-white font-display font-bold py-2.5 border-2 border-coal dark:border-[#3F4740] shadow-brut flex items-center justify-center gap-2 text-xs cursor-pointer"
                >
                  Manage Billing
                </a>
              )}

              <button
                type="button"
                onClick={async () => {
                  await signOut();
                }}
                className="w-full bg-transparent hover:bg-coal/5 dark:hover:bg-white/5 text-coal dark:text-white font-mono text-xs font-bold py-2 border border-coal/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-5 pt-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 border-2 border-coal bg-accent flex items-center justify-center text-coal shadow-[2px_2px_0_0_#12151A] shrink-0">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-display text-lg font-bold text-coal dark:text-white leading-tight">
                  Sign in to Gremlin
                </h2>
                <p className="text-[11px] text-[#5D6675] dark:text-[#9CA3AF] mt-0.5">
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
              className="w-full flex items-center justify-center gap-2.5 bg-accent hover:bg-accent-bright text-coal font-display font-bold tracking-wide py-3 px-4 border-2 border-coal shadow-brut active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all text-xs disabled:opacity-60 cursor-pointer"
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

            <div className="pt-2 text-center text-[11px] text-[#5D6675] dark:text-[#9CA3AF] font-mono flex items-center justify-center gap-1.5 border-t border-coal/10 dark:border-white/10 pt-4">
              <Sparkles className="w-3.5 h-3.5 text-accent shrink-0" />
              <span>Prefer local private AI? Switch to free BYOK anytime in settings.</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
