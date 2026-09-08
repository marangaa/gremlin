import React from 'react';

export const CleanGridBackground: React.FC = () => {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
      {/* Fine blueprint grid — fades out toward the bottom of the viewport */}
      <div
        className="absolute inset-0 bg-[linear-gradient(to_right,rgba(18,21,26,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(18,21,26,0.05)_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:48px_48px]"
        style={{
          maskImage: 'radial-gradient(ellipse 90% 80% at 50% 0%, black 30%, transparent 95%)',
          WebkitMaskImage: 'radial-gradient(ellipse 90% 80% at 50% 0%, black 30%, transparent 95%)',
        }}
      />

      {/* Soft ambient top spotlight */}
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[1000px] h-[550px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(163,230,53,0.10)_0%,rgba(101,163,13,0.04)_40%,transparent_75%)] dark:bg-[radial-gradient(ellipse_at_center,rgba(212,249,51,0.08)_0%,rgba(163,230,53,0.03)_40%,transparent_75%)] blur-[100px]" />
    </div>
  );
};
