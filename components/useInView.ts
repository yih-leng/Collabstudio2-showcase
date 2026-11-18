'use client';

import { useEffect, useState, type RefObject } from 'react';

/**
 * Whether an element is on screen and the tab is showing, so moving parts
 * (video, looping animations, timers) can rest while nobody can see them.
 */
export function useInView(ref: RefObject<Element | null>) {
  const [onScreen, setOnScreen] = useState(true);
  const [shown, setShown] = useState(true);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setOnScreen(e.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, [ref]);

  useEffect(() => {
    const read = () => setShown(document.visibilityState === 'visible');
    read();
    document.addEventListener('visibilitychange', read);
    return () => document.removeEventListener('visibilitychange', read);
  }, []);

  return onScreen && shown;
}
