import React, { useState } from 'react';
import { Shield, Sparkles, Check, ArrowRight, Mail, Key } from 'lucide-react';

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
      // Simulate / call auth backend
      await new Promise((resolve) => setTimeout(resolve, 800));
      setSuccess(true);

      // If opened from extension, broadcast session message
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
      <div className="w-full max-w-md bg-[#10121a] border-2 border-white/10 rounded-xl p-8 shadow-[6px_6px_0px_#000000] relative">
        {/* Glow corner */}
        <div className="absolute -top-3 -right-3 px-2.5 py-1 bg-accent text-black text-[11px] font-mono font-bold rounded border border-black shadow-[2px_2px_0px_#000]">
          GREMLIN CLOUD
        </div>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-surface border border-white/10 flex items-center justify-center text-accent">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold text-ink">
              {isSignUp ? 'Create your account' : 'Sign in to Gremlin'}
            </h1>
            <p className="text-xs text-ink-muted">
              {isSignUp ? 'Sync your companion and stats everywhere' : 'Welcome back! Sync your focus streak.'}
            </p>
          </div>
        </div>

        {success ? (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center">
              <Check className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-emerald-300">Account connected!</h3>
              <p className="text-xs text-emerald-400/80 mt-1">
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
              <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded font-mono">
                {errorMsg}
              </div>
            )}

            {isSignUp && (
              <div>
                <label className="block text-xs font-mono text-ink-muted mb-1.5">Your Name</label>
                <input
                  type="text"
                  className="w-full bg-[#090b11] border-2 border-white/15 rounded-lg px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none"
                  placeholder="e.g. Alex"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-mono text-ink-muted mb-1.5">Email Address</label>
              <div className="relative">
                <input
                  type="email"
                  required
                  className="w-full bg-[#090b11] border-2 border-white/15 rounded-lg pl-9 pr-3.5 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <Mail className="w-4 h-4 text-ink-faint absolute left-3 top-3" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono text-ink-muted mb-1.5">Password</label>
              <div className="relative">
                <input
                  type="password"
                  required
                  className="w-full bg-[#090b11] border-2 border-white/15 rounded-lg pl-9 pr-3.5 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <Key className="w-4 h-4 text-ink-faint absolute left-3 top-3" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-accent hover:bg-accent-hover text-black font-bold py-2.5 rounded-lg border-2 border-black shadow-[3px_3px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_#000] transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50"
            >
              {loading ? 'Syncing…' : isSignUp ? 'Create Cloud Account' : 'Sign In to Cloud'}
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="relative my-6 text-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10" />
              </div>
              <span className="relative px-3 bg-[#10121a] text-[11px] font-mono text-ink-muted uppercase tracking-wider">
                Or continue with
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => alert('Google OAuth sign-in flow')}
                className="flex items-center justify-center gap-2 bg-[#181b24] hover:bg-[#202430] border border-white/10 text-xs font-medium py-2 rounded text-ink transition-colors"
              >
                <span>Google</span>
              </button>
              <button
                type="button"
                onClick={() => alert('GitHub OAuth sign-in flow')}
                className="flex items-center justify-center gap-2 bg-[#181b24] hover:bg-[#202430] border border-white/10 text-xs font-medium py-2 rounded text-ink transition-colors"
              >
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                </svg>
                <span>GitHub</span>
              </button>
            </div>

            <div className="pt-4 text-center">
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-xs text-ink-muted hover:text-accent underline font-mono"
              >
                {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Create one"}
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="mt-8 text-center text-xs text-ink-muted font-mono flex items-center gap-2">
        <Sparkles className="w-3.5 h-3.5 text-accent" />
        <span>Prefer local free AI? Switch to BYOK in the extension settings.</span>
      </div>
    </main>
  );
};
