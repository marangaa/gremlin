import React, { useState } from 'react';
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

  const go = (path: string, hash?: string) => {
    setOpen(false);
    if (hash && currentPath === path) {
      document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth' });
    } else if (hash) {
      navigate(path);
      window.setTimeout(() => document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth' }), 100);
    } else {
      navigate(path);
    }
  };

  return (
    <header className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-3xl">
      <div className="flex items-center justify-between gap-3 bg-white dark:bg-[#161914] border-2 border-coal dark:border-[#3F4740] shadow-brut dark:shadow-[3px_3px_0_0_#A3E635] px-3 py-2 transition-colors duration-200">
        {/* Logo */}
        <button onClick={() => go('/')} className="flex items-center gap-2 group cursor-pointer" aria-label="Gremlin home">
          <img
            src="/gremlin-logo.jpg"
            alt="Gremlin Logo"
            className="w-8 h-8 rounded-full border-2 border-coal dark:border-[#3F4740] shadow-[2px_2px_0_0_#12151A] dark:shadow-[2px_2px_0_0_#A3E635] transition-transform duration-200 group-hover:-rotate-6"
          />
          <span className="font-display font-bold tracking-tight text-coal dark:text-white">Gremlin</span>
        </button>

        {/* Desktop links */}
        <nav className="hidden md:flex items-center gap-1">
          {LINKS.map((link) => (
            <button
              key={link.label}
              onClick={() => go(link.path, link.hash)}
              className={`px-3 py-1.5 border-2 text-sm font-medium transition-all cursor-pointer ${
                currentPath === link.path && !link.hash
                  ? 'bg-accent border-coal dark:border-coal shadow-[2px_2px_0_0_#12151A] text-coal'
                  : 'border-transparent text-coal dark:text-[#C8CFC4] hover:border-coal dark:hover:border-[#3F4740] hover:bg-paper dark:hover:bg-[#1E2219]'
              }`}
            >
              {link.label}
            </button>
          ))}
        </nav>

        {/* Right controls */}
        <div className="flex items-center gap-2">
          <a
            href="https://chromewebstore.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 bg-accent border-2 border-coal shadow-[3px_3px_0_0_#12151A] font-display font-bold text-xs text-coal transition-all hover:-translate-y-0.5 hover:shadow-brut active:translate-y-0 active:shadow-none"
          >
            <Download className="w-3.5 h-3.5" />
            Add to Chrome
          </a>

          <button
            className="md:hidden w-9 h-9 flex items-center justify-center border-2 border-coal dark:border-[#3F4740] bg-white dark:bg-[#1A1D18] text-coal dark:text-white cursor-pointer"
            onClick={() => setOpen((o) => !o)}
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
          >
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden mt-2 bg-white dark:bg-[#161914] border-2 border-coal dark:border-[#3F4740] shadow-brut dark:shadow-[3px_3px_0_0_#A3E635] animate-fade-in">
          <nav className="p-3 flex flex-col gap-2">
            {LINKS.map((link) => (
              <button
                key={link.label}
                onClick={() => go(link.path, link.hash)}
                className="px-3 py-2.5 border-2 border-coal dark:border-[#3F4740] bg-paper dark:bg-[#1A1D18] text-coal dark:text-white font-medium text-left cursor-pointer shadow-[3px_3px_0_0_#12151A] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
              >
                {link.label}
              </button>
            ))}
            <a href="https://chromewebstore.google.com" target="_blank" rel="noopener noreferrer" className="btn-primary mt-1">
              <Download className="w-4 h-4" />
              Add to Chrome — Free
            </a>
          </nav>
        </div>
      )}
    </header>
  );
};
