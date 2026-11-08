import Link from "next/link";
import { getMovements } from "@/lib/data";
import { brl } from "@/lib/types";

export const dynamic = "force-dynamic";

const typeStyle = {
  IN: { label: "Entrada", cls: "bg-emerald-50 text-emerald-700 ring-emerald-600/20" },
  OUT: { label: "Saída", cls: "bg-red-50 text-red-700 ring-red-600/20" },
  ADJUSTMENT: { label: "Ajuste", cls: "bg-slate-100 text-slate-700 ring-slate-500/20" },
} as const;

export default async function MovementsPage() {
  const movements = await getMovements();

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Movimentações</h1>
          <p className="text-sm text-slate-500">Histórico de entradas, saídas e ajustes</p>
        </div>
        <Link
          href="/movements/new"
          className="rounded-lg bg-brand-900 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800"
        >
          Nova movimentação
        </Link>
      </header>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[960px] text-left text-sm">
          <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Data</th>
              <th className="px-4 py-3 font-medium">Produto</th>
              <th className="px-4 py-3 font-medium">Tipo</th>
              <th className="px-4 py-3 text-right font-medium">Quantidade</th>
              <th className="px-4 py-3 text-right font-medium">Valor unit.</th>
              <th className="px-4 py-3 text-right font-medium">Total</th>
              <th className="px-4 py-3 font-medium">Fornecedor</th>
              <th className="px-4 py-3 font-medium">Motivo</th>
              <th className="px-4 py-3 font-medium">Usuário</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {movements.map((m) => {
              const t = typeStyle[m.type];
              return (
                <tr key={m.id} className="hover:bg-slate-50">
                  <td className="whitespace-nowrap px-4 py-3 text-slate-500">{m.createdAt}</td>
                  <td className="px-4 py-3 font-medium">{m.productName}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${t.cls}`}
                    >
                      {t.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {m.type === "OUT" || m.quantity < 0 ? "-" : "+"}
                    {Math.abs(m.quantity)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-600">
                    {m.unitCost === null ? "—" : brl(m.unitCost)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-600">
                    {m.unitCost === null ? "—" : brl(Math.abs(m.quantity) * m.unitCost)}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {m.supplier || "—"}
                    {m.invoiceNumber && (
                      <span className="block text-xs text-slate-400">NF {m.invoiceNumber}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{m.reason}</td>
                  <td className="px-4 py-3 text-slate-600">{m.user}</td>
                </tr>
              );
            })}
            {movements.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-slate-400">
                  Nenhuma movimentação registrada ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
