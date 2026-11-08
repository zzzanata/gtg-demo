import type { StockStatus } from "@/lib/types";

const styles: Record<StockStatus, { label: string; cls: string }> = {
  ok: { label: "Em estoque", cls: "bg-emerald-50 text-emerald-700 ring-emerald-600/20" },
  low: { label: "Estoque baixo", cls: "bg-amber-50 text-amber-700 ring-amber-600/20" },
  out: { label: "Em falta", cls: "bg-red-50 text-red-700 ring-red-600/20" },
};

export default function StatusBadge({ status }: { status: StockStatus }) {
  const s = styles[status];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${s.cls}`}
    >
      {s.label}
    </span>
  );
}
