import React, { useEffect, useRef } from 'react';

interface AdSlotProps {
  position: 'top' | 'sidebar' | 'bottom';
  className?: string;
  onError?: () => void;
}

const AdSlot: React.FC<AdSlotProps> = ({ position, className = '', onError }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // specific dimensions to reserve space and prevent layout shift (CLS)
  // These dimensions match standard IAB ad unit sizes
  const styles = {
    top: "w-full max-w-[728px] h-[50px] md:h-[90px] mx-auto",
    sidebar: "w-[300px] h-[250px]",
    bottom: "w-full max-w-[728px] h-[90px] mx-auto"
  };

  useEffect(() => {
    // Check if the ad container was hidden by a blocker after mount
    // This is a secondary check; the primary check is the "bait" in App.tsx
    const timer = setTimeout(() => {
      if (containerRef.current) {
        if (containerRef.current.offsetHeight === 0 || containerRef.current.offsetParent === null) {
          if (onError) onError();
        }
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [onError]);

  return (
    <div className={`flex flex-col items-center justify-center my-4 transition-all duration-300 ${className}`}>
      {/* Ad Container - Reserves space immediately */}
      <div 
        ref={containerRef}
        className={`relative bg-gray-100 dark:bg-gray-800/50 border border-dashed border-gray-300 dark:border-gray-700 rounded-lg overflow-hidden flex flex-col items-center justify-center ${styles[position]} ad-slot`}
      >
        
        {/* Label for transparency */}
        <span className="absolute top-1 right-2 text-[10px] text-gray-400 font-mono uppercase tracking-wider opacity-60">
          Advertisement
        </span>

        {/* Placeholder / Ad Content */}
        {/* In production, this div would be targeted by the ad network script (e.g., id="carbonads") */}
        <div className="text-center p-4">
          <span className="text-xs text-gray-400 dark:text-gray-600 block mb-1">
             Sponsored Placement
          </span>
          <span className="text-[10px] text-gray-300 dark:text-gray-700 font-mono">
            {position === 'sidebar' ? '300x250' : 'Responsive Leaderboard'}
          </span>
        </div>
        
        {/* Instructions for Developer:
            To integrate Google AdSense:
            1. Remove the placeholder content above.
            2. Insert the <ins> tag here.
            3. Call (adsbygoogle = window.adsbygoogle || []).push({}); in useEffect.
            4. If the <ins> tag remains empty or hidden, trigger onError().
        */}
      </div>
    </div>
  );
};

export default AdSlot;