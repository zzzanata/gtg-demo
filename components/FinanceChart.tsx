"use client";

import { useMemo, useState } from "react";
import { brl, type FinancePoint } from "@/lib/types";

// Gráfico interativo em SVG puro (sem biblioteca):
//  - passe o mouse (ou toque) em um mês para ver faturamento, custos e resultado;
//  - clique na legenda para mostrar/esconder faturamento ou custos;
//  - alterne entre barras e linhas e escolha 3, 6 ou 12 meses.
const W = 480;
const H = 230;
const L = 50;
const R = 10;
const T = 14;
const B = 26;

const GREEN = "#10b981";
const RED = "#ef4444";

function niceScale(max: number) {
  const exp = Math.pow(10, Math.floor(Math.log10(max)) - 1);
  for (const m of [1, 2, 2.5, 5, 10, 20, 25, 50, 100]) {
    const step = m * exp;
    const count = Math.ceil(max / step);
    if (count <= 4) return { step, count };
  }
  return { step: max, count: 1 };
}

function compact(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1).replace(".", ",")} mi`;
  if (v >= 1_000) return `${Math.round(v / 1_000)} mil`;
  return String(Math.round(v));
}

type View = "bars" | "line";

export default function FinanceChart({ data }: { data: FinancePoint[] }) {
  const ranges = [3, 6, 12].filter((n) => n <= data.length);
  const [range, setRange] = useState(Math.min(6, data.length));
  const [view, setView] = useState<View>("bars");
  const [hidden, setHidden] = useState<{ revenue: boolean; cost: boolean }>({ revenue: false, cost: false });
  const [hover, setHover] = useState<number | null>(null);

  const shown = useMemo(() => data.slice(-range), [data, range]);

  const max = Math.max(
    0,
    ...shown.flatMap((d) => [hidden.revenue ? 0 : d.revenue, hidden.cost ? 0 : d.cost]),
  );

  const empty = data.every((d) => d.revenue === 0 && d.cost === 0);
  if (empty) {
    return (
      <p className="rounded-lg bg-slate-50 px-4 py-10 text-center text-sm text-slate-400">
        Nenhuma movimentação nos últimos meses.
      </p>
    );
  }

  const { step, count } = niceScale(max || 1);
  const top = step * count;
  const plotW = W - L - R;
  const plotH = H - T - B;
  const group = plotW / shown.length;
  const barW = Math.min(22, group * 0.32);
  const y = (v: number) => T + plotH - (v / top) * plotH;
  const cx = (i: number) => L + group * i + group / 2;
  const ticks = Array.from({ length: count + 1 }, (_, i) => i * step);
  const tick = `${view}-${range}-${hidden.revenue}-${hidden.cost}`; // remonta para reanimar

  const line = (key: "revenue" | "cost") =>
    shown.map((d, i) => `${i === 0 ? "M" : "L"}${cx(i).toFixed(1)} ${y(d[key]).toFixed(1)}`).join(" ");
  const area = (key: "revenue" | "cost") =>
    `${line(key)} L${cx(shown.length - 1).toFixed(1)} ${y(0)} L${cx(0).toFixed(1)} ${y(0)} Z`;

  const hovered = hover !== null ? shown[hover] : null;

  // Com muitos meses os rótulos não cabem: mostra só o mês, e o ano no primeiro e em janeiro.
  const crowded = shown.length > 6;
  const tickLabel = (l: string, i: number) => {
    if (!crowded) return l;
    const [m] = l.split("/");
    return i === 0 || m.toLowerCase().startsWith("jan") ? l : m;
  };
  const tipLeft = hover !== null ? ((cx(hover) / W) * 100) : 0;

  const pill = (active: boolean) =>
    `rounded-md px-2.5 py-1 text-xs font-medium transition ${
      active ? "bg-brand-900 text-white shadow-sm" : "text-slate-500 hover:bg-brand-50 hover:text-brand-900"
    }`;

  const legend = (key: "revenue" | "cost", label: string, color: string) => (
    <button
      type="button"
      aria-pressed={!hidden[key]}
      onClick={() => setHidden((h) => ({ ...h, [key]: !h[key] }))}
      className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-xs transition hover:bg-slate-50 ${
        hidden[key] ? "text-slate-400 line-through" : "text-slate-600"
      }`}
    >
      <span className="h-2.5 w-2.5 rounded-sm transition" style={{ background: hidden[key] ? "#cbd5e1" : color }} />
      {label}
    </button>
  );

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-0.5 rounded-lg bg-slate-100 p-0.5" role="group" aria-label="Período">
          {ranges.map((n) => (
            <button key={n} type="button" onClick={() => setRange(n)} className={pill(range === n)}>
              {n}m
            </button>
          ))}
        </div>
        <div className="flex gap-0.5 rounded-lg bg-slate-100 p-0.5" role="group" aria-label="Tipo de gráfico">
          <button type="button" onClick={() => setView("bars")} className={pill(view === "bars")}>
            Barras
          </button>
          <button type="button" onClick={() => setView("line")} className={pill(view === "line")}>
            Linhas
          </button>
        </div>
      </div>

      <div className="relative" onMouseLeave={() => setHover(null)}>
        <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full touch-pan-y" role="img" aria-label="Faturamento e custos por mês">
          <defs>
            <linearGradient id="fc-green" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor={GREEN} stopOpacity="0.28" />
              <stop offset="1" stopColor={GREEN} stopOpacity="0" />
            </linearGradient>
            <linearGradient id="fc-red" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor={RED} stopOpacity="0.22" />
              <stop offset="1" stopColor={RED} stopOpacity="0" />
            </linearGradient>
          </defs>

          {ticks.map((t) => (
            <g key={t}>
              <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="#e2e8f0" strokeWidth="1" strokeDasharray={t === 0 ? undefined : "3 4"} />
              <text x={L - 6} y={y(t)} textAnchor="end" dominantBaseline="central" fontSize="11" fill="#64748b">
                {compact(t)}
              </text>
            </g>
          ))}

          {/* Faixa que destaca o mês sob o mouse */}
          {hover !== null && (
            <rect x={L + group * hover} y={T} width={group} height={plotH} rx={6} fill="#000a73" opacity="0.05" />
          )}

          <g key={tick}>
            {view === "bars" &&
              shown.map((d, i) => {
                const bars = [
                  { k: "revenue" as const, v: d.revenue, x: cx(i) - barW - 1, fill: GREEN },
                  { k: "cost" as const, v: d.cost, x: cx(i) + 1, fill: RED },
                ];
                return bars.map(
                  (b) =>
                    !hidden[b.k] &&
                    b.v > 0 && (
                      <rect
                        key={`${d.label}-${b.k}`}
                        x={b.x}
                        y={y(b.v)}
                        width={barW}
                        height={(b.v / top) * plotH}
                        rx={3}
                        fill={b.fill}
                        opacity={hover === null || hover === i ? 1 : 0.45}
                        className="animate-gtg-grow"
                        style={{
                          transformBox: "fill-box",
                          transformOrigin: "bottom",
                          animationDelay: `${i * 60 + (b.k === "cost" ? 50 : 0)}ms`,
                          transition: "opacity 150ms",
                        }}
                      />
                    ),
                );
              })}

            {view === "line" &&
              (["revenue", "cost"] as const).map(
                (k) =>
                  !hidden[k] && (
                    <g key={k}>
                      <path d={area(k)} fill={k === "revenue" ? "url(#fc-green)" : "url(#fc-red)"} className="animate-gtg-text" />
                      <path
                        d={line(k)}
                        fill="none"
                        stroke={k === "revenue" ? GREEN : RED}
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        pathLength={1}
                        strokeDasharray={1}
                        className="animate-gtg-draw"
                      />
                      {shown.map((d, i) => (
                        <circle
                          key={d.label}
                          cx={cx(i)}
                          cy={y(d[k])}
                          r={hover === i ? 5 : 3}
                          fill="#fff"
                          stroke={k === "revenue" ? GREEN : RED}
                          strokeWidth="2"
                          className="animate-gtg-text"
                          style={{ transition: "r 150ms" }}
                        />
                      ))}
                    </g>
                  ),
              )}
          </g>

          {shown.map((d, i) => (
            <text
              key={d.label}
              x={cx(i)}
              y={H - 7}
              textAnchor="middle"
              fontSize={crowded ? 9.5 : 11}
              fill={hover === i ? "#000a73" : "#64748b"}
              fontWeight={hover === i ? 600 : 400}
            >
              {tickLabel(d.label, i)}
            </text>
          ))}

          {/* Zonas de mouse/toque, uma por mês */}
          {shown.map((d, i) => (
            <rect
              key={d.label}
              x={L + group * i}
              y={T}
              width={group}
              height={plotH + B}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
              onMouseMove={() => setHover(i)}
              onTouchStart={() => setHover(i)}
              onClick={() => setHover(i)}
            />
          ))}
        </svg>

        {hovered && (
          <div
            className="pointer-events-none absolute top-1 z-10 w-40 -translate-x-1/2 rounded-2xl border border-slate-200 bg-white/95 p-2.5 text-xs shadow-lg backdrop-blur"
            style={{ left: `${Math.min(80, Math.max(20, tipLeft))}%` }}
          >
            <p className="mb-1 font-semibold text-brand-900">{hovered.label}</p>
            <p className="flex justify-between gap-2">
              <span className="text-slate-500">Faturamento</span>
              <span className="font-semibold tabular-nums text-emerald-600">{brl(hovered.revenue)}</span>
            </p>
            <p className="flex justify-between gap-2">
              <span className="text-slate-500">Custos</span>
              <span className="font-semibold tabular-nums text-red-600">{brl(hovered.cost)}</span>
            </p>
            <p className="mt-1 flex justify-between gap-2 border-t border-slate-100 pt-1">
              <span className="text-slate-500">Resultado</span>
              <span className={`font-semibold tabular-nums ${hovered.revenue - hovered.cost >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                {brl(hovered.revenue - hovered.cost)}
              </span>
            </p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-center gap-2">
        {legend("revenue", "Faturamento", GREEN)}
        {legend("cost", "Custos", RED)}
      </div>
    </div>
  );
}
