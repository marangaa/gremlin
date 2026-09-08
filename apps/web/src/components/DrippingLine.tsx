import React, { useEffect, useRef } from 'react';

export const DrippingLine: React.FC = () => {
  const lineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateHeight = () => {
      if (lineRef.current) {
        const rect = lineRef.current.getBoundingClientRect();
        const docHeight = document.documentElement.scrollHeight;
        const topOffset = rect.top + window.scrollY;
        // Extend to exactly the bottom of the page
        lineRef.current.style.height = `${docHeight - topOffset}px`;
      }
    };

    updateHeight();
    window.addEventListener('resize', updateHeight);
    
    // Using a ResizeObserver to catch document height changes
    const observer = new ResizeObserver(() => updateHeight());
    observer.observe(document.body);

    return () => {
      window.removeEventListener('resize', updateHeight);
      observer.disconnect();
    };
  }, []);

  return (
    <>
      {/* The Squiggly Underline */}
      <svg 
        className="absolute -bottom-2 left-0 w-[110%] h-[14px] text-[#A3E635] dark:text-[#D4F933]"
        preserveAspectRatio="none"
        viewBox="0 0 100 10"
      >
        <path 
          d="M0 5 Q12 10 25 5 T50 5 T75 5 T100 5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      {/* The Vertical Drip Line */}
      <div 
        ref={lineRef}
        className="absolute top-full left-1 w-[4px] z-[-1] opacity-70"
        style={{
          backgroundImage: `url('data:image/svg+xml,%3Csvg width="4" height="60" viewBox="0 0 4 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cpath d="M2,0 Q4,15 2,30 T2,60" fill="none" stroke="%23A3E635" stroke-width="2"/%3E%3C/svg%3E')`,
          backgroundRepeat: 'repeat-y',
          backgroundPosition: 'top center'
        }}
      />
    </>
  );
};
