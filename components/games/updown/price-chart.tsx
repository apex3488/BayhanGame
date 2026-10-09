import { useId } from "react";

interface PriceChartProps {
  points: readonly number[];
  entry: number | null;
  label: string;
}

const WIDTH = 320;
const HEIGHT = 150;
const PAD = 10;

export function PriceChart({ points, entry, label }: PriceChartProps) {
  const gradientId = useId();
  const values = entry === null ? points : [...points, entry];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const x = (index: number) => (index / Math.max(1, points.length - 1)) * WIDTH;
  const y = (value: number) => PAD + (1 - (value - min) / span) * (HEIGHT - PAD * 2);

  const line = points.map((value, index) => `${index === 0 ? "M" : "L"}${x(index).toFixed(1)} ${y(value).toFixed(1)}`).join(" ");
  const last = points[points.length - 1] ?? min;

  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="h-40 w-full" role="img" aria-label={label} preserveAspectRatio="none">
      <defs>
        <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#3B82F6" stopOpacity="0.45" />
          <stop offset="1" stopColor="#3B82F6" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map((ratio) => (
        <line key={ratio} x1="0" x2={WIDTH} y1={HEIGHT * ratio} y2={HEIGHT * ratio} stroke="rgb(255 255 255 / 0.05)" />
      ))}
      <path d={`${line} L${WIDTH} ${HEIGHT} L0 ${HEIGHT} Z`} fill={`url(#${gradientId})`} />
      <path d={line} fill="none" stroke="#A9C6FF" strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      {entry !== null && (
        <line x1="0" x2={WIDTH} y1={y(entry)} y2={y(entry)} stroke="#fff" strokeOpacity="0.6" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
      )}
      <circle cx={x(points.length - 1)} cy={y(last)} r="4" fill="#fff" />
      <circle cx={x(points.length - 1)} cy={y(last)} r="9" fill="#3B82F6" fillOpacity="0.3" />
    </svg>
  );
}
