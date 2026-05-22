import { useEffect, useState } from 'react';

/**
 * Tracks the on-screen keyboard inset (in pixels) using window.visualViewport.
 * Returns 0 when no keyboard is showing or VisualViewport is unavailable.
 *
 * Subscribes to:
 * - visualViewport `resize` and `scroll` (iOS fires scroll while keyboard slides)
 * - window `orientationchange` (recomputes after rotation)
 *
 * Throttled with requestAnimationFrame for cheap updates.
 */
export function useKeyboardInset(enabled: boolean = true): number {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setInset(0);
      return;
    }
    if (typeof window === 'undefined') return;
    const vv = window.visualViewport;
    if (!vv) return;

    let raf = 0;
    const measure = () => {
      raf = 0;
      const layoutH = window.innerHeight;
      const next = Math.max(0, layoutH - vv.height - vv.offsetTop);
      setInset((prev) => (Math.abs(prev - next) < 1 ? prev : next));
    };
    const schedule = () => {
      if (raf) return;
      raf = requestAnimationFrame(measure);
    };
    const onOrientation = () => {
      // Recompute after the layout settles post-rotation.
      requestAnimationFrame(() => requestAnimationFrame(measure));
    };

    measure();
    vv.addEventListener('resize', schedule);
    vv.addEventListener('scroll', schedule);
    window.addEventListener('orientationchange', onOrientation);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      vv.removeEventListener('resize', schedule);
      vv.removeEventListener('scroll', schedule);
      window.removeEventListener('orientationchange', onOrientation);
    };
  }, [enabled]);

  return inset;
}
