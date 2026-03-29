'use client';
import { useRef } from 'react';

export default function Spotlight({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el) return;
    const { left, top } = el.getBoundingClientRect();
    el.style.setProperty('--sx', `${e.clientX - left}px`);
    el.style.setProperty('--sy', `${e.clientY - top}px`);
  }

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      className={`relative overflow-hidden ${className}`}
      style={{ '--sx': '50%', '--sy': '50%' } as React.CSSProperties}
    >
      {/* spotlight layer */}
      <div
        className="pointer-events-none absolute inset-0 z-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          background:
            'radial-gradient(550px circle at var(--sx) var(--sy), rgba(99,102,241,0.13) 0%, rgba(99,102,241,0.04) 40%, transparent 70%)',
        }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
