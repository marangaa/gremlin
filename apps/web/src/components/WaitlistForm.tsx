import React, { useState } from 'react';
import { Mail, ArrowRight, Check, Sparkles } from 'lucide-react';
import { API_URL } from '../lib/auth';

interface WaitlistFormProps {
  className?: string;
  source?: string;
}

export const WaitlistForm: React.FC<WaitlistFormProps> = ({ className = '', source = 'website' }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_URL}/api/waitlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), source }),
      });

      const data: any = await res.json();
      if (res.ok && data.success) {
        setSubmitted(true);
      } else {
        setError(data.error || 'Could not join the waitlist. Please try again.');
      }
    } catch {
      setError('Network error. Please try again in a moment.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className={`p-4 bg-lime-500/10 dark:bg-[#1C2814] border-2 border-[#65A30D] dark:border-accent text-coal dark:text-white flex items-center gap-3 shadow-brut-sm ${className}`}>
        <div className="w-8 h-8 rounded-full bg-accent text-coal flex items-center justify-center shrink-0">
          <Check className="w-4 h-4 stroke-[3]" />
        </div>
        <div className="text-left">
          <p className="font-display font-bold text-sm text-coal dark:text-white">You're on the early access list!</p>
          <p className="font-mono text-xs text-[#4B5563] dark:text-[#9CA3AF]">We'll send your invite as soon as the Chrome extension launches.</p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={`w-full max-w-md ${className}`}>
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email for early access"
            className="w-full bg-white dark:bg-[#161914] border-2 border-coal dark:border-[#3F4740] rounded-none pl-9 pr-3 py-2.5 text-sm text-coal dark:text-white placeholder:text-[#9CA3AF] focus:border-[#65A30D] dark:focus:border-accent focus:outline-none focus:shadow-brut-sm transition-shadow font-mono"
          />
          <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="btn-primary flex items-center justify-center gap-2 py-2.5 px-5 shrink-0 cursor-pointer disabled:opacity-60"
        >
          {loading ? (
            'Joining…'
          ) : (
            <>
              <span>Get Notified</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-red-500 font-mono text-left">{error}</p>}
      <div className="mt-2.5 flex items-center gap-1.5 text-[11px] font-mono text-[#5D6675] dark:text-[#9CA3AF] text-left">
        <Sparkles className="w-3 h-3 text-accent" />
        <span>Free local BYOK + cloud sync options at launch. Zero spam.</span>
      </div>
    </form>
  );
};
