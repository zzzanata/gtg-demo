"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { parseDay, todayBR } from "@/lib/dates";
import { parseNumber, round2 } from "@/lib/form";
import { cleanCity } from "@/lib/cities";
import { normalizeAccessKey, normalizeCnpj } from "@/lib/invoices";
import type { MutationResult } from "@/lib/types";

// Tudo chega como texto, exatamente como foi digitado na linha da planilha.
export type InvoiceInput = {
  type: string;
  number: string;
  accessKey: string;
  description: string;
  amount: string;
  issuedAt: string;
  dueDate: string;
  status: string; // PENDING | PAID | CANCELED
  paidAt: string;
  senderName: string;
  senderCnpj: string;
  recipientName: string;
  recipientCnpj: string;
  city: string;
  projectId: string;
};

function refresh() {
  revalidatePath("/");
  revalidatePath("/notas-fiscais");
}

type Parsed = { error: string } | { data: Record<string, unknown> };

function parseInput(input: InvoiceInput): Parsed {
  const description = input.description.trim();
  const amount = parseNumber(input.amount);
  const accessKey = normalizeAccessKey(input.accessKey);
  const senderCnpj = normalizeCnpj(input.senderCnpj);
  const recipientCnpj = normalizeCnpj(input.recipientCnpj);

  if (input.type !== "IN" && input.type !== "OUT") return { error: "Escolha o tipo: entrada ou saída." };
  if (!description) return { error: "Informe a descrição." };
  if (amount === null || amount <= 0) return { error: "Informe um valor maior que zero." };
  const badDoc = (d: string) => d !== "" && d.length !== 11 && d.length !== 14;
  if (badDoc(senderCnpj) || badDoc(recipientCnpj)) {
    return { error: "CNPJ tem 14 caracteres e CPF tem 11." };
  }
  if (!["PENDING", "PAID", "CANCELED"].includes(input.status)) return { error: "Status inválido." };

  const paid = input.status === "PAID";

  return {
    data: {
      type: input.type,
      number: input.number.trim() || null,
      accessKey: accessKey || null,
      description,
      amount: round2(amount),
      issuedAt: parseDay(input.issuedAt),
      dueDate: parseDay(input.dueDate),
      status: input.status,
      paidAt: paid ? (parseDay(input.paidAt) ?? parseDay(todayBR())) : null,
      senderName: input.senderName.trim() || null,
      senderCnpj: senderCnpj || null,
      recipientName: input.recipientName.trim() || null,
      recipientCnpj: recipientCnpj || null,
      city: cleanCity(input.city ?? "") || null,
      projectId: input.projectId || null,
    },
  };
}

function failure(e: unknown, fallback: string): { error: string } {
  if ((e as { code?: string }).code === "P2002") {
    return { error: "Já existe uma nota com essa chave de acesso." };
  }
  console.error(e);
  return { error: fallback };
}

export async function createInvoice(input: InvoiceInput): Promise<MutationResult> {
  await requireAdmin();
  const parsed = parseInput(input);
  if ("error" in parsed) return parsed;

  try {
    await prisma.invoice.create({ data: parsed.data as never });
  } catch (e) {
    return failure(e, "Não foi possível salvar a nota. Tente novamente.");
  }

  refresh();
  return { success: true };
}

export async function updateInvoice(id: string, input: InvoiceInput): Promise<MutationResult> {
  await requireAdmin();
  const parsed = parseInput(input);
  if ("error" in parsed) return parsed;

  try {
    await prisma.invoice.update({ where: { id }, data: parsed.data as never });
  } catch (e) {
    return failure(e, "Não foi possível salvar as alterações.");
  }

  refresh();
  return { success: true };
}

/** Atalho da linha: marca como paga (com a data de hoje) ou volta para pendente. */
export async function setInvoicePaid(id: string, paid: boolean): Promise<MutationResult> {
  await requireAdmin();

  try {
    await prisma.invoice.update({
      where: { id },
      data: paid
        ? { status: "PAID", paidAt: parseDay(todayBR()) }
        : { status: "PENDING", paidAt: null },
    });
  } catch (e) {
    return failure(e, "Não foi possível alterar o status.");
  }

  refresh();
  return { success: true };
}

export async function deleteInvoice(id: string): Promise<MutationResult> {
  await requireAdmin();

  try {
    await prisma.invoice.delete({ where: { id } });
  } catch (e) {
    return failure(e, "Não foi possível excluir a nota.");
  }

  refresh();
  return { success: true };
}

export type ImportResult =
  | { error: string }
  | { success: true; created: number; skipped: number; failed: { number: string; error: string }[] };

/** Importa várias notas de uma vez (lidas dos XMLs). Notas que já existem são puladas. */
export async function importInvoices(inputs: InvoiceInput[]): Promise<ImportResult> {
  await requireAdmin();
  if (!Array.isArray(inputs) || inputs.length === 0) return { error: "Nenhuma nota para importar." };
  if (inputs.length > 200) return { error: "Importe no máximo 200 notas por vez." };

  let created = 0;
  let skipped = 0;
  const failed: { number: string; error: string }[] = [];

  for (const input of inputs) {
    const parsed = parseInput(input);
    if ("error" in parsed) {
      failed.push({ number: input.number || "?", error: parsed.error });
      continue;
    }
    const d = parsed.data as {
      accessKey: string | null;
      number: string | null;
      senderCnpj: string | null;
    };

    try {
      // Duplicada: mesma chave de acesso, ou (sem chave) mesmo número + mesmo emitente.
      const exists = d.accessKey
        ? await prisma.invoice.findUnique({ where: { accessKey: d.accessKey }, select: { id: true } })
        : d.number
          ? await prisma.invoice.findFirst({
              where: { number: d.number, senderCnpj: d.senderCnpj },
              select: { id: true },
            })
          : null;
      if (exists) {
        skipped++;
        continue;
      }
      await prisma.invoice.create({ data: parsed.data as never });
      created++;
    } catch (e) {
      if ((e as { code?: string }).code === "P2002") skipped++;
      else {
        console.error(e);
        failed.push({ number: input.number || "?", error: "Erro ao salvar." });
      }
    }
  }

  if (created > 0) refresh();
  return { success: true, created, skipped, failed };
}

/** Define a cidade de várias notas de uma vez (usado no "Cidade em lote" e em "Sugerir cidades"). */
export async function assignCities(items: { ids: string[]; city: string }[]): Promise<MutationResult> {
  await requireAdmin();
  if (!Array.isArray(items) || items.length === 0) return { error: "Nada para atualizar." };

  let total = 0;
  for (const it of items) total += it.ids?.length ?? 0;
  if (total === 0 || total > 1000) return { error: "Escolha de 1 a 1000 notas." };

  try {
    await prisma.$transaction(
      items.map((it) =>
        prisma.invoice.updateMany({
          where: { id: { in: it.ids } },
          data: { city: cleanCity(it.city) || null },
        }),
      ),
    );
  } catch (e) {
    return failure(e, "Não foi possível definir a cidade.");
  }

  refresh();
  return { success: true };
}
