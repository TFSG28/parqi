'use client';

import { useEffect, useRef, type ReactNode } from 'react';

interface ScrollRevealProps {
  children: ReactNode;
  /** CSS class applied to the wrapper once revealed. */
  className?: string;
  /** Fraction of element that must be visible (0–1). Default: 0.15 */
  threshold?: number;
  /** Margin around the root (e.g. '0px 0px -50px 0px'). */
  rootMargin?: string;
}

/**
 * Wraps children in an IntersectionObserver that adds the `revealed` class
 * when the element enters the viewport, then disconnects (one-shot).
 *
 * Content is always visible by default (no JS = no animation, still readable).
 * The animation fires as a progressive enhancement on scroll.
 */
export default function ScrollReveal({
  children,
  className = '',
  threshold = 0.15,
  rootMargin = '0px 0px -40px 0px',
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const revealed = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Signal that JS is active — gates the initial opacity:0 in CSS.
    // Without this, content stays visible (no-JS fallback).
    el.classList.add('js-ready');

    // Respect reduced motion: skip the observer; content is already visible.
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq.matches) {
      el.classList.add('revealed');
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !revealed.current) {
          revealed.current = true;
          el.classList.add('revealed');
          observer.disconnect();
        }
      },
      { threshold, rootMargin },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, rootMargin]);

  return (
    <div ref={ref} className={`scroll-reveal ${className}`.trim()}>
      {children}
    </div>
  );
}
