"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import StatusBadge from "@/components/StatusBadge";
import { brl, stockStatus, type Product, type StockStatus } from "@/lib/types";

export default function ProductsTable({
  products,
  categories,
}: {
  products: Product[];
  categories: string[];
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState<"" | StockStatus>("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      if (q && !p.name.toLowerCase().includes(q) && !p.sku.toLowerCase().includes(q))
        return false;
      if (category && p.category !== category) return false;
      if (status && stockStatus(p) !== status) return false;
      return true;
    });
  }, [products, query, category, status]);

  const inputCls =
    "rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nome ou SKU..."
          className={`${inputCls} flex-1`}
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className={inputCls}
        >
          <option value="">Todas as categorias</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as "" | StockStatus)}
          className={inputCls}
        >
          <option value="">Todos os status</option>
          <option value="ok">Em estoque</option>
          <option value="low">Estoque baixo</option>
          <option value="out">Em falta</option>
        </select>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[800px] text-left text-sm">
          <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">SKU</th>
              <th className="px-4 py-3 font-medium">Produto</th>
              <th className="px-4 py-3 font-medium">Categoria</th>
              <th className="px-4 py-3 text-right font-medium">Saldo</th>
              <th className="px-4 py-3 text-right font-medium">Mínimo</th>
              <th className="px-4 py-3 text-right font-medium">Custo médio</th>
              <th className="px-4 py-3 text-right font-medium">Venda</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-mono text-xs text-slate-500">{p.sku}</td>
                <td className="px-4 py-3 font-medium">
                  <Link href={`/products/${p.id}`} className="text-brand-900 hover:underline">
                    {p.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-600">{p.category}</td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {p.currentStock} <span className="text-slate-400">{p.unit}</span>
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-slate-500">
                  {p.minStock}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-slate-600">{brl(p.costPrice)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{brl(p.salePrice)}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={stockStatus(p)} />
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-slate-400">
                  {products.length === 0
                    ? "Nenhum produto cadastrado ainda."
                    : "Nenhum produto encontrado."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-slate-400">
        {filtered.length} de {products.length} produtos
      </p>
    </div>
  );
}
