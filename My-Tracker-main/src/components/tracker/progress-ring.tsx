import { cn } from "@/lib/utils";
import { scoreFill } from "@/lib/tracker/stats";

type ProgressRingProps = {
  percentage: number;
  label: string;
  className?: string;
};

export function ProgressRing({ percentage, label, className }: ProgressRingProps) {
  const pct = Math.max(0, Math.min(100, Number.isFinite(percentage) ? percentage : 0));
  const radius = 54;
  const stroke = 10;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - pct / 100);
  const size = (radius + stroke) * 2;
  const color = scoreFill(pct);

  return (
    <div className={cn("flex items-center justify-center", className)}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="color-mix(in oklab, var(--color-fg) 8%, transparent)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference.toFixed(2)}
          strokeDashoffset={offset.toFixed(2)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          className="transition-[stroke-dashoffset] duration-500 ease-out motion-reduce:transition-none"
        />
        <text
          x="50%"
          y="46%"
          textAnchor="middle"
          dominantBaseline="middle"
          fill="var(--color-fg)"
          fontSize="22"
          fontWeight="600"
          fontFamily="IBM Plex Sans, sans-serif"
        >
          {pct.toFixed(0)}%
        </text>
        <text
          x="50%"
          y="62%"
          textAnchor="middle"
          dominantBaseline="middle"
          fill="var(--color-muted)"
          fontSize="9"
          letterSpacing="1.2"
          fontFamily="IBM Plex Sans, sans-serif"
        >
          {label.toUpperCase()}
        </text>
      </svg>
      <span className="sr-only">
        {label} {pct.toFixed(1)} percent
      </span>
    </div>
  );
}
