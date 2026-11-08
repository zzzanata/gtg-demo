const R = 42;
const C = 2 * Math.PI * R;

// Cores da marca: amarelo no começo, azul-marinho no andamento, verde quando conclui.
function colorFor(p: number) {
  if (p >= 100) return "#059669";
  if (p >= 35) return "#000a73";
  return "#ffb500";
}

// Anel de progresso em SVG. O tamanho vem do className (ex.: "h-24 w-24").
export default function ProgressRing({
  percent,
  className = "h-24 w-24",
}: {
  percent: number;
  className?: string;
}) {
  const p = Math.max(0, Math.min(100, Math.round(percent)));

  return (
    <svg viewBox="0 0 100 100" className={className} role="img" aria-label={`${p}% concluído`}>
      <circle cx="50" cy="50" r={R} fill="none" stroke="#e6e6f1" strokeWidth="10" />
      {p > 0 && (
        <circle
          cx="50"
          cy="50"
          r={R}
          fill="none"
          stroke={colorFor(p)}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${(p / 100) * C} ${C}`}
          transform="rotate(-90 50 50)"
          className="animate-gtg-ring"
        />
      )}
      <text
        x="50"
        y="50"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="22"
        fontWeight="600"
        fill="#000a73"
        className="animate-gtg-text"
      >
        {p}%
      </text>
    </svg>
  );
}
