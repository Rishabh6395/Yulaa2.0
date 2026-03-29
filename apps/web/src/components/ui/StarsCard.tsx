'use client';
import { useRef } from 'react';

// Deterministic star positions so SSR & client match (no Math.random)
const STARS = Array.from({ length: 28 }, (_, i) => ({
  x: ((i * 37 + 11) % 97),        // 0–96 %
  y: ((i * 53 + 7)  % 91),        // 0–90 %
  r: i % 3 === 0 ? 1.5 : 1,       // size
  delay: ((i * 17) % 30) / 10,    // 0–3s
  dur:   2.5 + ((i * 7) % 20) / 10, // 2.5–4.5s
}));

export default function StarsCard({
  children,
  className = '',
  glowColor = 'rgba(139,92,246,0.18)',
}: {
  children: React.ReactNode;
  className?: string;
  glowColor?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el) return;
    const { left, top } = el.getBoundingClientRect();
    el.style.setProperty('--mx', `${e.clientX - left}px`);
    el.style.setProperty('--my', `${e.clientY - top}px`);
  }

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      className={`relative overflow-hidden rounded-2xl border border-white/10 dark:border-white/5 bg-white dark:bg-gray-900/80 group ${className}`}
      style={{ '--mx': '50%', '--my': '50%' } as React.CSSProperties}
    >
      {/* Stars */}
      <svg
        className="pointer-events-none absolute inset-0 w-full h-full opacity-40 dark:opacity-60"
        aria-hidden
      >
        {STARS.map((s, i) => (
          <circle key={i} cx={`${s.x}%`} cy={`${s.y}%`} r={s.r} fill="white">
            <animate
              attributeName="opacity"
              values="0.2;1;0.2"
              dur={`${s.dur}s`}
              begin={`${s.delay}s`}
              repeatCount="indefinite"
            />
          </circle>
        ))}
      </svg>

      {/* Mouse-following glow */}
      <div
        className="pointer-events-none absolute inset-0 z-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          background: `radial-gradient(320px circle at var(--mx) var(--my), ${glowColor}, transparent 70%)`,
        }}
      />

      {/* Content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
