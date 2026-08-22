import React from 'react';
import { Mail, GitBranch } from 'lucide-react';

interface FooterProps {
  navigate: (path: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ navigate }) => {
  return (
    <footer className="relative z-10 border-t-2 border-coal bg-white pb-16 pt-12">
      <div className="container-site pt-4">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-10">
          {/* Brand & Mission */}
          <div className="max-w-sm space-y-3">
            <div className="flex items-center gap-2.5">
              <img src="/icon.png" alt="Gremlin logo" className="w-7 h-7 border-2 border-coal" />
              <span className="font-display font-bold text-coal">Gremlin</span>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-accent/10 border border-accent/20 font-mono text-[10px] text-accent">
                <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse-dot" />
                v0.4
              </span>
            </div>
            <p className="text-sm text-ink-muted leading-relaxed">
              A pixel desk companion that keeps you focused without frustrating site blacklists.
            </p>
            <div className="font-mono text-xs text-ink-faint pt-1">
              © {new Date().getFullYear()} Gremlin. Crafted for deep focus.
            </div>
          </div>

          {/* Nav & Contact Links */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 sm:gap-12">
            {/* Product */}
            <div className="space-y-3">
              <div className="font-mono text-xs uppercase tracking-wider text-ink-faint">Product</div>
              <ul className="space-y-2 text-sm font-medium">
                <li>
                  <button
                    onClick={() => {
                      navigate('/');
                      document.getElementById('companions')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="text-ink-muted hover:text-ink transition-colors cursor-pointer"
                  >
                    Companions
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => {
                      navigate('/');
                      document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="text-ink-muted hover:text-ink transition-colors cursor-pointer"
                  >
                    How it works
                  </button>
                </li>
                <li>
                  <button onClick={() => navigate('/pricing')} className="text-ink-muted hover:text-ink transition-colors cursor-pointer">
                    Pricing
                  </button>
                </li>
              </ul>
            </div>

            {/* Contact & Socials */}
            <div className="space-y-3">
              <div className="font-mono text-xs uppercase tracking-wider text-ink-faint">Connect</div>
              <ul className="space-y-2 text-sm font-medium">
                <li>
                  <a
                    href="mailto:rchdmaranga@gmail.com"
                    className="inline-flex items-center gap-2 text-ink-muted hover:text-ink transition-colors"
                  >
                    <Mail className="w-3.5 h-3.5 text-accent" />
                    Email
                  </a>
                </li>
                <li>
                  <a
                    href="https://x.com/rmarangaa"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-ink-muted hover:text-ink transition-colors"
                  >
                    <svg className="w-3.5 h-3.5 text-ink fill-current" viewBox="0 0 24 24">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                    @rmarangaa
                  </a>
                </li>
                <li>
                  <a
                    href="https://github.com/marangaa/gremlin"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-ink-muted hover:text-ink transition-colors"
                  >
                    <GitBranch className="w-3.5 h-3.5" />
                    GitHub
                  </a>
                </li>
              </ul>
            </div>

            {/* Legal */}
            <div className="space-y-3">
              <div className="font-mono text-xs uppercase tracking-wider text-ink-faint">Legal</div>
              <ul className="space-y-2 text-sm font-medium">
                <li>
                  <button onClick={() => navigate('/privacy')} className="text-ink-muted hover:text-ink transition-colors cursor-pointer">
                    Privacy Policy
                  </button>
                </li>
                <li>
                  <button onClick={() => navigate('/terms')} className="text-ink-muted hover:text-ink transition-colors cursor-pointer">
                    Terms of Service
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
