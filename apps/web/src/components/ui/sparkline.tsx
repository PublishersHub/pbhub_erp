'use client';

import React from 'react';

export interface SparklineProps {
  data: number[];       // historical values (e.g. last 7 days)
  width?: number;       // default 80
  height?: number;      // default 24
  stroke?: string;      // CSS color value, default 'currentColor'
  fill?: string;        // optional area fill below the line; default 'none'
  className?: string;   // for color via Tailwind (e.g. text-primary)
  smooth?: boolean;     // default true — uses cardinal-ish bezier
  showDots?: boolean;   // default false — show small endpoint dot only
}

export function Sparkline({
  data,
  width = 80,
  height = 24,
  stroke = 'currentColor',
  fill = 'none',
  className,
  smooth = true,
  showDots = false,
}: SparklineProps) {
  if (!data || data.length < 2) return null;

  const pad = 2;
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const toX = (i: number) => pad + (i / (data.length - 1)) * innerW;
  const toY = (v: number) => pad + innerH - ((v - min) / range) * innerH;

  // Build points array
  const pts = data.map((v, i) => ({ x: toX(i), y: toY(v) }));

  let linePath: string;

  if (smooth) {
    // Catmull-Rom spline converted to cubic bezier segments
    const segments: string[] = [`M ${pts[0].x} ${pts[0].y}`];
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[Math.min(pts.length - 1, i + 2)];

      // Catmull-Rom to cubic bezier (tension = 0.5)
      const t = 0.5;
      const cp1x = p1.x + (p2.x - p0.x) * t * (1 / 3);
      const cp1y = p1.y + (p2.y - p0.y) * t * (1 / 3);
      const cp2x = p2.x - (p3.x - p1.x) * t * (1 / 3);
      const cp2y = p2.y - (p3.y - p1.y) * t * (1 / 3);

      segments.push(`C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${p2.x} ${p2.y}`);
    }
    linePath = segments.join(' ');
  } else {
    linePath =
      pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  }

  // Optional fill: extend path to bottom-right → bottom-left → close
  const fillPath =
    fill !== 'none'
      ? `${linePath} L ${pts[pts.length - 1].x} ${pad + innerH} L ${pts[0].x} ${pad + innerH} Z`
      : undefined;

  const lastPt = pts[pts.length - 1];

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      aria-hidden="true"
      style={{ overflow: 'visible' }}
    >
      {fillPath && (
        <path
          d={fillPath}
          fill={stroke}
          fillOpacity={0.12}
          stroke="none"
        />
      )}
      <path
        d={linePath}
        fill="none"
        stroke={stroke}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {showDots && (
        <circle
          cx={lastPt.x}
          cy={lastPt.y}
          r={2}
          fill={stroke}
          stroke="none"
        />
      )}
    </svg>
  );
}
