interface WavyRouteLineProps {
  className?: string;
  dotted?: boolean;
  color?: string;
  height?: number;
}

export default function WavyRouteLine({
  className = "",
  dotted = true,
  color = "currentColor",
  height = 40,
}: WavyRouteLineProps) {
  const w = 24;
  const mid = w / 2;
  const amplitude = w * 0.3;
  const segment = height / 4;
  // Even repeated curves so every wobble has the same granularity
  const path = [
    `M${mid} 0`,
    `C${mid + amplitude} ${segment * 0.35}, ${mid + amplitude} ${segment * 0.65}, ${mid} ${segment}`,
    `C${mid - amplitude} ${segment * 1.35}, ${mid - amplitude} ${segment * 1.65}, ${mid} ${segment * 2}`,
    `C${mid + amplitude} ${segment * 2.35}, ${mid + amplitude} ${segment * 2.65}, ${mid} ${segment * 3}`,
    `C${mid - amplitude} ${segment * 3.35}, ${mid - amplitude} ${segment * 3.65}, ${mid} ${segment * 4}`,
  ].join(" ");

  return (
    <svg
      viewBox={`0 0 ${w} ${height}`}
      width={w}
      height={height}
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d={path}
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray={dotted ? "2 8" : "none"}
      />
    </svg>
  );
}
