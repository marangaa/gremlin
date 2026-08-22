import React from 'react';
import { ArrowUp, Mail, GitBranch } from 'lucide-react';

interface FooterProps {
  navigate: (path: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ navigate }) => {
  return (
    <footer className="relative z-10 bg-paper">
      <div className="container-site pt-12 pb-8">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-10">
          {/* Brand & Mission */}
          <div className="max-w-sm space-y-4">
            <div className="flex items-center gap-2.5">
              <img
                src="/icon.png"
                alt="Gremlin logo"
                className="w-9 h-9 border-2 border-coal shadow-[2px_2px_0_0_#12151A]"
              />
              <span className="font-display font-bold text-lg tracking-tight text-coal">Gremlin</span>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 -rotate-2 bg-pop-yellow border-2 border-coal shadow-[2px_2px_0_0_#12151A] font-mono text-[10px] font-bold text-coal">
                <span className="w-1.5 h-1.5 bg-coal animate-pulse-dot" />
                v0.4
              </span>
            </div>
            <p className="text-sm text-paper-muted leading-relaxed font-medium">
              A pixel desk companion that keeps you focused without frustrating site blacklists.
            </p>
          </div>

          {/* Nav & Contact Links */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 sm:gap-12">
            {/* Product */}
            <div className="space-y-3">
              <div className="font-mono text-xs uppercase tracking-wider text-paper-faint">Product</div>
              <ul className="space-y-2 text-sm font-medium">
                <li>
                  <button
                    onClick={() => {
                      navigate('/');
                      document.getElementById('companions')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="text-paper-muted hover:text-coal hover:underline decoration-2 underline-offset-4 transition-colors cursor-pointer"
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
                    className="text-paper-muted hover:text-coal hover:underline decoration-2 underline-offset-4 transition-colors cursor-pointer"
                  >
                    How it works
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => navigate('/pricing')}
                    className="text-paper-muted hover:text-coal hover:underline decoration-2 underline-offset-4 transition-colors cursor-pointer"
                  >
                    Pricing
                  </button>
                </li>
              </ul>
            </div>

            {/* Contact & Socials */}
            <div className="space-y-3">
              <div className="font-mono text-xs uppercase tracking-wider text-paper-faint">Connect</div>
              <ul className="space-y-2 text-sm font-medium">
                <li>
                  <a
                    href="mailto:rchdmaranga@gmail.com"
                    className="inline-flex items-center gap-2 text-paper-muted hover:text-coal transition-colors"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    Email
                  </a>
                </li>
                <li>
                  <a
                    href="https://x.com/rmarangaa"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-paper-muted hover:text-coal transition-colors"
                  >
                    <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
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
                    className="inline-flex items-center gap-2 text-paper-muted hover:text-coal transition-colors"
                  >
                    <GitBranch className="w-3.5 h-3.5" />
                    GitHub
                  </a>
                </li>
              </ul>
            </div>

            {/* Legal */}
            <div className="space-y-3">
              <div className="font-mono text-xs uppercase tracking-wider text-paper-faint">Legal</div>
              <ul className="space-y-2 text-sm font-medium">
                <li>
                  <button
                    onClick={() => navigate('/privacy')}
                    className="text-paper-muted hover:text-coal hover:underline decoration-2 underline-offset-4 transition-colors cursor-pointer"
                  >
                    Privacy Policy
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => navigate('/terms')}
                    className="text-paper-muted hover:text-coal hover:underline decoration-2 underline-offset-4 transition-colors cursor-pointer"
                  >
                    Terms of Service
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-6 border-t-2 border-dashed border-line flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="font-mono text-xs text-paper-faint font-bold">
            © {new Date().getFullYear()} Gremlin. Crafted for deep focus.
          </div>
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border-2 border-coal shadow-[2px_2px_0_0_#12151A] font-mono text-[11px] font-bold text-coal transition-all hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_#12151A] active:translate-y-0 active:shadow-none cursor-pointer"
          >
            Back to top
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </footer>
  );
};
