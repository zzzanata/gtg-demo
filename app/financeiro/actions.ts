"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { parseDay } from "@/lib/dates";
import { parseNumber, round2 } from "@/lib/form";
import type { MutationResult } from "@/lib/types";

const NEW_CATEGORY = "__new__";

export type MovementInput = {
  type: string; // REVENUE (entrada) | COST (saída)
  date: string;
  categoryId: string; // id, "" ou NEW_CATEGORY
  newCategory: string;
  description: string;
  quantity: string;
  unitValue: string;
  projectId: string;
};

function refresh() {
  revalidatePath("/");
  revalidatePath("/financeiro");
}

type Parsed = { error: string } | { data: { type: "REVENUE" | "COST"; date: Date; description: string; quantity: number; unitValue: number; amount: number; projectId: string | null } };

function parse(input: MovementInput): Parsed {
  if (input.type !== "REVENUE" && input.type !== "COST") return { error: "Escolha entrada ou saída." };
  const date = parseDay(input.date);
  if (!date) return { error: "Informe a data." };
  const description = input.description.trim();
  if (!description) return { error: "Informe a descrição." };

  const quantity = input.quantity.trim() === "" ? 1 : parseNumber(input.quantity);
  const unitValue = parseNumber(input.unitValue);
  if (quantity === null || quantity <= 0) return { error: "Informe uma quantidade maior que zero." };
  if (unitValue === null || unitValue <= 0) return { error: "Informe um valor maior que zero." };

  return {
    data: {
      type: input.type,
      date,
      description,
      quantity: Math.round(quantity * 1000) / 1000,
      unitValue: round2(unitValue),
      amount: round2(quantity * unitValue),
      projectId: input.projectId || null,
    },
  };
}

async function resolveCategory(
  tx: Pick<typeof prisma, "financeCategory">,
  input: MovementInput,
): Promise<string | null> {
  if (input.categoryId === NEW_CATEGORY) {
    const name = input.newCategory.trim();
    if (!name) return null;
    const c = await tx.financeCategory.upsert({ where: { name }, update: {}, create: { name } });
    return c.id;
  }
  return input.categoryId || null;
}

export async function createEntry(input: MovementInput): Promise<MutationResult> {
  await requireAdmin();
  const parsed = parse(input);
  if ("error" in parsed) return parsed;

  try {
    await prisma.$transaction(async (tx) => {
      const categoryId = await resolveCategory(tx, input);
      await tx.financeEntry.create({ data: { ...parsed.data, categoryId } });
    });
  } catch (e) {
    console.error(e);
    return { error: "Não foi possível salvar a movimentação. Tente novamente." };
  }

  refresh();
  return { success: true };
}

export async function updateEntry(id: string, input: MovementInput): Promise<MutationResult> {
  await requireAdmin();
  const parsed = parse(input);
  if ("error" in parsed) return parsed;

  try {
    await prisma.$transaction(async (tx) => {
      const categoryId = await resolveCategory(tx, input);
      await tx.financeEntry.update({ where: { id }, data: { ...parsed.data, categoryId } });
    });
  } catch (e) {
    console.error(e);
    return { error: "Não foi possível salvar as alterações." };
  }

  refresh();
  return { success: true };
}

export async function deleteEntry(id: string): Promise<MutationResult> {
  await requireAdmin();

  try {
    await prisma.financeEntry.delete({ where: { id } });
  } catch (e) {
    console.error(e);
    return { error: "Não foi possível excluir a movimentação." };
  }

  refresh();
  return { success: true };
}
