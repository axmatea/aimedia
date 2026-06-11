'use client';
import React, { useEffect, useRef, ReactNode } from 'react';

interface GlowCardProps {
  children: ReactNode;
  className?: string;
  glowColor?: 'blue' | 'purple' | 'green' | 'red' | 'orange' | 'pink';
  size?: 'sm' | 'md' | 'lg';
  width?: string | number;
  height?: string | number;
  customSize?: boolean;
}

const glowColorMap = {
  blue:   { base: 220, spread: 200 },
  purple: { base: 280, spread: 300 },
  green:  { base: 120, spread: 200 },
  red:    { base: 0,   spread: 200 },
  orange: { base: 30,  spread: 200 },
  pink:   { base: 340, spread: 200 },
};

const sizeMap = { sm: 'w-48 h-64', md: 'w-64 h-80', lg: 'w-80 h-96' };

// All glow CSS lives in app/globals.css (single source of truth).
// Activation is gated behind @media (hover: hover) and (pointer: fine),
// so touch devices get clean static cards and free page scroll.
const GlowCard: React.FC<GlowCardProps> = ({
  children,
  className = '',
  glowColor = 'blue',
  size = 'md',
  width,
  height,
  customSize = false,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let rafId: number;
    const card = cardRef.current;
    if (!card) return;

    const syncPointer = (e: PointerEvent) => {
      // Mouse-only: a finger on the card must scroll the page, never drive the glow
      if (e.pointerType !== 'mouse') return;
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        if (!cardRef.current) return;
        const rect = cardRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        cardRef.current.style.setProperty('--x', x.toFixed(1));
        cardRef.current.style.setProperty('--xp', (x / rect.width).toFixed(3));
        cardRef.current.style.setProperty('--y', y.toFixed(1));
        cardRef.current.style.setProperty('--yp', (y / rect.height).toFixed(3));
      });
    };

    card.addEventListener('pointermove', syncPointer, { passive: true });
    card.addEventListener('pointerenter', syncPointer, { passive: true });
    return () => {
      card.removeEventListener('pointermove', syncPointer);
      card.removeEventListener('pointerenter', syncPointer);
      cancelAnimationFrame(rafId);
    };
  }, []);

  const { base, spread } = glowColorMap[glowColor];

  const inlineStyles: React.CSSProperties & Record<string, string | number> = {
    '--base': base,
    '--spread': spread,
    '--radius': '16',
    '--border': '2',
    '--backdrop': 'hsl(0 0% 8% / 0.85)',
    '--backup-border': 'rgba(255,255,255,0.06)',
    '--size': '200',
    '--outer': '1',
    '--border-size': 'calc(var(--border, 2) * 1px)',
    '--spotlight-size': 'calc(var(--size, 150) * 1px)',
    '--hue': 'calc(var(--base) + (var(--xp, 0) * var(--spread, 0)))',
    // Interior spotlight: applied as background-image only on :hover (globals.css)
    '--glow-spot': `radial-gradient(var(--spotlight-size) var(--spotlight-size) at calc(var(--x, 0) * 1px) calc(var(--y, 0) * 1px), hsl(var(--hue, 210) calc(var(--saturation, 100) * 1%) calc(var(--lightness, 70) * 1%) / var(--bg-spot-opacity, 0.08)), transparent)`,
    backgroundColor: 'var(--backdrop, transparent)',
    backgroundSize: '100% 100%',
    backgroundPosition: '0 0',
    border: 'var(--border-size) solid var(--backup-border)',
    position: 'relative',
    ...(width !== undefined ? { width: typeof width === 'number' ? `${width}px` : width } : {}),
    ...(height !== undefined ? { height: typeof height === 'number' ? `${height}px` : height } : {}),
  };

  return (
    <div
      ref={cardRef}
      data-glow
      style={inlineStyles}
      className={`rounded-2xl relative grid shadow-[0_1rem_2rem_-1rem_black] p-6 gap-4 ${!customSize ? sizeMap[size] : ''} ${className}`}
    >
      {children}
    </div>
  );
};

export { GlowCard };
