"use client";

import { Fragment, useMemo, useState, useTransition } from "react";
import { createProduct, deleteProduct, updateProduct, type ProductInput } from "@/app/products/actions";
import { PencilIcon, PlusIcon, TrashIcon } from "@/components/Icons";
import StatusBadge from "@/components/StatusBadge";
import { brl, stockStatus, type Category, type Product, type StockStatus } from "@/lib/types";

const NEW_CATEGORY = "__new__";

const cell =
  "w-full rounded border border-brand-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-300";
const toolbarInput =
  "rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

const empty: ProductInput = {
  name: "",
  categoryId: "",
  newCategory: "",
  unit: "un",
  quantity: "",
  unitValue: "",
  minStock: "",
};

const num = (n: number) => String(n).replace(".", ",");
const qty = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 3 });

export default function ProductGrid({
  products,
  categories,
  canEdit,
}: {
  products: Product[];
  categories: Category[];
  canEdit: boolean;
}) {
  const [q, setQ] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | StockStatus>("");
  const [editingId, setEditingId] = useState<string | null>(null); // id, "new" ou null
  const [draft, setDraft] = useState<ProductInput>(empty);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return products.filter((p) => {
      if (term && !p.name.toLowerCase().includes(term)) return false;
      if (categoryFilter && p.categoryId !== categoryFilter) return false;
      if (statusFilter && stockStatus(p) !== statusFilter) return false;
      return true;
    });
  }, [products, q, categoryFilter, statusFilter]);

  const totalValue = rows.reduce((s, p) => s + p.currentStock * p.costPrice, 0);
  const allValue = products.reduce((s, p) => s + p.currentStock * p.costPrice, 0);
  const lowCount = products.filter((p) => stockStatus(p) === "low").length;
  const outCount = products.filter((p) => stockStatus(p) === "out").length;

  function set<K extends keyof ProductInput>(key: K, value: string) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  function startNew() {
    setDraft(empty);
    setError("");
    setEditingId("new");
  }

  function startEdit(p: Product) {
    setDraft({
      name: p.name,
      categoryId: p.categoryId,
      newCategory: "",
      unit: p.unit,
      quantity: num(p.currentStock),
      unitValue: num(p.costPrice),
      minStock: p.minStock ? num(p.minStock) : "",
    });
    setError("");
    setEditingId(p.id);
  }

  function cancel() {
    setEditingId(null);
    setError("");
  }

  function save() {
    setError("");
    startTransition(async () => {
      const result =
        editingId === "new" ? await createProduct(draft) : await updateProduct(editingId!, draft);
      if ("error" in result) setError(result.error);
      else setEditingId(null);
    });
  }

  function remove(p: Product) {
    if (!confirm(`Excluir "${p.name}"? Essa ação não pode ser desfeita.`)) return;
    startTransition(async () => {
      const result = await deleteProduct(p.id);
      if ("error" in result) alert(result.error);
    });
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && (e.target as HTMLElement).tagName === "INPUT") {
      e.preventDefault();
      save();
    } else if (e.key === "Escape") cancel();
  }

  const editing = editingId !== null;
  const draftTotal = (parseFloat(draft.quantity.replace(",", ".")) || 0) * (parseFloat(draft.unitValue.replace(",", ".")) || 0);

  function EditRow() {
    return (
      <Fragment>
        <tr className="bg-brand-50/60" onKeyDown={onKey}>
          <td className="px-3 py-2">
            <input value={draft.name} onChange={(e) => set("name", e.target.value)} className={cell} placeholder="Nome do produto" aria-label="Nome" autoFocus />
          </td>
          <td className="hidden px-3 py-2 md:table-cell">
            <select value={draft.categoryId} onChange={(e) => set("categoryId", e.target.value)} className={cell} aria-label="Categoria">
              <option value="">Sem categoria</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
              <option value={NEW_CATEGORY}>+ Nova categoria...</option>
            </select>
            {draft.categoryId === NEW_CATEGORY && (
              <input value={draft.newCategory} onChange={(e) => set("newCategory", e.target.value)} className={`${cell} mt-1`} placeholder="Nome da categoria" aria-label="Nova categoria" />
            )}
          </td>
          <td className="px-3 py-2">
            <div className="flex gap-1">
              <input value={draft.quantity} onChange={(e) => set("quantity", e.target.value)} inputMode="decimal" className={`${cell} min-w-16 text-right`} placeholder="0" aria-label="Quantidade" />
              <input value={draft.unit} onChange={(e) => set("unit", e.target.value)} className={`${cell} !w-14`} aria-label="Unidade" title="Unidade (un, cx, m...)" />
            </div>
          </td>
          <td className="px-3 py-2">
            <input value={draft.unitValue} onChange={(e) => set("unitValue", e.target.value)} inputMode="decimal" className={`${cell} text-right`} placeholder="0,00" aria-label="Valor unitário" />
          </td>
          <td className="hidden px-3 py-2 text-right text-sm tabular-nums text-slate-500 sm:table-cell">{brl(draftTotal)}</td>
          <td className="hidden px-3 py-2 lg:table-cell">
            <input value={draft.minStock} onChange={(e) => set("minStock", e.target.value)} inputMode="decimal" className={`${cell} text-right`} placeholder="Mínimo" aria-label="Estoque mínimo" />
          </td>
          <td className="hidden px-3 py-2 lg:table-cell" />
          <td className="px-3 py-2">
            <div className="flex gap-1">
              <button type="button" onClick={save} disabled={pending} className="rounded bg-brand-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-800 disabled:opacity-60">
                {pending ? "..." : "Salvar"}
              </button>
              <button type="button" onClick={cancel} disabled={pending} className="rounded border border-slate-300 bg-white px-2 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
                ✕
              </button>
            </div>
          </td>
        </tr>
        {error && (
          <tr className="bg-brand-50/60">
            <td colSpan={8} className="px-3 pb-2 text-xs text-red-600">{error}</td>
          </tr>
        )}
      </Fragment>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card label="Produtos cadastrados" value={String(products.length)} />
        <Card label="Valor total em estoque" value={brl(allValue)} tone="text-brand-900" />
        <Card label="Estoque baixo" value={String(lowCount)} tone="text-sun-700" />
        <Card label="Em falta" value={String(outCount)} tone="text-red-600" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar produto..." className={`${toolbarInput} min-w-0 flex-1 basis-48`} />
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className={toolbarInput} aria-label="Filtrar por categoria">
          <option value="">Todas as categorias</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as "" | StockStatus)} className={toolbarInput} aria-label="Filtrar por situação">
          <option value="">Todas as situações</option>
          <option value="ok">Em estoque</option>
          <option value="low">Estoque baixo</option>
          <option value="out">Em falta</option>
        </select>
        {canEdit && (
          <button type="button" onClick={startNew} disabled={editing} className="inline-flex items-center gap-1.5 rounded-lg bg-brand-900 px-3 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-50">
            <PlusIcon className="h-4 w-4" /> Novo produto
          </button>
        )}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-brand-900 text-xs uppercase tracking-wide text-white">
            <tr>
              <th className="px-3 py-2.5 font-medium">Produto</th>
              <th className="hidden px-3 py-2.5 font-medium md:table-cell">Categoria</th>
              <th className="px-3 py-2.5 text-right font-medium">Quantidade</th>
              <th className="px-3 py-2.5 text-right font-medium">Valor unit.</th>
              <th className="hidden px-3 py-2.5 text-right font-medium sm:table-cell">Valor total</th>
              <th className="hidden px-3 py-2.5 text-right font-medium lg:table-cell">Mínimo</th>
              <th className="hidden px-3 py-2.5 font-medium lg:table-cell">Situação</th>
              <th className="w-24 px-3 py-2.5 font-medium">
                <span className="sr-only">Ações</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {editingId === "new" && EditRow()}

            {rows.map((p) =>
              editingId === p.id ? (
                <Fragment key={p.id}>{EditRow()}</Fragment>
              ) : (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-3 py-3 font-medium">
                    {p.name}
                    <span className="block text-xs font-normal text-slate-500 md:hidden">{p.category}</span>
                  </td>
                  <td className="hidden px-3 py-3 text-slate-600 md:table-cell">{p.category}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums">
                    {qty(p.currentStock)} <span className="text-slate-400">{p.unit}</span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums">{brl(p.costPrice)}</td>
                  <td className="hidden whitespace-nowrap px-3 py-3 text-right font-medium tabular-nums sm:table-cell">
                    {brl(p.currentStock * p.costPrice)}
                  </td>
                  <td className="hidden px-3 py-3 text-right tabular-nums text-slate-500 lg:table-cell">{p.minStock ? qty(p.minStock) : "—"}</td>
                  <td className="hidden px-3 py-3 lg:table-cell">
                    <StatusBadge status={stockStatus(p)} />
                  </td>
                  <td className="px-3 py-3">
                    {canEdit && (
                      <div className="flex items-center gap-1">
                        <button type="button" onClick={() => startEdit(p)} disabled={pending || editing} title="Editar" className="rounded p-1.5 text-slate-500 hover:bg-brand-50 hover:text-brand-900 disabled:opacity-40">
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button type="button" onClick={() => remove(p)} disabled={pending || editing} title="Excluir" className="rounded p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-40">
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ),
            )}

            {rows.length === 0 && editingId !== "new" && (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                  {products.length === 0
                    ? 'Nenhum produto cadastrado. Clique em "Novo produto" para começar.'
                    : "Nenhum produto encontrado."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-slate-500">
        {rows.length} de {products.length} produtos · valor total da lista:{" "}
        <strong className="text-brand-900">{brl(totalValue)}</strong>
      </p>
    </div>
  );
}

function Card({ label, value, tone = "text-slate-900" }: { label: string; value: string; tone?: string }) {
  return (
    <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`mt-1 truncate text-xl font-semibold tabular-nums ${tone}`}>{value}</p>
    </div>
  );
}
