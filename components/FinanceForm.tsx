"use client";

import { useRef, useState, useTransition } from "react";
import { createEntry } from "@/app/financeiro/actions";
import type { ProjectOption } from "@/lib/types";

const inputCls =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

export default function FinanceForm({
  projects,
  today,
}: {
  projects: ProjectOption[];
  today: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [type, setType] = useState<"REVENUE" | "COST">("REVENUE");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage(null);
    const data = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await createEntry(data);
      if ("error" in result) {
        setMessage({ ok: false, text: result.error });
      } else {
        formRef.current?.reset();
        setMessage({ ok: true, text: "Lançamento salvo." });
      }
    });
  }

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      <h2 className="font-medium">Novo lançamento</h2>

      <div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-100 p-1">
        {(
          [
            ["REVENUE", "Faturamento"],
            ["COST", "Custo"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setType(value)}
            className={`rounded-md px-3 py-2 text-sm font-medium transition ${
              type === value
                ? value === "REVENUE"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "bg-red-600 text-white shadow-sm"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <input type="hidden" name="type" value={type} />

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-slate-700">Valor (R$)</span>
          <input name="amount" inputMode="decimal" required placeholder="0,00" className={inputCls} />
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-slate-700">Data</span>
          <input name="date" type="date" required defaultValue={today} className={inputCls} />
        </label>
      </div>

      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-slate-700">Descrição</span>
        <input
          name="description"
          required
          placeholder={type === "REVENUE" ? "Ex.: Medição 2 - Usina Rio" : "Ex.: Compra de módulos"}
          className={inputCls}
        />
      </label>

      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-slate-700">Obra (opcional)</span>
        <select name="projectId" defaultValue="" className={inputCls}>
          <option value="">Sem obra</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>

      {message && (
        <p
          className={`rounded-lg px-3 py-2 text-sm ${
            message.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
          }`}
        >
          {message.text}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-brand-900 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-60"
      >
        {pending ? "Salvando..." : "Salvar lançamento"}
      </button>
    </form>
  );
}
