'use client';

// Deterministic beam definitions — no Math.random, safe for SSR
const BEAMS = [
  { x1: '-5%', y1: '20%', x2: '60%',  y2: '95%', dur: '9s',  delay: '0s',   color: 'rgba(99,102,241,0.5)',  w: 1.5 },
  { x1: '30%', y1: '-5%', x2: '105%', y2: '60%', dur: '12s', delay: '2s',   color: 'rgba(168,85,247,0.45)', w: 1 },
  { x1: '70%', y1: '-5%', x2: '5%',   y2: '80%', dur: '10s', delay: '4s',   color: 'rgba(99,102,241,0.4)',  w: 1 },
  { x1: '-5%', y1: '60%', x2: '80%',  y2: '-5%', dur: '14s', delay: '1s',   color: 'rgba(139,92,246,0.4)',  w: 1.5 },
  { x1: '50%', y1: '105%',x2: '105%', y2: '20%', dur: '11s', delay: '3s',   color: 'rgba(99,102,241,0.35)', w: 1 },
  { x1: '90%', y1: '105%',x2: '-5%',  y2: '40%', dur: '13s', delay: '5s',   color: 'rgba(168,85,247,0.35)', w: 1 },
  { x1: '15%', y1: '-5%', x2: '85%',  y2: '105%',dur: '16s', delay: '0.5s', color: 'rgba(99,102,241,0.3)',  w: 0.8 },
  { x1: '105%',y1: '35%', x2: '20%',  y2: '105%',dur: '11s', delay: '6s',   color: 'rgba(139,92,246,0.3)',  w: 0.8 },
];

export default function BackgroundBeams() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
      <svg
        className="absolute inset-0 w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
        viewBox="0 0 100 100"
      >
        <defs>
          {/* Radial fade mask so beams fade at edges */}
          <radialGradient id="beamMask" cx="50%" cy="50%" r="55%" gradientUnits="userSpaceOnUse"
            gradientTransform="translate(50 50) scale(1 1) translate(-50 -50)">
            <stop offset="0%"  stopColor="white" stopOpacity="1" />
            <stop offset="75%" stopColor="white" stopOpacity="0.5" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </radialGradient>
          <mask id="edgeFade">
            <rect x="0" y="0" width="100" height="100" fill="url(#beamMask)" />
          </mask>
        </defs>

        <g mask="url(#edgeFade)" className="opacity-[0.07] dark:opacity-[0.13]">
          {BEAMS.map((b, i) => {
            // Approximate line length for stroke-dasharray
            const len = 1400;
            return (
              <line
                key={i}
                x1={b.x1} y1={b.y1} x2={b.x2} y2={b.y2}
                stroke={b.color}
                strokeWidth={b.w}
                strokeLinecap="round"
                strokeDasharray={`${len * 0.35} ${len}`}
                vectorEffect="non-scaling-stroke"
              >
                <animate
                  attributeName="stroke-dashoffset"
                  from={`${len}`}
                  to={`${-len * 0.5}`}
                  dur={b.dur}
                  begin={b.delay}
                  repeatCount="indefinite"
                  calcMode="linear"
                />
                <animate
                  attributeName="opacity"
                  values="0;1;1;0"
                  keyTimes="0;0.15;0.85;1"
                  dur={b.dur}
                  begin={b.delay}
                  repeatCount="indefinite"
                />
              </line>
            );
          })}
        </g>

        {/* Subtle ambient glows at fixed positions */}
        <g className="opacity-[0.04] dark:opacity-[0.08]">
          <circle cx="20" cy="30" r="25" fill="rgba(99,102,241,0.8)">
            <animate attributeName="opacity" values="0.04;0.10;0.04" dur="8s" repeatCount="indefinite" />
          </circle>
          <circle cx="80" cy="70" r="20" fill="rgba(168,85,247,0.8)">
            <animate attributeName="opacity" values="0.03;0.09;0.03" dur="11s" begin="3s" repeatCount="indefinite" />
          </circle>
          <circle cx="55" cy="10" r="15" fill="rgba(99,102,241,0.7)">
            <animate attributeName="opacity" values="0.02;0.07;0.02" dur="14s" begin="5s" repeatCount="indefinite" />
          </circle>
        </g>
      </svg>
    </div>
  );
}
