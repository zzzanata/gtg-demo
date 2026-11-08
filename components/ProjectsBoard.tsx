"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Badge from "@/components/Badge";
import ProgressRing from "@/components/ProgressRing";
import { projectStatusLabel, type ProjectSummary } from "@/lib/types";

const MAX = 6;

// Obras do painel, com "holofote": a obra em foco cresce e brilha, as outras
// ficam suaves, e uma faixa embaixo mostra o resumo dela. O foco muda ao passar
// o mouse (ou tocar) e, parado, passeia sozinho pelas obras a cada poucos segundos.
export default function ProjectsBoard({ projects, wide }: { projects: ProjectSummary[]; wide: boolean }) {
  const list = projects.slice(0, wide ? 10 : MAX);
  const [focus, setFocus] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || list.length < 2) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => setFocus((f) => (f + 1) % list.length), 4200);
    return () => clearInterval(id);
  }, [paused, list.length]);

  const cur = list[Math.min(focus, list.length - 1)];
  if (!cur) return null;

  const tone = cur.percent >= 100 ? "bg-emerald-500" : cur.percent >= 35 ? "bg-brand-900" : "bg-sun-400";
  const cols = wide ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5" : "grid-cols-2 sm:grid-cols-3";

  return (
    <div className="space-y-3" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div className={`grid gap-2 ${cols}`}>
        {list.map((p, i) => {
          const on = i === focus;
          return (
            <Link
              key={p.id}
              href={`/obras/${p.id}`}
              onMouseEnter={() => setFocus(i)}
              onFocus={() => setFocus(i)}
              onTouchStart={() => setFocus(i)}
              aria-current={on}
              className={`group relative flex min-h-[8rem] flex-col items-center gap-1.5 rounded-xl border p-2 text-center transition duration-300 ${
                on
                  ? "-translate-y-0.5 border-sun-400/70 bg-sun-50/60 shadow-md shadow-sun-400/20"
                  : "border-transparent opacity-60 hover:opacity-100"
              }`}
            >
              {on && <span aria-hidden className="absolute right-2 top-2 h-2 w-2 animate-gtg-pulse rounded-full bg-sun-400" />}
              <ProgressRing
                percent={p.percent}
                className={`h-20 w-20 transition-transform duration-500 ease-out ${on ? "scale-110" : "scale-95"}`}
              />
              <div className="w-full min-w-0">
                <p className="truncate text-sm font-medium">{p.name}</p>
                <p className="truncate text-xs text-slate-500">{p.late ? "Atrasada" : p.location || "—"}</p>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Faixa de resumo da obra em foco: troca com uma entrada suave. */}
      <Link
        key={cur.id}
        href={`/obras/${cur.id}`}
        className="block h-[8.25rem] animate-gtg-in overflow-hidden rounded-xl border border-brand-100 bg-gradient-to-br from-brand-50 to-white p-3.5 transition hover:border-brand-300"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-brand-900">{cur.name}</p>
            <p className="truncate text-xs text-slate-500">
              {cur.location || "Local não informado"} · {cur.teamSize} na equipe
            </p>
          </div>
          <div className="flex shrink-0 gap-1.5">
            <Badge tone={cur.status === "DONE" ? "emerald" : cur.status === "ON_HOLD" ? "amber" : "brand"}>
              {projectStatusLabel[cur.status]}
            </Badge>
            {cur.late && <Badge tone="rose">Atrasada</Badge>}
          </div>
        </div>

        <div className="mt-3 flex items-center gap-3">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-brand-100">
            <div
              className={`h-full origin-left animate-gtg-fill rounded-full ${tone}`}
              style={{ width: `${Math.max(0, Math.min(100, cur.percent))}%` }}
            />
          </div>
          <span className="shrink-0 text-xs font-semibold tabular-nums text-brand-900">
            {cur.percent}% · {cur.done}/{cur.total}
          </span>
        </div>

        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {cur.percent >= 100 ? (
            <span className="text-xs text-emerald-600">Obra concluída</span>
          ) : cur.next.length === 0 ? (
            <span className="text-xs text-slate-400">Sem tarefas cadastradas</span>
          ) : (
            cur.next.slice(0, 3).map((t, i) => (
              <span
                key={t}
                style={{ animationDelay: `${120 + i * 90}ms` }}
                className="max-w-full animate-gtg-in truncate rounded-full bg-white px-2.5 py-1 text-[11px] text-slate-600 ring-1 ring-inset ring-slate-200"
              >
                {t}
              </span>
            ))
          )}
        </div>
      </Link>

      {projects.length > list.length && (
        <Link href="/obras" className="block text-center text-xs font-medium text-brand-700 hover:text-brand-900">
          + {projects.length - list.length} obra(s)
        </Link>
      )}
    </div>
  );
}
