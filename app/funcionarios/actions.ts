"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { parseNumber, round2 } from "@/lib/form";
import type { MutationResult } from "@/lib/types";

export type EmployeeInput = {
  fullName: string;
  jobTitle: string;
  dailyRate: string; // vazio = não informado
  monthlyRate: string;
};

type Parsed = { error: string } | { data: Record<string, unknown> };

function rate(raw: string, label: string): { error: string } | { value: number | null } {
  if (raw.trim() === "") return { value: null };
  const n = parseNumber(raw);
  if (n === null || n < 0) return { error: `${label} inválido.` };
  return { value: round2(n) };
}

function parseInput(input: EmployeeInput): Parsed {
  const fullName = input.fullName.trim().replace(/\s+/g, " ");
  const jobTitle = input.jobTitle.trim();
  if (!fullName) return { error: "Informe o nome completo." };
  if (!jobTitle) return { error: "Informe a função." };

  const daily = rate(input.dailyRate, "Valor da diária");
  if ("error" in daily) return daily;
  const monthly = rate(input.monthlyRate, "Valor mensal");
  if ("error" in monthly) return monthly;

  return { data: { fullName, jobTitle, dailyRate: daily.value, monthlyRate: monthly.value } };
}

export async function createEmployee(input: EmployeeInput): Promise<MutationResult> {
  await requireAdmin();
  const parsed = parseInput(input);
  if ("error" in parsed) return parsed;

  try {
    await prisma.employee.create({ data: parsed.data as never });
  } catch (e) {
    console.error(e);
    return { error: "Não foi possível salvar o funcionário. Tente novamente." };
  }

  revalidatePath("/funcionarios");
  return { success: true };
}

export async function updateEmployee(id: string, input: EmployeeInput): Promise<MutationResult> {
  await requireAdmin();
  const parsed = parseInput(input);
  if ("error" in parsed) return parsed;

  try {
    await prisma.employee.update({ where: { id }, data: parsed.data as never });
  } catch (e) {
    console.error(e);
    return { error: "Não foi possível salvar as alterações." };
  }

  revalidatePath("/funcionarios");
  return { success: true };
}

export async function deleteEmployee(id: string): Promise<MutationResult> {
  await requireAdmin();

  try {
    await prisma.employee.delete({ where: { id } });
  } catch (e) {
    console.error(e);
    return { error: "Não foi possível excluir o funcionário." };
  }

  revalidatePath("/funcionarios");
  return { success: true };
}
