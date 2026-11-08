"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { createProduct } from "@/app/actions";
import type { Category } from "@/lib/types";

const inputCls =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {children}
      {hint && <span className="block text-xs text-slate-400">{hint}</span>}
    </label>
  );
}

export default function ProductForm({ categories }: { categories: Category[] }) {
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const data = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await createProduct(data);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Nome">
          <input name="name" required className={inputCls} placeholder="Ex.: Papel Couchê 150g A4" />
        </Field>
        <Field label="SKU / código" hint="Precisa ser único">
          <input name="sku" required className={inputCls} placeholder="PAP-003" />
        </Field>
        <Field label="Categoria">
          <select name="categoryId" className={inputCls} defaultValue="">
            <option value="">Sem categoria</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Ou criar nova categoria" hint="Se preencher, ela é usada no lugar da lista">
          <input name="newCategory" className={inputCls} placeholder="Ex.: Tintas" />
        </Field>
        <Field label="Unidade">
          <select name="unit" className={inputCls} defaultValue="un">
            <option value="un">Unidade (un)</option>
            <option value="cx">Caixa (cx)</option>
            <option value="kg">Quilo (kg)</option>
            <option value="m">Metro (m)</option>
          </select>
        </Field>
        <Field label="Estoque inicial" hint="Registrado como uma entrada (opcional)">
          <input name="initialStock" inputMode="decimal" defaultValue="0" className={inputCls} />
        </Field>
        <Field label="Custo inicial (R$)">
          <input name="costPrice" inputMode="decimal" defaultValue="0" className={inputCls} />
        </Field>
        <Field label="Preço de venda (R$)">
          <input name="salePrice" inputMode="decimal" defaultValue="0" className={inputCls} />
        </Field>
        <Field label="Estoque mínimo" hint="Abaixo disso o produto aparece como estoque baixo">
          <input name="minStock" inputMode="decimal" defaultValue="0" className={inputCls} />
        </Field>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
        <Link
          href="/products"
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50"
        >
          Cancelar
        </Link>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-brand-900 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-60"
        >
          {pending ? "Salvando..." : "Salvar produto"}
        </button>
      </div>
    </form>
  );
}
