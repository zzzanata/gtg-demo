"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { hashPassword } from "@/lib/password";
import type { UserActionResult } from "@/lib/types";

const text = (v: FormDataEntryValue | null) => String(v ?? "").trim();

export async function createUser(formData: FormData): Promise<UserActionResult> {
  await requireAdmin();

  const name = text(formData.get("name"));
  const email = text(formData.get("email")).toLowerCase();
  const password = String(formData.get("password") ?? "");
  const role = text(formData.get("role")) === "ADMIN" ? "ADMIN" : "OPERATOR";

  if (!name) return { error: "Informe o nome." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "E-mail inválido." };
  if (password.length < 8) return { error: "A senha precisa ter pelo menos 8 caracteres." };

  try {
    await prisma.user.create({
      data: { name, email, passwordHash: await hashPassword(password), role },
    });
  } catch (e) {
    if ((e as { code?: string }).code === "P2002") {
      return { error: "Já existe um usuário com esse e-mail." };
    }
    console.error(e);
    return { error: "Não foi possível criar o usuário. Tente novamente." };
  }

  revalidatePath("/users");
  return { success: true };
}
