"use client";

import { useRef, useState, useTransition } from "react";
import { createUser } from "@/app/actions";

const inputCls =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

export default function UserForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage(null);
    const data = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await createUser(data);
      if ("error" in result) {
        setMessage({ ok: false, text: result.error });
      } else {
        formRef.current?.reset();
        setMessage({ ok: true, text: "Usuário criado." });
      }
    });
  }

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <h2 className="font-medium">Novo usuário</h2>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-slate-700">Nome</span>
          <input name="name" required className={inputCls} />
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-slate-700">E-mail</span>
          <input name="email" type="email" required autoComplete="off" className={inputCls} />
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-slate-700">Senha inicial</span>
          <input
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className={inputCls}
          />
          <span className="block text-xs text-slate-400">Mínimo de 8 caracteres</span>
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-slate-700">Perfil</span>
          <select name="role" defaultValue="OPERATOR" className={inputCls}>
            <option value="OPERATOR">Operador (só lança movimentações)</option>
            <option value="ADMIN">Administrador (acesso total)</option>
          </select>
        </label>
      </div>

      {message && (
        <p
          className={`rounded-lg px-3 py-2 text-sm ${
            message.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
          }`}
        >
          {message.text}
        </p>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-brand-900 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-60"
        >
          {pending ? "Criando..." : "Criar usuário"}
        </button>
      </div>
    </form>
  );
}
