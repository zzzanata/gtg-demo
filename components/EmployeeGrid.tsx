"use client";

import { Fragment, useMemo, useState, useTransition } from "react";
import {
  createEmployee,
  deleteEmployee,
  updateEmployee,
  type EmployeeInput,
} from "@/app/funcionarios/actions";
import { PencilIcon, PlusIcon, TrashIcon } from "@/components/Icons";
import { brl, type Employee } from "@/lib/types";

const cell =
  "w-full rounded border border-brand-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-300";
const toolbarInput =
  "rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

const empty: EmployeeInput = { fullName: "", jobTitle: "", dailyRate: "", monthlyRate: "" };
const money = (n: number | null) => (n === null ? "—" : brl(n));

export default function EmployeeGrid({ employees }: { employees: Employee[] }) {
  const [q, setQ] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null); // id, "new" ou null
  const [draft, setDraft] = useState<EmployeeInput>(empty);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return employees.filter(
      (e) => !term || e.fullName.toLowerCase().includes(term) || e.jobTitle.toLowerCase().includes(term),
    );
  }, [employees, q]);

  const monthlyTotal = rows.reduce((s, e) => s + (e.monthlyRate ?? 0), 0);

  function set<K extends keyof EmployeeInput>(key: K, value: string) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  function startNew() {
    setDraft(empty);
    setError("");
    setEditingId("new");
  }

  function startEdit(e: Employee) {
    setDraft({
      fullName: e.fullName,
      jobTitle: e.jobTitle,
      dailyRate: e.dailyRate === null ? "" : String(e.dailyRate).replace(".", ","),
      monthlyRate: e.monthlyRate === null ? "" : String(e.monthlyRate).replace(".", ","),
    });
    setError("");
    setEditingId(e.id);
  }

  function cancel() {
    setEditingId(null);
    setError("");
  }

  function save() {
    setError("");
    startTransition(async () => {
      const result =
        editingId === "new" ? await createEmployee(draft) : await updateEmployee(editingId!, draft);
      if ("error" in result) setError(result.error);
      else setEditingId(null);
    });
  }

  function remove(e: Employee) {
    if (!confirm(`Excluir ${e.fullName}? Essa ação não pode ser desfeita.`)) return;
    startTransition(async () => {
      const result = await deleteEmployee(e.id);
      if ("error" in result) alert(result.error);
    });
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && (e.target as HTMLElement).tagName === "INPUT") {
      e.preventDefault();
      save();
    } else if (e.key === "Escape") cancel();
  }

  const editing = editingId !== null;

  function EditRow() {
    return (
      <Fragment>
        <tr className="bg-brand-50/60" onKeyDown={onKey}>
          <td className="px-3 py-2">
            <input value={draft.fullName} onChange={(e) => set("fullName", e.target.value)} className={cell} placeholder="Nome completo" aria-label="Nome completo" autoFocus />
          </td>
          <td className="px-3 py-2">
            <input value={draft.jobTitle} onChange={(e) => set("jobTitle", e.target.value)} className={cell} placeholder="Ex.: Eletricista" aria-label="Função" />
          </td>
          <td className="px-3 py-2">
            <input value={draft.dailyRate} onChange={(e) => set("dailyRate", e.target.value)} inputMode="decimal" className={`${cell} text-right`} placeholder="Opcional" aria-label="Valor da diária" />
          </td>
          <td className="px-3 py-2">
            <input value={draft.monthlyRate} onChange={(e) => set("monthlyRate", e.target.value)} inputMode="decimal" className={`${cell} text-right`} placeholder="Opcional" aria-label="Valor mensal" />
          </td>
          <td className="px-3 py-2">
            <div className="flex gap-1">
              <button type="button" onClick={save} disabled={pending} className="rounded bg-brand-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-800 disabled:opacity-60">
                {pending ? "Salvando..." : "Salvar"}
              </button>
              <button type="button" onClick={cancel} disabled={pending} className="rounded border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
                Cancelar
              </button>
            </div>
          </td>
        </tr>
        {error && (
          <tr className="bg-brand-50/60">
            <td colSpan={5} className="px-3 pb-2 text-xs text-red-600">{error}</td>
          </tr>
        )}
      </Fragment>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nome ou função..."
          className={`${toolbarInput} min-w-0 flex-1 basis-56`}
        />
        <button type="button" onClick={startNew} disabled={editing} className="inline-flex items-center gap-1.5 rounded-lg bg-brand-900 px-3 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-50">
          <PlusIcon className="h-4 w-4" /> Novo funcionário
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-brand-900 text-xs uppercase tracking-wide text-white">
            <tr>
              <th className="px-3 py-2.5 font-medium">Nome completo</th>
              <th className="px-3 py-2.5 font-medium">Função</th>
              <th className="px-3 py-2.5 text-right font-medium">Valor da diária</th>
              <th className="px-3 py-2.5 text-right font-medium">Valor mensal</th>
              <th className="w-32 px-3 py-2.5 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {editingId === "new" && EditRow()}

            {rows.map((e) =>
              editingId === e.id ? (
                <Fragment key={e.id}>{EditRow()}</Fragment>
              ) : (
                <tr key={e.id} className="hover:bg-slate-50">
                  <td className="px-3 py-3 font-medium">{e.fullName}</td>
                  <td className="px-3 py-3 text-slate-600">{e.jobTitle}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{money(e.dailyRate)}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{money(e.monthlyRate)}</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={() => startEdit(e)} disabled={pending || editing} title="Editar" className="rounded p-1.5 text-slate-500 hover:bg-brand-50 hover:text-brand-900 disabled:opacity-40">
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button type="button" onClick={() => remove(e)} disabled={pending || editing} title="Excluir" className="rounded p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-40">
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ),
            )}

            {rows.length === 0 && editingId !== "new" && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-slate-400">
                  {employees.length === 0
                    ? 'Nenhum funcionário cadastrado. Clique em "Novo funcionário" para começar.'
                    : "Nenhum funcionário encontrado."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-slate-500">
        {rows.length} na lista · soma dos valores mensais informados:{" "}
        <strong className="text-brand-900">{brl(monthlyTotal)}</strong>
      </p>
    </div>
  );
}
