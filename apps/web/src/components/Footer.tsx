import React from 'react';
import { ArrowUp, Mail, GitBranch } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';

interface FooterProps {
  navigate: (path: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ navigate }) => {
  return (
    <footer className="relative z-10 transition-colors duration-200">
      <div className="container-site pt-12 pb-8">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-10">
          {/* Brand & Mission */}
          <div className="max-w-sm space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <img
                src="/gremlin-logo.jpg"
                alt="Gremlin logo"
                className="w-10 h-10 rounded-full border-2 border-coal dark:border-[#3F4740] shadow-[2px_2px_0_0_#12151A] dark:shadow-[2px_2px_0_0_#A3E635]"
              />
              <span className="font-display font-extrabold text-2xl tracking-tight text-coal dark:text-white">
                Gremlin
              </span>
            </div>
            <p className="text-sm text-[#5D6675] dark:text-[#7A8578] leading-relaxed font-medium">
              A pixel desk companion that keeps you focused without frustrating site blacklists.
            </p>
          </div>

          {/* Nav & Contact Links */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 sm:gap-12">
            {/* Product */}
            <div className="space-y-3">
              <div className="font-mono text-xs uppercase tracking-wider text-[#9AA3B2] dark:text-[#5A6357]">Product</div>
              <ul className="space-y-2 text-sm font-medium">
                <li>
                  <button
                    onClick={() => {
                      navigate('/');
                      document.getElementById('companions')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="text-[#5D6675] dark:text-[#8A9487] hover:text-coal dark:hover:text-white hover:underline decoration-2 underline-offset-4 transition-colors cursor-pointer"
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
                    className="text-[#5D6675] dark:text-[#8A9487] hover:text-coal dark:hover:text-white hover:underline decoration-2 underline-offset-4 transition-colors cursor-pointer"
                  >
                    How it works
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => navigate('/pricing')}
                    className="text-[#5D6675] dark:text-[#8A9487] hover:text-coal dark:hover:text-white hover:underline decoration-2 underline-offset-4 transition-colors cursor-pointer"
                  >
                    Pricing
                  </button>
                </li>
              </ul>
            </div>

            {/* Contact & Socials */}
            <div className="space-y-3">
              <div className="font-mono text-xs uppercase tracking-wider text-[#9AA3B2] dark:text-[#5A6357]">Connect</div>
              <ul className="space-y-2 text-sm font-medium">
                <li>
                  <a
                    href="mailto:rchdmaranga@gmail.com"
                    className="inline-flex items-center gap-2 text-[#5D6675] dark:text-[#8A9487] hover:text-coal dark:hover:text-white transition-colors"
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
                    className="inline-flex items-center gap-2 text-[#5D6675] dark:text-[#8A9487] hover:text-coal dark:hover:text-white transition-colors"
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
                    className="inline-flex items-center gap-2 text-[#5D6675] dark:text-[#8A9487] hover:text-coal dark:hover:text-white transition-colors"
                  >
                    <GitBranch className="w-3.5 h-3.5" />
                    GitHub
                  </a>
                </li>
              </ul>
            </div>

            {/* Legal */}
            <div className="space-y-3">
              <div className="font-mono text-xs uppercase tracking-wider text-[#9AA3B2] dark:text-[#5A6357]">Legal</div>
              <ul className="space-y-2 text-sm font-medium">
                <li>
                  <button
                    onClick={() => navigate('/privacy')}
                    className="text-[#5D6675] dark:text-[#8A9487] hover:text-coal dark:hover:text-white hover:underline decoration-2 underline-offset-4 transition-colors cursor-pointer"
                  >
                    Privacy Policy
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => navigate('/terms')}
                    className="text-[#5D6675] dark:text-[#8A9487] hover:text-coal dark:hover:text-white hover:underline decoration-2 underline-offset-4 transition-colors cursor-pointer"
                  >
                    Terms of Service
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-6 border-t-2 border-dashed border-[#E5E5DC] dark:border-[#2A2E27] flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="font-mono text-xs text-[#9AA3B2] dark:text-[#5A6357] font-bold">
            © {new Date().getFullYear()} Gremlin. Crafted for deep focus.
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-[#1A1D18] border-2 border-coal dark:border-[#3F4740] shadow-[2px_2px_0_0_#12151A] dark:shadow-[2px_2px_0_0_#A3E635] font-mono text-[11px] font-bold text-coal dark:text-white transition-all hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_#12151A] dark:hover:shadow-[3px_3px_0_0_#A3E635] active:translate-y-0 active:shadow-none cursor-pointer"
            >
              Back to top
              <ArrowUp className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </footer>

  );
};
