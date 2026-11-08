"use server";

import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { createSession, destroySession } from "@/lib/auth";
import { verifyPassword } from "@/lib/password";
import type { LoginState } from "@/lib/types";

export async function login(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) return { error: "Informe e-mail e senha.", email };

  let userId: string | null = null;
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    const ok = await verifyPassword(password, user?.passwordHash);
    if (user && ok) userId = user.id;
  } catch (e) {
    console.error(e);
    return { error: "Não foi possível entrar agora. Tente novamente.", email };
  }

  // Mesma mensagem para e-mail inexistente e senha errada.
  if (!userId) return { error: "E-mail ou senha incorretos.", email };

  await createSession(userId);
  redirect("/");
}

export async function logout() {
  await destroySession();
  redirect("/login");
}
