import Link from "next/link";
import { notFound } from "next/navigation";
import StatusBadge from "@/components/StatusBadge";
import { getProductHistory } from "@/lib/data";
import { brl, stockStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

function Stat({ label, value, hint, tone = "text-brand-900" }: { label: string; value: string; hint?: string; tone?: string }) {
  return (
    <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`mt-1 truncate text-xl font-semibold tabular-nums ${tone}`}>{value}</p>
      {hint && <p className="mt-0.5 truncate text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const h = await getProductHistory(id);
  if (!h) notFound();
  const { product: p } = h;

  return (
    <div className="space-y-6">
      <Link href="/products" className="text-sm text-slate-500 hover:text-brand-900">
        ← Produtos
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{p.name}</h1>
          <p className="text-sm text-slate-500">
            <span className="font-mono">{p.sku}</span> · {p.category}
          </p>
        </div>
        <StatusBadge status={stockStatus(p)} />
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="Em estoque" value={`${p.currentStock} ${p.unit}`} />
        <Stat label="Custo médio" value={brl(p.costPrice)} hint="usado no valor em estoque" />
        <Stat label="Último preço pago" value={h.lastCost === null ? "—" : brl(h.lastCost)} />
        <Stat label="Menor preço pago" value={h.minCost === null ? "—" : brl(h.minCost)} tone="text-emerald-600" />
        <Stat label="Maior preço pago" value={h.maxCost === null ? "—" : brl(h.maxCost)} tone="text-red-600" />
      </div>

      {h.bySupplier.length > 0 && (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <h2 className="border-l-4 border-sun-400 bg-brand-900 px-4 py-2.5 text-sm font-semibold text-white">
            Preço por fornecedor
          </h2>
          <ul className="divide-y divide-slate-100">
            {h.bySupplier.map((s, i) => (
              <li key={s.supplier} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {s.supplier}
                    {i === 0 && h.bySupplier.length > 1 && (
                      <span className="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                        mais barato agora
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-slate-500">
                    {s.purchases} {s.purchases === 1 ? "compra" : "compras"} · menor preço {brl(s.minCost)}
                  </p>
                </div>
                <p className="shrink-0 font-semibold tabular-nums">{brl(s.lastCost)}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <h2 className="border-l-4 border-sun-400 bg-brand-900 px-4 py-2.5 text-sm font-semibold text-white">
          Histórico de compras
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Data</th>
                <th className="px-4 py-3 font-medium">Fornecedor</th>
                <th className="px-4 py-3 font-medium">Nota/pedido</th>
                <th className="px-4 py-3 text-right font-medium">Quantidade</th>
                <th className="px-4 py-3 text-right font-medium">Valor unit.</th>
                <th className="px-4 py-3 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {h.purchases.map((x) => (
                <tr key={x.id} className="hover:bg-slate-50">
                  <td className="whitespace-nowrap px-4 py-3 text-slate-500">{x.date}</td>
                  <td className="px-4 py-3">{x.supplier || "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{x.invoiceNumber || "—"}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {x.quantity} <span className="text-slate-400">{p.unit}</span>
                  </td>
                  <td className="px-4 py-3 text-right font-medium tabular-nums">{brl(x.unitCost)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-600">{brl(x.quantity * x.unitCost)}</td>
                </tr>
              ))}
              {h.purchases.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                    Nenhuma compra com valor registrada ainda. Lance uma entrada informando o valor pago.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
