import React, { useEffect, useState } from 'react';
import { Download, Menu, X } from 'lucide-react';

interface NavbarProps {
  currentPath: string;
  navigate: (path: string) => void;
}

const LINKS: { label: string; path: string; hash?: string }[] = [
  { label: 'Companions', path: '/', hash: 'companions' },
  { label: 'How it works', path: '/', hash: 'how-it-works' },
  { label: 'Pricing', path: '/pricing' },
];

export const Navbar: React.FC<NavbarProps> = ({ currentPath, navigate }) => {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => setOpen(false), [currentPath]);

  const go = (path: string, hash?: string) => {
    setOpen(false);
    if (hash && currentPath === path) {
      document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth' });
    } else if (hash) {
      navigate(path);
      window.setTimeout(() => {
        document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else {
      navigate(path);
    }
  };

  const isActive = (path: string, hash?: string) => {
    if (hash) {
      return currentPath === path;
    }
    return currentPath === path;
  };

  return (
    <header className="fixed top-4 sm:top-5 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-2xl pointer-events-none">
      {/* Floating Pill Chassis */}
      <div
        className={`pointer-events-auto w-full transition-all duration-300 rounded-full border px-3 sm:px-4 py-2 flex items-center justify-between shadow-pill ${
          scrolled
            ? 'bg-[#10131A]/90 backdrop-blur-2xl border-white/15'
            : 'bg-[#10131A]/75 backdrop-blur-xl border-white/10'
        }`}
      >
        {/* Logo */}
        <button
          onClick={() => go('/')}
          className="flex items-center gap-2 group cursor-pointer pl-1"
          aria-label="Gremlin home"
        >
          <img
            src="/icon.png"
            alt=""
            className="w-7 h-7 rounded-lg ring-1 ring-white/15 transition-transform duration-300 group-hover:rotate-6 group-hover:scale-105"
          />
          <span className="font-display font-bold text-sm tracking-tight text-ink flex items-center gap-1.5">
            Gremlin
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse-dot" />
          </span>
        </button>

        {/* Desktop Links */}
        <nav className="hidden sm:flex items-center gap-1">
          {LINKS.map((link) => {
            const active = isActive(link.path, link.hash);
            return (
              <button
                key={link.label}
                onClick={() => go(link.path, link.hash)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 cursor-pointer ${
                  active
                    ? 'bg-white/10 text-ink shadow-sm'
                    : 'text-ink-muted hover:text-ink hover:bg-white/5'
                }`}
              >
                {link.label}
              </button>
            );
          })}
        </nav>

        {/* CTA Button */}
        <div className="hidden sm:flex items-center">
          <a
            href="https://chromewebstore.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-accent text-base-deep font-display font-semibold text-xs transition-all duration-200 hover:bg-accent-bright hover:shadow-glow active:translate-y-px"
          >
            <Download className="w-3.5 h-3.5" />
            Add to Chrome
          </a>
        </div>

        {/* Mobile menu trigger */}
        <button
          className="sm:hidden p-1.5 rounded-full text-ink-muted hover:text-ink hover:bg-white/5 cursor-pointer"
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile dropdown menu */}
      {open && (
        <div className="pointer-events-auto sm:hidden mt-2 p-3 rounded-2xl bg-[#10131A]/95 backdrop-blur-2xl border border-white/15 shadow-pill animate-fade-in flex flex-col gap-1">
          {LINKS.map((link) => (
            <button
              key={link.label}
              onClick={() => go(link.path, link.hash)}
              className="px-3.5 py-2.5 rounded-xl text-left text-xs font-medium text-ink-muted hover:text-ink hover:bg-white/5 transition-colors cursor-pointer"
            >
              {link.label}
            </button>
          ))}
          <a
            href="https://chromewebstore.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-accent text-base-deep font-display font-semibold text-xs"
          >
            <Download className="w-4 h-4" />
            Add to Chrome — Free
          </a>
        </div>
      )}
    </header>
  );
};
