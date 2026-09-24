import React, { useState } from 'react';
import { Download, Menu, X, LogIn, LogOut, User, Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { openCwsListing } from '../lib/links';

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
  const { user, isAuthenticated, isPro, signOut, openAuthModal } = useAuth();

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
          {isAuthenticated ? (
            <div className="hidden sm:flex items-center gap-1.5">
              <div className="flex items-center gap-1.5 px-2.5 py-1 border-2 border-coal dark:border-[#3F4740] bg-paper dark:bg-[#1E2219]">
                <User className="w-3.5 h-3.5 text-coal dark:text-white shrink-0" />
                <span className="font-mono text-xs font-bold text-coal dark:text-white max-w-[120px] truncate">
                  {user?.name || user?.email?.split('@')[0] || 'User'}
                </span>
                {isPro ? (
                  <span className="inline-flex items-center gap-0.5 px-1 py-0.2 bg-accent text-coal text-[9px] font-mono font-bold">
                    <Zap className="w-2.5 h-2.5 fill-current" />
                    PRO
                  </span>
                ) : (
                  <span className="px-1 py-0.2 bg-coal/10 dark:bg-white/10 text-coal dark:text-white text-[9px] font-mono">
                    FREE
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => void signOut()}
                title="Sign Out"
                className="p-1.5 border-2 border-transparent hover:border-coal dark:hover:border-[#3F4740] text-coal dark:text-[#C8CFC4] hover:bg-paper dark:hover:bg-[#1E2219] transition-all cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={openAuthModal}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 border-2 border-transparent hover:border-coal dark:hover:border-[#3F4740] font-mono text-xs font-bold text-coal dark:text-[#C8CFC4] hover:bg-paper dark:hover:bg-[#1E2219] transition-all cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              Sign In
            </button>
          )}

          <button
            onClick={openCwsListing}
            className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 bg-accent border-2 border-coal shadow-[3px_3px_0_0_#12151A] font-display font-bold text-xs text-coal transition-all hover:-translate-y-0.5 hover:shadow-brut active:translate-y-0 active:shadow-none cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Get Gremlin Free
          </button>

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

            {isAuthenticated ? (
              <div className="p-3 border-2 border-coal dark:border-[#3F4740] bg-paper dark:bg-[#1A1D18] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-coal dark:text-white shrink-0" />
                  <div>
                    <div className="font-mono text-xs font-bold text-coal dark:text-white truncate max-w-[160px]">
                      {user?.email}
                    </div>
                    <div className="text-[10px] font-mono text-accent uppercase font-bold">
                      {isPro ? 'Pro Active' : 'Free Tier'}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    void signOut();
                  }}
                  className="px-2.5 py-1 bg-white dark:bg-[#161914] border border-coal text-xs font-mono font-bold flex items-center gap-1 cursor-pointer"
                >
                  <LogOut className="w-3 h-3" />
                  Exit
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  openAuthModal();
                }}
                className="px-3 py-2 border-2 border-coal dark:border-[#3F4740] bg-paper dark:bg-[#1A1D18] text-coal dark:text-white font-mono text-xs font-bold text-left cursor-pointer shadow-[3px_3px_0_0_#12151A] flex items-center gap-2"
              >
                <LogIn className="w-3.5 h-3.5" />
                Sign In / Cloud Account →
              </button>
            )}

            <button
              onClick={() => {
                setOpen(false);
                openCwsListing();
              }}
              className="btn-primary mt-1 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Add to Chrome — Free
            </button>
          </nav>
        </div>
      )}
    </header>
  );
};
