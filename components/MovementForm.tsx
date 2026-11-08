"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { createMovement } from "@/app/actions";
import { weightedAverage } from "@/lib/stock";
import { brl, type MovementType, type Product, type SupplierOption } from "@/lib/types";

type ProductOption = Pick<Product, "id" | "sku" | "name" | "unit" | "currentStock" | "costPrice">;

const reasons: Record<MovementType, string[]> = {
  IN: ["Compra", "Devolução", "Produção"],
  OUT: ["Venda", "Uso interno", "Perda"],
  ADJUSTMENT: ["Inventário", "Correção"],
};

const typeOptions: { value: MovementType; label: string }[] = [
  { value: "IN", label: "Entrada" },
  { value: "OUT", label: "Saída" },
  { value: "ADJUSTMENT", label: "Ajuste" },
];

// Aceita "1.234,56", "80,5" ou "80.5".
function parseBR(v: string): number | null {
  let s = v.replace(/\s/g, "").replace(/^R\$/, "");
  if (s === "") return null;
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

const inputCls =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

const NEW_SUPPLIER = "__new__";

export default function MovementForm({
  products,
  suppliers,
}: {
  products: ProductOption[];
  suppliers: SupplierOption[];
}) {
  const [type, setType] = useState<MovementType>("IN");
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const [quantity, setQuantity] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [supplierChoice, setSupplierChoice] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  if (products.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
        Nenhum produto cadastrado ainda.{" "}
        <Link href="/products/new" className="font-medium text-slate-900 underline">
          Cadastre um produto
        </Link>{" "}
        antes de lançar movimentações.
      </div>
    );
  }

  const product = products.find((p) => p.id === productId);

  // Prévia do novo custo médio enquanto o usuário digita.
  const qtyNum = parseFloat(quantity.replace(",", "."));
  const costNum = parseBR(unitCost);
  const preview =
    type === "IN" && product && qtyNum > 0 && costNum !== null && costNum >= 0
      ? {
          total: qtyNum * costNum,
          avg: weightedAverage(product.currentStock, product.costPrice, qtyNum, costNum),
        }
      : null;

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    const qty = parseFloat(quantity.replace(",", "."));
    if (Number.isNaN(qty) || qty === 0) {
      setError("Informe uma quantidade válida.");
      return;
    }
    if (type !== "ADJUSTMENT" && qty < 0) {
      setError("Em entrada e saída a quantidade deve ser positiva.");
      return;
    }
    if (type === "OUT" && product && qty > product.currentStock) {
      setError(`Saldo insuficiente: há apenas ${product.currentStock} ${product.unit}.`);
      return;
    }

    if (type === "IN" && (parseBR(unitCost) === null || (parseBR(unitCost) ?? 0) < 0)) {
      setError("Informe o valor unitário pago (use 0 se foi doação).");
      return;
    }

    const data = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await createMovement(data);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <div className="grid grid-cols-3 gap-2 rounded-lg bg-slate-100 p-1">
        {typeOptions.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => setType(o.value)}
            className={`rounded-md px-3 py-2 text-sm font-medium transition ${
              type === o.value
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
      <input type="hidden" name="type" value={type} />

      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-slate-700">Produto</span>
        <select
          name="productId"
          value={productId}
          onChange={(e) => setProductId(e.target.value)}
          className={inputCls}
        >
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.sku} · {p.name}
            </option>
          ))}
        </select>
        {product && (
          <span className="block text-xs text-slate-400">
            Saldo atual: {product.currentStock} {product.unit} · custo médio {brl(product.costPrice)}
          </span>
        )}
      </label>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-slate-700">Quantidade</span>
          <input
            name="quantity"
            inputMode="decimal"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder={type === "ADJUSTMENT" ? "Ex.: -3 ou 5" : "Ex.: 10"}
            className={inputCls}
          />
          {type === "ADJUSTMENT" && (
            <span className="block text-xs text-slate-400">
              No ajuste, use número negativo para reduzir o saldo.
            </span>
          )}
        </label>

        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-slate-700">Motivo</span>
          <select name="reason" className={inputCls} key={type}>
            {reasons[type].map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </label>
      </div>

      {type === "IN" && (
        <fieldset className="space-y-5 rounded-lg border border-sun-200 bg-sun-50/60 p-4">
          <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-sun-700">
            Dados da compra
          </legend>

          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-slate-700">Valor unitário pago (R$)</span>
              <input
                name="unitCost"
                inputMode="decimal"
                value={unitCost}
                onChange={(e) => setUnitCost(e.target.value)}
                placeholder="Ex.: 80,00"
                className={inputCls}
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-slate-700">Nº da nota/pedido (opcional)</span>
              <input name="invoiceNumber" className={inputCls} />
            </label>
          </div>

          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-slate-700">Fornecedor</span>
            <select
              name="supplierId"
              value={supplierChoice}
              onChange={(e) => setSupplierChoice(e.target.value)}
              className={inputCls}
            >
              <option value="">Não informado</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
              <option value={NEW_SUPPLIER}>+ Novo fornecedor...</option>
            </select>
          </label>
          {supplierChoice === NEW_SUPPLIER && (
            <input
              name="newSupplier"
              placeholder="Nome do novo fornecedor"
              className={inputCls}
              autoFocus
            />
          )}

          {preview && product && (
            <p className="rounded-lg bg-white px-3 py-2 text-sm text-slate-600 ring-1 ring-slate-200">
              Total da compra: <strong className="text-brand-900">{brl(preview.total)}</strong>
              <br />
              Novo custo médio de {product.name}:{" "}
              <strong className="text-brand-900">{brl(preview.avg)}</strong>
            </p>
          )}
        </fieldset>
      )}

      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-slate-700">Observação (opcional)</span>
        <textarea name="note" rows={3} className={inputCls} />
      </label>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
        <Link
          href="/movements"
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50"
        >
          Cancelar
        </Link>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-brand-900 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-60"
        >
          {pending ? "Registrando..." : "Registrar"}
        </button>
      </div>
    </form>
  );
}
