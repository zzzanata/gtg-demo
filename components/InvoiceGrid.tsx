"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  assignCities,
  createInvoice,
  deleteInvoice,
  setInvoicePaid,
  updateInvoice,
  type InvoiceInput,
} from "@/app/notas-fiscais/actions";
import Badge, { type BadgeTone } from "@/components/Badge";
import InvoiceImport from "@/components/InvoiceImport";
import { CheckIcon, CloseIcon, DownloadIcon, PencilIcon, PlusIcon, TrashIcon } from "@/components/Icons";
import { cleanCity } from "@/lib/cities";
import { formatAccessKey, formatCnpj, normalizeAccessKey, shownStatus } from "@/lib/invoices";
import {
  brl,
  invoiceShownLabel,
  invoiceTypeLabel,
  type InvoiceRecord,
  type InvoiceShownStatus,
  type ProjectOption,
} from "@/lib/types";

type SortKey = "issuedAt" | "type" | "number" | "recipient" | "city" | "description" | "amount" | "dueDate" | "status";

// Tabela enxuta: o resto das informações aparece ao clicar na nota.
const cols: { key: SortKey; label: string; cls: string }[] = [
  { key: "issuedAt", label: "Emissão", cls: "hidden sm:table-cell" },
  { key: "type", label: "Tipo", cls: "hidden md:table-cell" },
  { key: "number", label: "Nº", cls: "hidden md:table-cell" },
  { key: "recipient", label: "Destinatário", cls: "" },
  { key: "city", label: "Cidade", cls: "hidden xl:table-cell" },
  { key: "description", label: "Descrição", cls: "hidden lg:table-cell" },
  { key: "amount", label: "Valor", cls: "text-right" },
  { key: "dueDate", label: "Vencimento", cls: "hidden lg:table-cell" },
  { key: "status", label: "Status", cls: "" },
];

const statusTone: Record<InvoiceShownStatus, BadgeTone> = {
  PENDING: "amber",
  PAID: "emerald",
  OVERDUE: "rose",
  CANCELED: "slate",
};

const field =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

const dmy = (d: string) => (d ? d.split("-").reverse().join("/") : "—");

type Draft = InvoiceInput;

function emptyDraft(today: string, city = ""): Draft {
  return {
    type: "IN",
    number: "",
    accessKey: "",
    description: "",
    amount: "",
    issuedAt: today,
    dueDate: "",
    status: "PENDING",
    paidAt: "",
    senderName: "",
    senderCnpj: "",
    recipientName: "",
    recipientCnpj: "",
    city,
    projectId: "",
  };
}

function toDraft(r: InvoiceRecord): Draft {
  return {
    type: r.type,
    number: r.number,
    accessKey: r.accessKey,
    description: r.description,
    amount: String(r.amount).replace(".", ","),
    issuedAt: r.issuedAt,
    dueDate: r.dueDate,
    // Notas antigas "emitidas" ou "a emitir" contam como pendentes.
    status: r.status === "PAID" ? "PAID" : r.status === "CANCELED" ? "CANCELED" : "PENDING",
    paidAt: r.paidAt,
    senderName: r.senderName,
    senderCnpj: formatCnpj(r.senderCnpj),
    recipientName: r.recipientName,
    recipientCnpj: formatCnpj(r.recipientCnpj),
    city: r.city,
    projectId: r.projectId,
  };
}

function csvCell(v: string | number) {
  const s = String(v);
  return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

type Panel = { mode: "view" | "edit"; id: string } | { mode: "new" } | { mode: "import" } | null;

export default function InvoiceGrid({
  invoices,
  allInvoices,
  projects,
  today,
  cities = [],
  defaultCity = "",
}: {
  invoices: InvoiceRecord[];
  /** Todas as notas (de todas as cidades): usadas para achar o CNPJ da empresa e detectar duplicadas. */
  allInvoices?: InvoiceRecord[];
  projects: ProjectOption[];
  today: string;
  /** Cidades já usadas, para sugerir ao digitar. */
  cities?: string[];
  /** Cidade da aba aberta: já vem preenchida em notas novas e importadas. */
  defaultCity?: string;
}) {
  const universe = allInvoices ?? invoices;
  // CNPJ da empresa: o que mais aparece como emitente nas entradas e como destinatário nas saídas.
  const companyCnpj = useMemo(() => {
    const count = new Map<string, number>();
    for (const i of universe) {
      const c = i.type === "IN" ? i.senderCnpj : i.recipientCnpj;
      if (c) count.set(c, (count.get(c) ?? 0) + 1);
    }
    return [...count.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
  }, [universe]);
  const existingKeys = useMemo(() => universe.map((i) => i.accessKey).filter(Boolean), [universe]);
  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 } | null>(null);
  const [panel, setPanel] = useState<Panel>(null);
  const [draft, setDraft] = useState<Draft>(() => emptyDraft(today));
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  const selected =
    panel && panel.mode !== "new" && panel.mode !== "import" ? (invoices.find((i) => i.id === panel.id) ?? null) : null;

  // Esc fecha o painel; se a nota foi excluída (ou sumiu), o painel fecha sozinho.
  useEffect(() => {
    if (!panel) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setPanel(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [panel]);
  useEffect(() => {
    if (panel && panel.mode !== "new" && panel.mode !== "import" && !selected) setPanel(null);
  }, [panel, selected]);

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    const termDigits = term.replace(/[^0-9a-z]/g, "");

    const list = invoices
      .map((r) => ({ r, shown: shownStatus(r.status, r.dueDate, today) }))
      .filter(({ r, shown }) => {
        if (typeFilter && r.type !== typeFilter) return false;
        if (statusFilter && shown !== statusFilter) return false;
        if (!term) return true;
        const text = [r.description, r.number, r.senderName, r.recipientName, r.projectName, r.city]
          .join(" ")
          .toLowerCase();
        const ids = (r.accessKey + r.senderCnpj + r.recipientCnpj).toLowerCase();
        return text.includes(term) || (termDigits.length >= 3 && ids.includes(termDigits));
      });

    if (sort) {
      const value = ({ r, shown }: (typeof list)[number]): string | number => {
        switch (sort.key) {
          case "issuedAt":
            return r.issuedAt;
          case "type":
            return r.type;
          case "number":
            return r.number;
          case "recipient":
            return r.recipientName.toLowerCase();
          case "city":
            return r.city.toLowerCase();
          case "description":
            return r.description.toLowerCase();
          case "amount":
            return r.amount;
          case "dueDate":
            return r.dueDate;
          case "status":
            return shown;
        }
      };
      list.sort((a, b) => {
        const x = value(a);
        const y = value(b);
        // Vazios sempre no fim, qualquer que seja a direção.
        if (x === "" && y !== "") return 1;
        if (y === "" && x !== "") return -1;
        return (x < y ? -1 : x > y ? 1 : 0) * sort.dir;
      });
    }
    return list;
  }, [invoices, q, typeFilter, statusFilter, sort, today]);

  const totals = useMemo(() => {
    const t = { all: 0, paid: 0, pending: 0, overdue: 0 };
    for (const { r, shown } of rows) {
      if (shown === "CANCELED") continue;
      t.all += r.amount;
      if (shown === "PAID") t.paid += r.amount;
      else if (shown === "OVERDUE") t.overdue += r.amount;
      else t.pending += r.amount;
    }
    return t;
  }, [rows]);

  function toggleSort(key: SortKey) {
    setSort((s) => (s?.key === key ? (s.dir === 1 ? { key, dir: -1 } : null) : { key, dir: 1 }));
  }

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  function openNew() {
    setDraft(emptyDraft(today, defaultCity));
    setError("");
    setPanel({ mode: "new" });
  }

  function openView(r: InvoiceRecord) {
    setError("");
    setPanel({ mode: "view", id: r.id });
  }

  function openEdit(r: InvoiceRecord) {
    setDraft(toDraft(r));
    setError("");
    setPanel({ mode: "edit", id: r.id });
  }

  function save() {
    setError("");
    const current = panel;
    if (!current || current.mode === "import") return;
    startTransition(async () => {
      const result =
        current.mode === "new" ? await createInvoice(draft) : await updateInvoice(current.id, draft);
      if ("error" in result) setError(result.error);
      else setPanel(current.mode === "new" ? null : { mode: "view", id: current.id });
    });
  }

  function togglePaid(r: InvoiceRecord) {
    startTransition(async () => {
      const result = await setInvoicePaid(r.id, r.status !== "PAID");
      if ("error" in result) alert(result.error);
    });
  }

  function remove(r: InvoiceRecord) {
    const label = r.number ? `a nota ${r.number}` : `"${r.description}"`;
    if (!confirm(`Excluir ${label}? Essa ação não pode ser desfeita.`)) return;
    startTransition(async () => {
      const result = await deleteInvoice(r.id);
      if ("error" in result) alert(result.error);
      else setPanel(null);
    });
  }

  async function copyKey(key: string) {
    try {
      await navigator.clipboard.writeText(key);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* sem permissão de área de transferência: ignora */
    }
  }

  // Define a mesma cidade para todas as notas que estão na tela (respeita busca e filtros).
  function bulkCity() {
    if (rows.length === 0) return;
    const input = window.prompt(
      `Qual a cidade das ${rows.length} nota(s) que estão na tela?\n(Use a busca para filtrar antes, por exemplo "LARANJAL". Deixe vazio para remover a cidade.)`,
      defaultCity,
    );
    if (input === null) return;
    const city = cleanCity(input);
    if (!confirm(`${city ? `Definir "${city}"` : "Remover a cidade"} em ${rows.length} nota(s)?`)) return;
    startTransition(async () => {
      const result = await assignCities([{ ids: rows.map(({ r }) => r.id), city }]);
      if ("error" in result) alert(result.error);
    });
  }

  function exportCsv() {
    const head = [
      "Emissão", "Tipo", "Nº da nota", "Chave de acesso", "Descrição", "Valor", "Vencimento",
      "Status", "Data do pagamento", "Remetente", "CNPJ/CPF remetente", "Destinatário",
      "CNPJ/CPF destinatário", "Cidade", "Obra",
    ];
    const lines = rows.map(({ r, shown }) =>
      [
        dmy(r.issuedAt), invoiceTypeLabel[r.type], r.number, r.accessKey, r.description,
        r.amount.toFixed(2).replace(".", ","), dmy(r.dueDate), invoiceShownLabel[shown],
        dmy(r.paidAt), r.senderName, formatCnpj(r.senderCnpj), r.recipientName,
        formatCnpj(r.recipientCnpj), r.city, r.projectName,
      ]
        .map(csvCell)
        .join(";"),
    );
    // BOM + ponto e vírgula: o Excel em português abre com acentos e colunas certas.
    const blob = new Blob(["﻿" + [head.join(";"), ...lines].join("\r\n")], {
      type: "text/csv;charset=utf-8",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `notas-fiscais-${today}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const toolbar = `${field} !w-auto`;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por descrição, nº, chave, CNPJ/CPF, razão social..."
          className={`${field} min-w-0 flex-1 basis-64`}
        />
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className={toolbar} aria-label="Filtrar por tipo">
          <option value="">Entrada e saída</option>
          <option value="IN">Só entradas</option>
          <option value="OUT">Só saídas</option>
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={toolbar} aria-label="Filtrar por status">
          <option value="">Todos os status</option>
          <option value="PENDING">Pendente</option>
          <option value="OVERDUE">Vencido</option>
          <option value="PAID">Pago</option>
          <option value="CANCELED">Cancelada</option>
        </select>
        <button type="button" onClick={bulkCity} disabled={pending || rows.length === 0} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40" title="Define a cidade de todas as notas que estão na tela">
          Cidade em lote
        </button>
        <button type="button" onClick={exportCsv} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50" title="Baixa as linhas filtradas para abrir no Excel">
          <DownloadIcon className="h-4 w-4" /> Exportar
        </button>
        <button type="button" onClick={() => setPanel({ mode: "import" })} className="inline-flex items-center gap-1.5 rounded-lg border border-brand-900 bg-white px-3 py-2 text-sm font-medium text-brand-900 hover:bg-brand-50">
          <DownloadIcon className="h-4 w-4 rotate-180" /> Importar NF
        </button>
        <button type="button" onClick={openNew} className="inline-flex items-center gap-1.5 rounded-lg bg-brand-900 px-3 py-2 text-sm font-medium text-white hover:bg-brand-800">
          <PlusIcon className="h-4 w-4" /> Nova nota
        </button>
      </div>

      <p className="text-xs text-slate-400">Clique em uma nota para ver todos os detalhes.</p>

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
              <th className="hidden w-28 px-3 py-2.5 font-medium md:table-cell">
                <span className="sr-only">Ações</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map(({ r, shown }) => (
              <tr
                key={r.id}
                onClick={() => openView(r)}
                onKeyDown={(e) => e.key === "Enter" && openView(r)}
                tabIndex={0}
                className={`cursor-pointer hover:bg-brand-50/60 focus:bg-brand-50/60 focus:outline-none ${shown === "CANCELED" ? "text-slate-400" : ""}`}
              >
                <td className="hidden whitespace-nowrap px-2 py-3 sm:px-3 tabular-nums sm:table-cell">{dmy(r.issuedAt)}</td>
                <td className="hidden px-2 py-3 sm:px-3 md:table-cell">
                  <Badge tone={r.type === "IN" ? "brand" : "slate"}>{invoiceTypeLabel[r.type]}</Badge>
                </td>
                <td className="hidden whitespace-nowrap px-2 py-3 sm:px-3 font-mono text-xs md:table-cell">{r.number || "—"}</td>
                <td className="max-w-[125px] px-2 py-3 sm:max-w-[220px] sm:px-3">
                  <p className={`truncate font-medium ${shown === "CANCELED" ? "line-through" : ""}`} title={r.recipientName}>
                    {r.recipientName || "—"}
                  </p>
                  <p className="truncate text-xs text-slate-500 lg:hidden">{r.description}</p>
                </td>
                <td className="hidden max-w-[130px] px-2 py-3 sm:px-3 xl:table-cell">
                  <p className="truncate text-slate-600" title={r.city}>{r.city || "—"}</p>
                </td>
                <td className="hidden max-w-[200px] px-2 py-3 sm:px-3 lg:table-cell">
                  <p className="truncate text-slate-600" title={r.description}>{r.description}</p>
                </td>
                <td className="whitespace-nowrap px-2 py-3 sm:px-3 text-right font-medium tabular-nums">{brl(r.amount)}</td>
                <td className={`hidden whitespace-nowrap px-2 py-3 sm:px-3 tabular-nums lg:table-cell ${shown === "OVERDUE" ? "font-medium text-red-600" : ""}`}>
                  {dmy(r.dueDate)}
                </td>
                <td className="px-2 py-3 sm:px-3">
                  <Badge tone={statusTone[shown]}>{invoiceShownLabel[shown]}</Badge>
                </td>
                <td className="hidden px-2 py-3 sm:px-3 md:table-cell" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-1">
                    {shown !== "CANCELED" && (
                      <button
                        type="button"
                        onClick={() => togglePaid(r)}
                        disabled={pending}
                        title={r.status === "PAID" ? "Voltar para pendente" : "Marcar como pago"}
                        className={`rounded p-1.5 disabled:opacity-40 ${r.status === "PAID" ? "bg-emerald-100 text-emerald-700" : "text-slate-500 hover:bg-emerald-50 hover:text-emerald-700"}`}
                      >
                        <CheckIcon className="h-4 w-4" />
                      </button>
                    )}
                    <button type="button" onClick={() => openEdit(r)} title="Editar" className="rounded p-1.5 text-slate-500 hover:bg-brand-50 hover:text-brand-900">
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => remove(r)} disabled={pending} title="Excluir" className="rounded p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-40">
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {rows.length === 0 && (
              <tr>
                <td colSpan={cols.length + 1} className="px-4 py-12 text-center text-slate-400">
                  {invoices.length === 0
                    ? 'Nenhuma nota cadastrada ainda. Clique em "Nova nota" para começar.'
                    : "Nenhuma nota encontrada com esses filtros."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-2 gap-2 rounded-2xl border border-slate-200 bg-white p-3 text-sm shadow-sm sm:grid-cols-5">
        <Stat label="Notas na tela" value={String(rows.length)} />
        <Stat label="Valor total" value={brl(totals.all)} />
        <Stat label="Pago" value={brl(totals.paid)} tone="text-emerald-600" />
        <Stat label="Pendente" value={brl(totals.pending)} tone="text-sun-700" />
        <Stat label="Vencido" value={brl(totals.overdue)} tone="text-red-600" />
      </div>

      {panel && (
        <div className="fixed inset-0 z-40 flex justify-end">
          <button
            type="button"
            aria-label="Fechar"
            onClick={() => setPanel(null)}
            className="absolute inset-0 animate-gtg-page bg-brand-950/40 backdrop-blur-[1px]"
          />
          <aside
            role="dialog"
            aria-modal="true"
            className="relative flex h-full w-full max-w-lg animate-gtg-slide flex-col bg-white shadow-2xl"
          >
            {panel.mode === "import" ? (
              <InvoiceImport companyCnpj={companyCnpj} existingKeys={existingKeys} cities={cities} defaultCity={defaultCity} onClose={() => setPanel(null)} />
            ) : panel.mode === "view" && selected ? (
              <Details
                r={selected}
                shown={shownStatus(selected.status, selected.dueDate, today)}
                copied={copied}
                pending={pending}
                onCopy={() => copyKey(selected.accessKey)}
                onClose={() => setPanel(null)}
                onEdit={() => openEdit(selected)}
                onTogglePaid={() => togglePaid(selected)}
                onDelete={() => remove(selected)}
              />
            ) : (
              <Form
                isNew={panel.mode === "new"}
                draft={draft}
                set={set}
                projects={projects}
                cities={cities}
                error={error}
                pending={pending}
                onSave={save}
                onCancel={() => (panel.mode === "new" ? setPanel(null) : setPanel({ mode: "view", id: (panel as { id: string }).id }))}
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
  shown,
  copied,
  pending,
  onCopy,
  onClose,
  onEdit,
  onTogglePaid,
  onDelete,
}: {
  r: InvoiceRecord;
  shown: InvoiceShownStatus;
  copied: boolean;
  pending: boolean;
  onCopy: () => void;
  onClose: () => void;
  onEdit: () => void;
  onTogglePaid: () => void;
  onDelete: () => void;
}) {
  return (
    <>
      <header className="flex items-start justify-between gap-3 border-b border-l-4 border-slate-200 border-l-sun-400 bg-brand-900 px-5 py-4 text-white">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide text-white/70">
            Nota fiscal · {invoiceTypeLabel[r.type]}
          </p>
          <h2 className="truncate text-lg font-semibold">{r.number ? `Nº ${r.number}` : "Sem número"}</h2>
        </div>
        <button type="button" onClick={onClose} aria-label="Fechar" className="rounded-lg p-1.5 hover:bg-white/10">
          <CloseIcon />
        </button>
      </header>

      <div className="flex-1 space-y-6 overflow-y-auto p-5">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-slate-400">Valor</p>
            <p className="text-2xl font-semibold tabular-nums text-brand-900">{brl(r.amount)}</p>
          </div>
          <Badge tone={statusTone[shown]}>{invoiceShownLabel[shown]}</Badge>
        </div>

        <dl className="grid grid-cols-2 gap-4">
          <Item label="Emissão">{dmy(r.issuedAt)}</Item>
          <Item label="Vencimento">
            <span className={shown === "OVERDUE" ? "font-medium text-red-600" : ""}>{dmy(r.dueDate)}</span>
          </Item>
          {r.status === "PAID" && <Item label="Pago em">{dmy(r.paidAt)}</Item>}
          <Item label="Cidade">{r.city || "—"}</Item>
          <Item label="Obra">{r.projectName || "—"}</Item>
        </dl>

        <dl className="space-y-4">
          <Item label="Descrição">{r.description}</Item>
          <Item label="Chave de acesso">
            {r.accessKey ? (
              <span className="flex items-start gap-2">
                <span className="break-all font-mono text-xs">{formatAccessKey(r.accessKey)}</span>
                <button type="button" onClick={onCopy} className="shrink-0 rounded border border-slate-300 px-2 py-0.5 text-xs text-slate-600 hover:bg-slate-50">
                  {copied ? "Copiado ✓" : "Copiar"}
                </button>
              </span>
            ) : (
              "—"
            )}
          </Item>
        </dl>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1 rounded-lg bg-slate-50 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Remetente</p>
            <p className="text-sm font-medium">{r.senderName || "—"}</p>
            <p className="font-mono text-xs text-slate-500">{formatCnpj(r.senderCnpj) || "—"}</p>
          </div>
          <div className="space-y-1 rounded-lg bg-slate-50 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Destinatário</p>
            <p className="text-sm font-medium">{r.recipientName || "—"}</p>
            <p className="font-mono text-xs text-slate-500">{formatCnpj(r.recipientCnpj) || "—"}</p>
          </div>
        </div>
      </div>

      <footer className="flex flex-wrap items-center gap-2 border-t border-slate-200 p-4">
        <button type="button" onClick={onEdit} className="inline-flex items-center gap-1.5 rounded-lg bg-brand-900 px-3 py-2 text-sm font-medium text-white hover:bg-brand-800">
          <PencilIcon className="h-4 w-4" /> Editar
        </button>
        {shown !== "CANCELED" && (
          <button type="button" onClick={onTogglePaid} disabled={pending} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60">
            <CheckIcon className="h-4 w-4" /> {r.status === "PAID" ? "Voltar para pendente" : "Marcar como pago"}
          </button>
        )}
        <button type="button" onClick={onDelete} disabled={pending} className="ml-auto inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60">
          <TrashIcon className="h-4 w-4" /> Excluir
        </button>
      </footer>
    </>
  );
}

function Form({
  isNew,
  draft,
  set,
  projects,
  cities,
  error,
  pending,
  onSave,
  onCancel,
}: {
  isNew: boolean;
  draft: Draft;
  set: <K extends keyof Draft>(key: K, value: Draft[K]) => void;
  projects: ProjectOption[];
  cities: string[];
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

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave();
      }}
      className="flex min-h-0 flex-1 flex-col"
    >
      <header className="flex items-center justify-between gap-3 border-l-4 border-sun-400 bg-brand-900 px-5 py-4 text-white">
        <h2 className="text-lg font-semibold">{isNew ? "Nova nota fiscal" : "Editar nota fiscal"}</h2>
        <button type="button" onClick={onCancel} aria-label="Cancelar" className="rounded-lg p-1.5 hover:bg-white/10">
          <CloseIcon />
        </button>
      </header>

      <div className="grid flex-1 grid-cols-2 content-start gap-x-3 gap-y-4 overflow-y-auto p-5">
        {label("Tipo", (
          <select value={draft.type} onChange={(e) => set("type", e.target.value)} className={field}>
            <option value="IN">Entrada (nota emitida, a receber)</option>
            <option value="OUT">Saída (despesa, a pagar)</option>
          </select>
        ), true)}
        {label("Nº da nota", <input value={draft.number} onChange={(e) => set("number", e.target.value)} className={field} />)}
        {label("Data de emissão", <input type="date" value={draft.issuedAt} onChange={(e) => set("issuedAt", e.target.value)} className={field} />)}
        {label("Valor (R$)", <input value={draft.amount} onChange={(e) => set("amount", e.target.value)} inputMode="decimal" placeholder="0,00" className={field} />)}
        {label("Vencimento", <input type="date" value={draft.dueDate} onChange={(e) => set("dueDate", e.target.value)} className={field} />)}
        {label("Status", (
          <select value={draft.status} onChange={(e) => set("status", e.target.value)} className={field}>
            <option value="PENDING">Pendente</option>
            <option value="PAID">Pago</option>
            <option value="CANCELED">Cancelada</option>
          </select>
        ))}
        {draft.status === "PAID" &&
          label("Data do pagamento", <input type="date" value={draft.paidAt} onChange={(e) => set("paidAt", e.target.value)} className={field} />)}
        {label("Descrição (breve)", <input value={draft.description} onChange={(e) => set("description", e.target.value)} className={field} />, true)}
        {label("Chave de acesso", (
          <input
            value={formatAccessKey(draft.accessKey)}
            onChange={(e) => set("accessKey", normalizeAccessKey(e.target.value))}
            placeholder="Chave ou código de verificação"
            className={`${field} font-mono text-xs`}
          />
        ), true)}

        <p className="col-span-2 border-t border-slate-100 pt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Remetente</p>
        {label("Razão social", <input value={draft.senderName} onChange={(e) => set("senderName", e.target.value)} className={field} />)}
        {label("CNPJ/CPF", <input value={draft.senderCnpj} onChange={(e) => set("senderCnpj", formatCnpj(e.target.value))} className={`${field} font-mono`} />)}

        <p className="col-span-2 border-t border-slate-100 pt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Destinatário</p>
        {label("Razão social", <input value={draft.recipientName} onChange={(e) => set("recipientName", e.target.value)} className={field} />)}
        {label("CNPJ/CPF", <input value={draft.recipientCnpj} onChange={(e) => set("recipientCnpj", formatCnpj(e.target.value))} className={`${field} font-mono`} />)}

        {label("Cidade", (
          <>
            <input
              value={draft.city}
              onChange={(e) => set("city", e.target.value)}
              list="cidades-notas"
              placeholder="Ex.: Laranjal Paulista - SP"
              className={field}
            />
            <datalist id="cidades-notas">
              {cities.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </>
        ), true)}
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
