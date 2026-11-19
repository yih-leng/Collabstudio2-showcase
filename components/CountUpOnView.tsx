'use client';

import { useEffect, useRef, useState } from 'react';
import { CountUp } from '@collabrium/ui/motion';

/**
 * A number that counts up from 0 the first time it scrolls into view, rather
 * than as the page loads (when it's often off screen). Under reduced motion
 * CountUp shows the number straight away.
 */
export function CountUpOnView({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setSeen(true);
          io.disconnect();
        }
      },
      { threshold: 0.6 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [seen]);

  return (
    <span ref={ref}>
      <CountUp value={seen ? value : 0} duration="ambient" />
    </span>
  );
}
