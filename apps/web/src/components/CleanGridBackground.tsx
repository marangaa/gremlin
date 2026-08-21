import React from 'react';

export const CleanGridBackground: React.FC = () => {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
      {/* 1. Fine Crisp Blueprint Grid */}
      <div
        className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:48px_48px]"
        style={{
          maskImage: 'radial-gradient(ellipse 90% 80% at 50% 10%, black 40%, transparent 95%)',
          WebkitMaskImage: 'radial-gradient(ellipse 90% 80% at 50% 10%, black 40%, transparent 95%)',
        }}
      />

      {/* 2. Soft Ambient Top Spotlight (Linear / Vercel style) */}
      <div
        className="absolute -top-32 left-1/2 -translate-x-1/2 w-[1000px] h-[550px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(163,230,53,0.07)_0%,rgba(16,185,129,0.02)_40%,transparent_75%)] blur-[100px]"
      />

      {/* 3. Subtle Deep Center Vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_0%,rgba(11,13,16,0.5)_100%)]" />
    </div>
  );
};
