import React, { useEffect, useRef, useState } from 'react';

interface AdSlotProps {
  position: 'top' | 'sidebar' | 'bottom';
  className?: string;
}

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

const AD_CLIENT = 'ca-pub-4378496741687724';

/**
 * Real AdSense units. The previous version rendered a hand-drawn box labelled
 * "Advertisement" that never served anything, while index.html still loaded the
 * AdSense script — so the site carried the cost and none of the revenue.
 *
 * Slot ids come from the AdSense dashboard; set them in .env as
 * VITE_ADSENSE_SLOT_TOP / _BOTTOM / _SIDEBAR. Without a slot id the component
 * renders nothing at all rather than a placeholder, because a dummy ad box is
 * itself a policy problem.
 */
const SLOT_IDS: Record<AdSlotProps['position'], string | undefined> = {
  top: import.meta.env.VITE_ADSENSE_SLOT_TOP,
  bottom: import.meta.env.VITE_ADSENSE_SLOT_BOTTOM,
  sidebar: import.meta.env.VITE_ADSENSE_SLOT_SIDEBAR,
};

/**
 * The ad lives in a box of this exact size, with overflow clipped. A responsive
 * AdSense unit sizes itself from its container's width and will keep growing a
 * flex sibling it is allowed to push; inside the fixed, overflow-hidden box
 * below it cannot, so it can never blow up the surrounding layout. (A full-width
 * responsive bottom banner did exactly that in production.)
 */
const SIZES: Record<AdSlotProps['position'], string> = {
  top: 'w-full max-w-[728px] h-[50px] md:h-[90px]',
  sidebar: 'w-[300px] h-[250px]',
  bottom: 'w-full max-w-[728px] h-[90px]',
};

const AdSlot: React.FC<AdSlotProps> = ({ position, className = '' }) => {
  const insRef = useRef<HTMLModElement>(null);
  const pushed = useRef(false);
  const [failed, setFailed] = useState(false);
  const slotId = SLOT_IDS[position];

  useEffect(() => {
    if (!slotId || pushed.current) return;
    pushed.current = true;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      setFailed(true);
    }
  }, [slotId]);

  // Collapse the reserved space when a blocker (or an unfilled request) leaves
  // the unit empty, instead of showing an empty bordered rectangle forever.
  useEffect(() => {
    if (!slotId) return;
    const timer = setTimeout(() => {
      const el = insRef.current;
      if (!el || el.getAttribute('data-ad-status') === 'unfilled' || el.offsetHeight === 0) {
        setFailed(true);
      }
    }, 2500);
    return () => clearTimeout(timer);
  }, [slotId]);

  if (!slotId || failed) return null;

  return (
    <div className={`flex-none flex justify-center my-2 ${className}`}>
      {/* Fixed, clipped box: the ad cannot resize it, so it cannot push the
          page. data-full-width-responsive is off for the same reason. */}
      <div className={`relative overflow-hidden ${SIZES[position]} mx-auto`}>
        <ins
          ref={insRef}
          className="adsbygoogle block w-full h-full"
          style={{ display: 'block', width: '100%', height: '100%' }}
          data-ad-client={AD_CLIENT}
          data-ad-slot={slotId}
          data-ad-format={position === 'sidebar' ? 'rectangle' : 'horizontal'}
          data-full-width-responsive="false"
        />
      </div>
    </div>
  );
};

export default AdSlot;
