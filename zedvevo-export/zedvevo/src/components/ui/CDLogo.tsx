interface CDLogoProps {
  size?: number;
  spinning?: boolean;
  className?: string;
}

export default function CDLogo({ size = 40, spinning = true, className = '' }: CDLogoProps) {
  const r = size / 2;
  return (
    <div
      className={`relative shrink-0 ${spinning ? 'animate-spin-cd' : ''} ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Outer disc */}
        <circle cx={r} cy={r} r={r - 1} fill="hsl(220 13% 14%)" stroke="hsl(220 13% 28%)" strokeWidth="0.5" />

        {/* Rainbow shimmer rings */}
        <circle cx={r} cy={r} r={r - 3} fill="none" stroke="hsl(28 85% 50% / 0.35)" strokeWidth="1.5" />
        <circle cx={r} cy={r} r={r - 6} fill="none" stroke="hsl(200 80% 55% / 0.25)" strokeWidth="1" />
        <circle cx={r} cy={r} r={r - 9} fill="none" stroke="hsl(280 70% 60% / 0.25)" strokeWidth="0.8" />
        <circle cx={r} cy={r} r={r - 12} fill="none" stroke="hsl(28 85% 50% / 0.2)" strokeWidth="0.8" />
        <circle cx={r} cy={r} r={r - 15} fill="none" stroke="hsl(140 60% 50% / 0.2)" strokeWidth="0.6" />

        {/* Inner label area */}
        <circle cx={r} cy={r} r={r * 0.38} fill="hsl(28 85% 50%)" />
        <circle cx={r} cy={r} r={r * 0.28} fill="hsl(28 75% 38%)" />

        {/* Center hole */}
        <circle cx={r} cy={r} r={r * 0.12} fill="hsl(220 13% 5%)" />

        {/* Z letter in center */}
        <text
          x={r}
          y={r + r * 0.1}
          textAnchor="middle"
          fontSize={r * 0.28}
          fontWeight="800"
          fontFamily="Montserrat, sans-serif"
          fill="white"
          letterSpacing="-0.5"
        >
          Z
        </text>
      </svg>
      {/* Glow ring */}
      <div
        className="animate-pulse-glow absolute inset-0 rounded-full pointer-events-none"
        style={{ borderRadius: '50%', opacity: spinning ? 1 : 0 }}
      />
    </div>
  );
}
