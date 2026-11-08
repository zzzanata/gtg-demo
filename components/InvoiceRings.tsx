import ProgressRing from "@/components/ProgressRing";
import { brl, type InvoiceSummary } from "@/lib/types";

const nf = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });

// 113400 -> "R$ 113,4 mil" | 2400000 -> "R$ 2,4 mi"
function brlCompacto(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `R$ ${nf.format(v / 1_000_000)} mi`;
  if (abs >= 1_000) return `R$ ${nf.format(v / 1_000)} mil`;
  return `R$ ${nf.format(v)}`;
}

// Anéis de % paga (por valor): todas, saídas (a receber) e entradas (a pagar),
// com o mesmo visual dos anéis de progresso das obras.
export default function InvoiceRings({
  summary,
  compact = false,
}: {
  summary: InvoiceSummary;
  compact?: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {summary.groups.map((g) => (
          <div key={g.key} className="flex min-w-0 flex-col items-center text-center">
            <ProgressRing percent={g.percent} className={compact ? "h-20 w-20" : "h-24 w-24 sm:h-28 sm:w-28"} />
            <p className="mt-2 text-sm font-semibold text-brand-900">{g.label}</p>
            <p className="text-xs text-slate-500">
              {g.count === 0 ? "sem notas" : `${g.percent}% ${g.paidLabel}`}
            </p>
            {g.count > 0 && !compact && (
              <p className="hidden max-w-full truncate text-[11px] text-slate-400 sm:block">
                {brl(g.paid)} de {brl(g.total)}
              </p>
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <Amount compact={compact} label="Pago" value={summary.paidAmount} count={summary.paidCount} tone="text-emerald-600" />
        <Amount compact={compact} label="Pendente" value={summary.pendingAmount} count={summary.pendingCount} tone="text-sun-700" />
        <Amount compact={compact} label="Vencido" value={summary.overdueAmount} count={summary.overdueCount} tone="text-red-600" />
      </div>
    </div>
  );
}

function Amount({ label, value, count, tone, compact }: { label: string; value: number; count: number; tone: string; compact: boolean }) {
  return (
    <div className="min-w-0 rounded-lg bg-slate-50 p-2.5">
      <p className="text-[11px] uppercase tracking-wide text-slate-500">
        {label} ({count})
      </p>
      <p className={`font-semibold tabular-nums ${compact ? "whitespace-nowrap text-xs" : "truncate text-sm sm:text-base"} ${tone}`}>{compact ? (
          brlCompacto(value)
        ) : (
          <>
            <span className="sm:hidden">{brlCompacto(value)}</span>
            <span className="hidden sm:inline">{brl(value)}</span>
          </>
        )}
      </p>
    </div>
  );
}
