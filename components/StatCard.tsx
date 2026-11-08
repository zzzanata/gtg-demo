"use client";

import { useState } from "react";
import AnimatedNumber from "@/components/AnimatedNumber";

type Tone = "default" | "good" | "bad" | "warn" | "danger";

const tones: Record<Tone, { value: string; bar: string; chip: string; hex: string }> = {
  default: { value: "text-brand-900", bar: "from-brand-900 to-brand-700", chip: "bg-brand-50 text-brand-900", hex: "#000a73" },
  good: { value: "text-emerald-600", bar: "from-emerald-500 to-emerald-400", chip: "bg-emerald-50 text-emerald-600", hex: "#10b981" },
  bad: { value: "text-red-600", bar: "from-red-500 to-red-400", chip: "bg-red-50 text-red-600", hex: "#ef4444" },
  warn: { value: "text-sun-700", bar: "from-sun-400 to-sun-200", chip: "bg-sun-50 text-sun-700", hex: "#e6a200" },
  danger: { value: "text-red-600", bar: "from-red-500 to-red-400", chip: "bg-red-50 text-red-600", hex: "#ef4444" },
};

export type Point = { label: string; value: number };

// Cartão padrão do painel: todos têm a mesma altura e a mesma estrutura.
// Com `series`, o cartão mostra um mini-gráfico: passe o mouse (ou o dedo) e o
// número vira o valor daquele mês, com uma linha guia e um ponto acompanhando.
export default function StatCard({
  label,
  value,
  kind = "int",
  hint,
  tone = "default",
  icon,
  index = 0,
  series,
}: {
  label: string;
  value: number;
  kind?: "int" | "brl";
  hint?: string;
  tone?: Tone;
  icon?: React.ReactNode;
  /** Posição na fileira: define o atraso da animação de entrada. */
  index?: number;
  /** Valor mês a mês (opcional): ativa o mini-gráfico interativo. */
  series?: Point[];
}) {
  const t = tones[tone];
  const [hover, setHover] = useState<number | null>(null);

  const n = series?.length ?? 0;
  const has = n >= 2;
  const values = series?.map((p) => p.value) ?? [];
  const min = Math.min(0, ...values);
  const max = Math.max(0, ...values);
  const span = max - min || 1;
  const px = (i: number) => 4 + (i / Math.max(1, n - 1)) * 92; // %
  const py = (v: number) => 12 + (1 - (v - min) / span) * 76; // %

  const path = has ? series!.map((p, i) => `${i === 0 ? "M" : "L"}${px(i).toFixed(2)} ${py(p.value).toFixed(2)}`).join(" ") : "";
  const area = has ? `${path} L${px(n - 1)} 100 L${px(0)} 100 Z` : "";
  const gid = `g-${label.replace(/\W/g, "")}-${index}`;

  const move = (clientX: number, el: HTMLElement) => {
    if (!has) return;
    const r = el.getBoundingClientRect();
    const pct = ((clientX - r.left) / r.width) * 100;
    const i = Math.round(((pct - 4) / 92) * (n - 1));
    setHover(Math.max(0, Math.min(n - 1, i)));
  };

  const active = hover !== null && series ? series[hover] : null;

  return (
    <div
      style={{ animationDelay: `${index * 70}ms` }}
      onMouseMove={(e) => move(e.clientX, e.currentTarget)}
      onMouseLeave={() => setHover(null)}
      onTouchMove={(e) => move(e.touches[0].clientX, e.currentTarget)}
      onTouchEnd={() => setHover(null)}
      className="group relative h-[8.5rem] min-w-0 animate-gtg-rise overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:border-brand-200 hover:shadow-lg hover:shadow-brand-900/10"
    >
      {/* Faixa de cor no topo, que "enche" ao entrar. */}
      <span className={`absolute inset-x-0 top-0 z-20 h-1 origin-left animate-gtg-fill bg-gradient-to-r ${t.bar}`} style={{ animationDelay: `${index * 70 + 150}ms` }} />
      {/* Brilho que passa uma vez pelo cartão. */}
      <span aria-hidden className="pointer-events-none absolute inset-y-0 -left-1/3 z-10 w-1/3 -skew-x-12 animate-gtg-sheen bg-gradient-to-r from-transparent via-white/70 to-transparent" style={{ animationDelay: `${index * 70 + 350}ms` }} />

      {/* Mini-gráfico: discreto em repouso, ganha vida ao passar o mouse. */}
      {has && (
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-11 opacity-50 transition-opacity duration-300 group-hover:opacity-100">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full animate-gtg-wipe" style={{ animationDelay: `${index * 70 + 300}ms` }}>
            <defs>
              <linearGradient id={gid} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor={t.hex} stopOpacity="0.28" />
                <stop offset="1" stopColor={t.hex} stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={area} fill={`url(#${gid})`} />
            <path
              d={path}
              fill="none"
              stroke={t.hex}
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {hover !== null && series && (
            <>
              <span className="absolute inset-y-0 w-px -translate-x-1/2 bg-slate-300/80" style={{ left: `${px(hover)}%` }} />
              <span
                className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 bg-white shadow"
                style={{ left: `${px(hover)}%`, top: `${py(series[hover].value)}%`, borderColor: t.hex, transition: "left 120ms, top 120ms" }}
              />
            </>
          )}
        </div>
      )}

      <div className="@container relative z-[5] flex h-full flex-col justify-between p-4 pb-12 sm:p-5 sm:pb-12">
        <div className="flex items-start justify-between gap-2">
          <p className="min-w-0 truncate text-sm font-medium text-slate-500">{label}</p>
          {icon && (
            <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg transition duration-300 group-hover:rotate-6 group-hover:scale-110 ${t.chip}`}>
              {icon}
            </span>
          )}
        </div>
        <div className="min-w-0">
          <p className={`truncate whitespace-nowrap font-semibold tracking-tight text-[clamp(1.1rem,10cqw,1.9rem)] leading-tight ${t.value}`}>
            <AnimatedNumber value={active ? active.value : value} kind={kind} />
          </p>
          <p className="mt-0.5 h-4 truncate text-xs text-slate-400">
            {active ? <span className="font-medium text-slate-600">{active.label}</span> : (hint ?? " ")}
          </p>
        </div>
      </div>
    </div>
  );
}
