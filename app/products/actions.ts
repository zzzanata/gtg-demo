"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { parseNumber, round2 } from "@/lib/form";
import type { MutationResult } from "@/lib/types";

const NEW_CATEGORY = "__new__";

export type ProductInput = {
  name: string;
  categoryId: string; // id, "" (sem categoria) ou NEW_CATEGORY
  newCategory: string;
  unit: string;
  quantity: string;
  unitValue: string;
  minStock: string;
};

type Parsed = {
  error?: string;
  name?: string;
  unit?: string;
  quantity?: number;
  unitValue?: number;
  minStock?: number;
};

function parse(input: ProductInput): Parsed {
  const name = input.name.trim().replace(/\s+/g, " ");
  if (!name) return { error: "Informe o nome do produto." };

  const quantity = input.quantity.trim() === "" ? 0 : parseNumber(input.quantity);
  const unitValue = input.unitValue.trim() === "" ? 0 : parseNumber(input.unitValue);
  const minStock = input.minStock.trim() === "" ? 0 : parseNumber(input.minStock);
  if (quantity === null || unitValue === null || minStock === null) {
    return { error: "Quantidade, valor e mínimo precisam ser números." };
  }
  if (quantity < 0 || unitValue < 0 || minStock < 0) {
    return { error: "Quantidade, valor e mínimo não podem ser negativos." };
  }

  return {
    name,
    unit: input.unit.trim() || "un",
    quantity: Math.round(quantity * 1000) / 1000,
    unitValue: round2(unitValue),
    minStock: Math.round(minStock * 1000) / 1000,
  };
}

async function resolveCategory(
  tx: Pick<typeof prisma, "category">,
  input: ProductInput,
): Promise<string | null> {
  if (input.categoryId === NEW_CATEGORY) {
    const name = input.newCategory.trim();
    if (!name) return null;
    const c = await tx.category.upsert({ where: { name }, update: {}, create: { name } });
    return c.id;
  }
  return input.categoryId || null;
}

// SKU não aparece mais na tela, mas o banco exige um código único: gera sozinho.
const makeSku = () =>
  `P${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 5).toUpperCase()}`;

function refresh() {
  revalidatePath("/");
  revalidatePath("/products");
}

export async function createProduct(input: ProductInput): Promise<MutationResult> {
  await requireAdmin();
  const p = parse(input);
  if (p.error) return { error: p.error };

  try {
    await prisma.$transaction(async (tx) => {
      const categoryId = await resolveCategory(tx, input);
      await tx.product.create({
        data: {
          sku: makeSku(),
          name: p.name!,
          unit: p.unit!,
          currentStock: p.quantity!,
          costPrice: p.unitValue!,
          minStock: p.minStock!,
          categoryId,
        },
      });
    });
  } catch (e) {
    console.error(e);
    return { error: "Não foi possível salvar o produto. Tente novamente." };
  }

  refresh();
  return { success: true };
}

export async function updateProduct(id: string, input: ProductInput): Promise<MutationResult> {
  await requireAdmin();
  const p = parse(input);
  if (p.error) return { error: p.error };

  try {
    await prisma.$transaction(async (tx) => {
      const categoryId = await resolveCategory(tx, input);
      await tx.product.update({
        where: { id },
        data: {
          name: p.name!,
          unit: p.unit!,
          currentStock: p.quantity!,
          costPrice: p.unitValue!,
          minStock: p.minStock!,
          categoryId,
        },
      });
    });
  } catch (e) {
    console.error(e);
    return { error: "Não foi possível salvar as alterações." };
  }

  refresh();
  return { success: true };
}

export async function deleteProduct(id: string): Promise<MutationResult> {
  await requireAdmin();

  try {
    await prisma.$transaction(async (tx) => {
      // Histórico antigo de movimentações de estoque (não é mais usado) impede apagar o produto.
      await tx.stockMovement.deleteMany({ where: { productId: id } });
      await tx.product.delete({ where: { id } });
    });
  } catch (e) {
    console.error(e);
    return { error: "Não foi possível excluir o produto." };
  }

  refresh();
  return { success: true };
}
