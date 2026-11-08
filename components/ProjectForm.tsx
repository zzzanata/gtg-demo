"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { createProject } from "@/app/obras/actions";

const inputCls =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {children}
      {hint && <span className="block text-xs text-slate-400">{hint}</span>}
    </label>
  );
}

export default function ProjectForm() {
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const data = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await createProject(data);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Nome da obra">
          <input name="name" required className={inputCls} placeholder="Ex.: Usina Rio de Janeiro" />
        </Field>
        <Field label="Local">
          <input name="location" className={inputCls} placeholder="Ex.: Niterói, RJ" />
        </Field>
        <Field label="Potência (kWp)" hint="Opcional">
          <input name="powerKwp" inputMode="decimal" className={inputCls} placeholder="Ex.: 750" />
        </Field>
        <Field label="Líder da obra" hint="Opcional. Dá para adicionar o resto da equipe depois">
          <input name="leadName" className={inputCls} />
        </Field>
        <Field label="Início">
          <input name="startDate" type="date" className={inputCls} />
        </Field>
        <Field label="Previsão de término">
          <input name="expectedEnd" type="date" className={inputCls} />
        </Field>
      </div>

      <label className="flex items-start gap-2.5 text-sm text-slate-700">
        <input
          type="checkbox"
          name="useTemplate"
          defaultChecked
          className="mt-0.5 h-4 w-4 rounded border-slate-300"
        />
        <span>
          Começar com o checklist padrão de usina solar
          <span className="block text-xs text-slate-400">
            Projeto e homologação, suprimentos, instalação e comissionamento. Você pode adicionar ou
            remover tarefas depois.
          </span>
        </span>
      </label>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
        <Link
          href="/obras"
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50"
        >
          Cancelar
        </Link>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-brand-900 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-60"
        >
          {pending ? "Criando..." : "Criar obra"}
        </button>
      </div>
    </form>
  );
}
