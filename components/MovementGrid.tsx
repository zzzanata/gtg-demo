"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import {
  createEntry,
  deleteEntry,
  updateEntry,
  type MovementInput,
} from "@/app/financeiro/actions";
import Badge from "@/components/Badge";
import { CloseIcon, DownloadIcon, PencilIcon, PlusIcon, TrashIcon } from "@/components/Icons";
import { brl, NOTES_CATEGORY_ID, type CategoryOption, type MovementRecord, type ProjectOption } from "@/lib/types";

const NEW_CATEGORY = "__new__";

type SortKey = "date" | "type" | "category" | "description" | "quantity" | "unitValue" | "amount";

const cols: { key: SortKey; label: string; cls: string }[] = [
  { key: "date", label: "Data", cls: "hidden sm:table-cell" },
  { key: "type", label: "Tipo", cls: "hidden md:table-cell" },
  { key: "category", label: "Categoria", cls: "" },
  { key: "description", label: "Descrição", cls: "hidden lg:table-cell" },
  { key: "quantity", label: "Qtd", cls: "hidden md:table-cell text-right" },
  { key: "unitValue", label: "Valor unit.", cls: "hidden lg:table-cell text-right" },
  { key: "amount", label: "Total", cls: "text-right" },
];

const field =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

const dmy = (d: string) => (d ? d.split("-").reverse().join("/") : "—");
const qtyFmt = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 3 });
const monthLabel = (key: string) => {
  const [y, m] = key.split("-");
  const names = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  return `${names[Number(m) - 1]}/${y}`;
};

type Draft = MovementInput;

const emptyDraft = (today: string): Draft => ({
  type: "COST",
  date: today,
  categoryId: "",
  newCategory: "",
  description: "",
  quantity: "1",
  unitValue: "",
  projectId: "",
});

const toDraft = (r: MovementRecord): Draft => ({
  type: r.type,
  date: r.date,
  categoryId: r.categoryId,
  newCategory: "",
  description: r.description,
  quantity: String(r.quantity).replace(".", ","),
  unitValue: r.unitValue.toFixed(2).replace(".", ","),
  projectId: r.projectId,
});

const csvCell = (v: string | number) => {
  const s = String(v);
  return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

type Panel = { mode: "view" | "edit"; id: string } | { mode: "new" } | null;

export default function MovementGrid({
  entries,
  categories,
  projects,
  today,
}: {
  entries: MovementRecord[];
  categories: CategoryOption[];
  projects: ProjectOption[];
  today: string;
}) {
  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [monthFilter, setMonthFilter] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 } | null>(null);
  const [panel, setPanel] = useState<Panel>(null);
  const [draft, setDraft] = useState<Draft>(() => emptyDraft(today));
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const selected =
    panel && panel.mode !== "new" ? (entries.find((e) => e.id === panel.id) ?? null) : null;

  useEffect(() => {
    if (!panel) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setPanel(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [panel]);
  useEffect(() => {
    if (panel && panel.mode !== "new" && !selected) setPanel(null);
  }, [panel, selected]);

  const months = useMemo(
    () => [...new Set(entries.map((e) => e.date.slice(0, 7)))].sort().reverse(),
    [entries],
  );

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    const list = entries.filter((e) => {
      if (typeFilter && e.type !== typeFilter) return false;
      if (categoryFilter && e.categoryId !== categoryFilter) return false;
      if (sourceFilter && e.source !== sourceFilter) return false;
      if (monthFilter && !e.date.startsWith(monthFilter)) return false;
      if (!term) return true;
      return [e.description, e.categoryName, e.projectName].join(" ").toLowerCase().includes(term);
    });

    if (sort) {
      const value = (e: MovementRecord): string | number => {
        switch (sort.key) {
          case "date": return e.date;
          case "type": return e.type;
          case "category": return e.categoryName.toLowerCase();
          case "description": return e.description.toLowerCase();
          case "quantity": return e.quantity;
          case "unitValue": return e.unitValue;
          case "amount": return e.amount;
        }
      };
      list.sort((a, b) => {
        const x = value(a);
        const y = value(b);
        if (x === "" && y !== "") return 1;
        if (y === "" && x !== "") return -1;
        return (x < y ? -1 : x > y ? 1 : 0) * sort.dir;
      });
    }
    return list;
  }, [entries, q, typeFilter, categoryFilter, sourceFilter, monthFilter, sort]);

  const totals = useMemo(() => {
    let revenue = 0;
    let cost = 0;
    for (const e of rows) {
      if (e.type === "REVENUE") revenue += e.amount;
      else cost += e.amount;
    }
    return { revenue, cost, result: revenue - cost };
  }, [rows]);

  function toggleSort(key: SortKey) {
    setSort((s) => (s?.key === key ? (s.dir === 1 ? { key, dir: -1 } : null) : { key, dir: 1 }));
  }

  function set<K extends keyof Draft>(key: K, value: string) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  function openNew() {
    setDraft(emptyDraft(today));
    setError("");
    setPanel({ mode: "new" });
  }

  function openEdit(r: MovementRecord) {
    setDraft(toDraft(r));
    setError("");
    setPanel({ mode: "edit", id: r.id });
  }

  function save() {
    setError("");
    const current = panel;
    if (!current) return;
    startTransition(async () => {
      const result =
        current.mode === "new" ? await createEntry(draft) : await updateEntry(current.id, draft);
      if ("error" in result) setError(result.error);
      else setPanel(current.mode === "new" ? null : { mode: "view", id: current.id });
    });
  }

  function remove(r: MovementRecord) {
    if (!confirm(`Excluir "${r.description}"? Essa ação não pode ser desfeita.`)) return;
    startTransition(async () => {
      const result = await deleteEntry(r.id);
      if ("error" in result) alert(result.error);
      else setPanel(null);
    });
  }

  function exportCsv() {
    const head = ["Data", "Tipo", "Categoria", "Descrição", "Quantidade", "Valor unitário", "Total", "Obra", "Origem"];
    const lines = rows.map((e) =>
      [
        dmy(e.date), e.type === "REVENUE" ? "Entrada" : "Saída", e.categoryName, e.description,
        String(e.quantity).replace(".", ","), e.unitValue.toFixed(2).replace(".", ","),
        e.amount.toFixed(2).replace(".", ","), e.projectName, e.source === "NOTA" ? "Nota fiscal" : "Lançamento",
      ].map(csvCell).join(";"),
    );
    const blob = new Blob(["﻿" + [head.join(";"), ...lines].join("\r\n")], {
      type: "text/csv;charset=utf-8",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `movimentacoes-${today}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const toolbar = `${field} !w-auto`;
  const typeBadge = (t: MovementRecord["type"]) =>
    t === "REVENUE" ? <Badge tone="emerald">Entrada</Badge> : <Badge tone="rose">Saída</Badge>;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por descrição, categoria ou obra..." className={`${field} min-w-0 flex-1 basis-56`} />
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className={toolbar} aria-label="Filtrar por tipo">
          <option value="">Entradas e saídas</option>
          <option value="REVENUE">Só entradas</option>
          <option value="COST">Só saídas</option>
        </select>
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className={toolbar} aria-label="Filtrar por categoria">
          <option value="">Todas as categorias</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
          <option value={NOTES_CATEGORY_ID}>Notas fiscais</option>
        </select>
        <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)} className={toolbar} aria-label="Filtrar por origem">
          <option value="">Todas as origens</option>
          <option value="MANUAL">Lançadas aqui</option>
          <option value="NOTA">Vindas de notas fiscais</option>
        </select>
        <select value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)} className={toolbar} aria-label="Filtrar por mês">
          <option value="">Todos os meses</option>
          {months.map((m) => (
            <option key={m} value={m}>{monthLabel(m)}</option>
          ))}
        </select>
        <button type="button" onClick={exportCsv} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50" title="Baixa as linhas filtradas para abrir no Excel">
          <DownloadIcon className="h-4 w-4" /> Exportar
        </button>
        <button type="button" onClick={openNew} className="inline-flex items-center gap-1.5 rounded-lg bg-brand-900 px-3 py-2 text-sm font-medium text-white hover:bg-brand-800">
          <PlusIcon className="h-4 w-4" /> Nova movimentação
        </button>
      </div>

      <p className="text-xs text-slate-400">Clique em uma linha para ver os detalhes.</p>

      <div className="max-h-[70vh] overflow-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="sticky top-0 z-10 bg-brand-900 text-xs uppercase tracking-wide text-white">
            <tr>
              {cols.map((c) => (
                <th key={c.key} className={`px-2 py-2.5 font-medium sm:px-3 ${c.cls}`}>
                  <button type="button" onClick={() => toggleSort(c.key)} className="uppercase tracking-wide hover:text-sun-400">
                    {c.label}
                    {sort?.key === c.key ? (sort.dir === 1 ? " ▲" : " ▼") : ""}
                  </button>
                </th>
              ))}
              <th className="hidden w-24 px-3 py-2.5 md:table-cell">
                <span className="sr-only">Ações</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((e) => (
              <tr
                key={e.id}
                onClick={() => {
                  setError("");
                  setPanel({ mode: "view", id: e.id });
                }}
                onKeyDown={(ev) => ev.key === "Enter" && setPanel({ mode: "view", id: e.id })}
                tabIndex={0}
                className="cursor-pointer hover:bg-brand-50/60 focus:bg-brand-50/60 focus:outline-none"
              >
                <td className="hidden whitespace-nowrap px-2 py-3 tabular-nums sm:table-cell sm:px-3">{dmy(e.date)}</td>
                <td className="hidden px-2 py-3 md:table-cell sm:px-3">{typeBadge(e.type)}</td>
                <td className="max-w-[160px] px-2 py-3 sm:px-3">
                  <p className="truncate font-medium">
                    {e.categoryName || "Sem categoria"}
                    {e.source === "NOTA" && <span className="ml-1.5 rounded bg-brand-50 px-1.5 py-0.5 align-middle text-[10px] font-semibold text-brand-900">NF</span>}
                  </p>
                  <p className="truncate text-xs text-slate-500 lg:hidden">{e.description}</p>
                </td>
                <td className="hidden max-w-[260px] px-2 py-3 lg:table-cell sm:px-3">
                  <p className="truncate text-slate-600" title={e.description}>{e.description}</p>
                </td>
                <td className="hidden whitespace-nowrap px-2 py-3 text-right tabular-nums md:table-cell sm:px-3">{qtyFmt(e.quantity)}</td>
                <td className="hidden whitespace-nowrap px-2 py-3 text-right tabular-nums lg:table-cell sm:px-3">{brl(e.unitValue)}</td>
                <td className={`whitespace-nowrap px-2 py-3 text-right font-semibold tabular-nums sm:px-3 ${e.type === "REVENUE" ? "text-emerald-600" : "text-red-600"}`}>
                  {e.type === "REVENUE" ? "+" : "-"}
                  {brl(e.amount)}
                </td>
                <td className="hidden px-3 py-3 md:table-cell" onClick={(ev) => ev.stopPropagation()}>
                  {e.source === "NOTA" ? (
                    <Link href="/notas-fiscais" title="Esta linha vem de uma nota fiscal: edite em Notas fiscais" className="rounded px-2 py-1 text-xs font-medium text-brand-700 hover:bg-brand-50 hover:text-brand-900">
                      Ver nota
                    </Link>
                  ) : (
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={() => openEdit(e)} title="Editar" className="rounded p-1.5 text-slate-500 hover:bg-brand-50 hover:text-brand-900">
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => remove(e)} disabled={pending} title="Excluir" className="rounded p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-40">
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={cols.length + 1} className="px-4 py-12 text-center text-slate-400">
                  {entries.length === 0
                    ? 'Nenhuma movimentação ainda. Clique em "Nova movimentação" para começar.'
                    : "Nenhuma movimentação encontrada com esses filtros."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-2 gap-2 rounded-2xl border border-slate-200 bg-white p-3 text-sm shadow-sm sm:grid-cols-4">
        <Stat label="Movimentações na tela" value={String(rows.length)} />
        <Stat label="Entradas" value={brl(totals.revenue)} tone="text-emerald-600" />
        <Stat label="Saídas" value={brl(totals.cost)} tone="text-red-600" />
        <Stat label="Resultado" value={brl(totals.result)} tone={totals.result >= 0 ? "text-emerald-600" : "text-red-600"} />
      </div>

      {panel && (
        <div className="fixed inset-0 z-40 flex justify-end">
          <button type="button" aria-label="Fechar" onClick={() => setPanel(null)} className="absolute inset-0 animate-gtg-page bg-brand-950/40 backdrop-blur-[1px]" />
          <aside role="dialog" aria-modal="true" className="relative flex h-full w-full max-w-md animate-gtg-slide flex-col bg-white shadow-2xl">
            {panel.mode === "view" && selected ? (
              <Details
                r={selected}
                pending={pending}
                onClose={() => setPanel(null)}
                onEdit={() => openEdit(selected)}
                onDelete={() => remove(selected)}
              />
            ) : (
              <Form
                isNew={panel.mode === "new"}
                draft={draft}
                set={set}
                categories={categories}
                projects={projects}
                error={error}
                pending={pending}
                onSave={save}
                onCancel={() => (panel.mode === "new" ? setPanel(null) : setPanel({ mode: "view", id: panel.id }))}
              />
            )}
          </aside>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, tone = "text-brand-900" }: { label: string; value: string; tone?: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`truncate font-semibold tabular-nums ${tone}`}>{value}</p>
    </div>
  );
}

function Item({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="break-words text-sm text-slate-800">{children}</dd>
    </div>
  );
}

function Details({
  r,
  pending,
  onClose,
  onEdit,
  onDelete,
}: {
  r: MovementRecord;
  pending: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const income = r.type === "REVENUE";
  return (
    <>
      <header className="flex items-start justify-between gap-3 border-l-4 border-sun-400 bg-brand-900 px-5 py-4 text-white">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide text-white/70">{income ? "Entrada" : "Saída"}</p>
          <h2 className="truncate text-lg font-semibold">{r.categoryName || "Sem categoria"}</h2>
        </div>
        <button type="button" onClick={onClose} aria-label="Fechar" className="rounded-lg p-1.5 hover:bg-white/10">
          <CloseIcon />
        </button>
      </header>

      <div className="flex-1 space-y-6 overflow-y-auto p-5">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-slate-400">Total</p>
          <p className={`text-2xl font-semibold tabular-nums ${income ? "text-emerald-600" : "text-red-600"}`}>
            {income ? "+" : "-"}
            {brl(r.amount)}
          </p>
        </div>
        <dl className="grid grid-cols-2 gap-4">
          <Item label="Data">{dmy(r.date)}</Item>
          <Item label="Obra">{r.projectName || "—"}</Item>
          {r.source === "MANUAL" && (
            <>
              <Item label="Quantidade">{qtyFmt(r.quantity)}</Item>
              <Item label="Valor unitário">{brl(r.unitValue)}</Item>
            </>
          )}
        </dl>
        <dl>
          <Item label="Descrição">{r.description}</Item>
        </dl>
      </div>

      {r.source === "NOTA" ? (
        <footer className="space-y-2 border-t border-slate-200 p-4">
          <p className="text-xs text-slate-500">
            Esta linha vem da nota fiscal{r.invoiceNumber ? ` nº ${r.invoiceNumber}` : ""}. Para editar ou excluir, use a tela de Notas fiscais.
          </p>
          <Link href="/notas-fiscais" className="inline-flex items-center gap-1.5 rounded-lg bg-brand-900 px-3 py-2 text-sm font-medium text-white hover:bg-brand-800">
            Abrir Notas fiscais
          </Link>
        </footer>
      ) : (
      <footer className="flex items-center gap-2 border-t border-slate-200 p-4">
        <button type="button" onClick={onEdit} className="inline-flex items-center gap-1.5 rounded-lg bg-brand-900 px-3 py-2 text-sm font-medium text-white hover:bg-brand-800">
          <PencilIcon className="h-4 w-4" /> Editar
        </button>
        <button type="button" onClick={onDelete} disabled={pending} className="ml-auto inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60">
          <TrashIcon className="h-4 w-4" /> Excluir
        </button>
      </footer>
      )}
    </>
  );
}

function Form({
  isNew,
  draft,
  set,
  categories,
  projects,
  error,
  pending,
  onSave,
  onCancel,
}: {
  isNew: boolean;
  draft: Draft;
  set: <K extends keyof Draft>(key: K, value: string) => void;
  categories: CategoryOption[];
  projects: ProjectOption[];
  error: string;
  pending: boolean;
  onSave: () => void;
  onCancel: () => void;
}) {
  const label = (text: string, input: React.ReactNode, span2 = false) => (
    <label className={`block space-y-1 ${span2 ? "col-span-2" : ""}`}>
      <span className="text-xs font-medium text-slate-600">{text}</span>
      {input}
    </label>
  );

  const toNum = (v: string) => parseFloat(v.replace(/\./g, "").replace(",", ".")) || 0;
  const total = (toNum(draft.quantity) || 0) * toNum(draft.unitValue);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave();
      }}
      className="flex min-h-0 flex-1 flex-col"
    >
      <header className="flex items-center justify-between gap-3 border-l-4 border-sun-400 bg-brand-900 px-5 py-4 text-white">
        <h2 className="text-lg font-semibold">{isNew ? "Nova movimentação" : "Editar movimentação"}</h2>
        <button type="button" onClick={onCancel} aria-label="Cancelar" className="rounded-lg p-1.5 hover:bg-white/10">
          <CloseIcon />
        </button>
      </header>

      <div className="grid flex-1 grid-cols-2 content-start gap-x-3 gap-y-4 overflow-y-auto p-5">
        <div className="col-span-2 grid grid-cols-2 gap-2 rounded-lg bg-slate-100 p-1">
          {([["COST", "Saída (custo)"], ["REVENUE", "Entrada (faturamento)"]] as const).map(([value, text]) => (
            <button
              key={value}
              type="button"
              onClick={() => set("type", value)}
              className={`rounded-md px-3 py-2 text-sm font-medium transition ${
                draft.type === value
                  ? value === "COST"
                    ? "bg-white text-red-600 shadow-sm"
                    : "bg-white text-emerald-600 shadow-sm"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              {text}
            </button>
          ))}
        </div>

        {label("Data", <input type="date" value={draft.date} onChange={(e) => set("date", e.target.value)} className={field} />, true)}
        {label("Categoria", (
          <select value={draft.categoryId} onChange={(e) => set("categoryId", e.target.value)} className={field}>
            <option value="">Sem categoria</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
            <option value={NEW_CATEGORY}>+ Nova categoria...</option>
          </select>
        ), true)}
        {draft.categoryId === NEW_CATEGORY && label("Nome da nova categoria", (
          <input value={draft.newCategory} onChange={(e) => set("newCategory", e.target.value)} className={field} autoFocus />
        ), true)}
        {label("Descrição", <input value={draft.description} onChange={(e) => set("description", e.target.value)} placeholder="Ex.: Hotel da equipe em Garça" className={field} />, true)}
        {label("Quantidade", <input value={draft.quantity} onChange={(e) => set("quantity", e.target.value)} inputMode="decimal" className={field} />)}
        {label("Valor unitário (R$)", <input value={draft.unitValue} onChange={(e) => set("unitValue", e.target.value)} inputMode="decimal" placeholder="0,00" className={field} />)}
        <p className="col-span-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
          Total: <strong className="text-brand-900">{brl(total)}</strong>
        </p>
        {label("Obra (opcional)", (
          <select value={draft.projectId} onChange={(e) => set("projectId", e.target.value)} className={field}>
            <option value="">Sem obra</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        ), true)}
      </div>

      <footer className="space-y-2 border-t border-slate-200 p-4">
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onCancel} disabled={pending} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Cancelar
          </button>
          <button type="submit" disabled={pending} className="rounded-lg bg-brand-900 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-60">
            {pending ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </footer>
    </form>
  );
}
