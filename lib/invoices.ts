// Regras puras das notas fiscais (sem Next/Prisma): usadas no servidor e no navegador.
import type { InvoiceRecord, InvoiceShownStatus, InvoiceStatus, InvoiceSummary } from "@/lib/types";

/** Status mostrado na tela. "Vencido" não é gravado: sai do vencimento + hoje (AAAA-MM-DD). */
export function shownStatus(
  status: InvoiceStatus,
  dueDate: string,
  today: string,
): InvoiceShownStatus {
  if (status === "PAID") return "PAID";
  if (status === "CANCELED") return "CANCELED";
  if (dueDate && dueDate < today) return "OVERDUE";
  return "PENDING";
}

/** Só letras e números, maiúsculas (o CNPJ alfanumérico já existe desde 2026). */
const clean = (v: string, max: number) =>
  v.replace(/[^0-9a-zA-Z]/g, "").toUpperCase().slice(0, max);

export const normalizeCnpj = (v: string) => clean(v, 14);
// NF-e tem 44 caracteres; NFS-e (prefeituras) usa códigos de verificação de outros tamanhos.
export const normalizeAccessKey = (v: string) => clean(v, 60);

/** CPF (11 dígitos) ou CNPJ (14), com máscara também enquanto digita. */
export function formatCnpj(v: string): string {
  const d = normalizeCnpj(v);
  if (d.length <= 11 && /^\d*$/.test(d)) {
    let c = d.slice(0, 3);
    if (d.length > 3) c += "." + d.slice(3, 6);
    if (d.length > 6) c += "." + d.slice(6, 9);
    if (d.length > 9) c += "-" + d.slice(9, 11);
    return c;
  }
  let out = d.slice(0, 2);
  if (d.length > 2) out += "." + d.slice(2, 5);
  if (d.length > 5) out += "." + d.slice(5, 8);
  if (d.length > 8) out += "/" + d.slice(8, 12);
  if (d.length > 12) out += "-" + d.slice(12, 14);
  return out;
}

/** Chave de acesso em blocos de 4 dígitos, como aparece na DANFE. */
export const formatAccessKey = (v: string) => normalizeAccessKey(v).replace(/(.{4})(?=.)/g, "$1 ");

export function summarizeInvoices(records: InvoiceRecord[], today: string): InvoiceSummary {
  const active = records.filter((r) => r.status !== "CANCELED");
  const sum = (list: InvoiceRecord[]) => list.reduce((s, r) => s + r.amount, 0);
  const group = (key: string, label: string, paidLabel: string, list: InvoiceRecord[]) => {
    const total = sum(list);
    const paid = sum(list.filter((r) => r.status === "PAID"));
    return {
      key,
      label,
      paidLabel,
      count: list.length,
      total,
      paid,
      percent: total > 0 ? Math.round((paid / total) * 100) : 0,
    };
  };

  const open = active.filter((r) => r.status !== "PAID");
  const overdue = open.filter((r) => shownStatus(r.status, r.dueDate, today) === "OVERDUE");
  const pending = open.filter((r) => shownStatus(r.status, r.dueDate, today) === "PENDING");

  return {
    groups: [
      group("all", "Todas", "quitadas", active),
      // Entrada = nota emitida pela empresa (dinheiro a receber); Saída = nota de despesa (a pagar).
      group("in", "Entradas", "recebidas", active.filter((r) => r.type === "IN")),
      group("out", "Saídas", "pagas", active.filter((r) => r.type === "OUT")),
    ],
    paidAmount: sum(active.filter((r) => r.status === "PAID")),
    paidCount: active.length - open.length,
    pendingAmount: sum(pending),
    pendingCount: pending.length,
    overdueAmount: sum(overdue),
    overdueCount: overdue.length,
    next: [...open]
      .sort((a, b) => (a.dueDate || "9999").localeCompare(b.dueDate || "9999"))
      .slice(0, 5)
      .map((r) => ({ ...r, shown: shownStatus(r.status, r.dueDate, today) })),
  };
}
