import InvoicesView from "@/components/InvoicesView";
import { requireAdmin } from "@/lib/auth";
import { todayBR } from "@/lib/dates";
import { getInvoices, getProjectOptions } from "@/lib/data";
import { summarizeInvoices } from "@/lib/invoices";

export const dynamic = "force-dynamic";

export default async function InvoicesPage() {
  await requireAdmin();

  const [invoices, projects] = await Promise.all([getInvoices(), getProjectOptions()]);
  const today = todayBR();
  const summary = summarizeInvoices(invoices, today);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Notas fiscais</h1>
        <p className="text-sm text-slate-500">
          {invoices.length} {invoices.length === 1 ? "nota" : "notas"} · {summary.overdueCount} vencidas ·{" "}
          {summary.pendingCount} pendentes
        </p>
      </header>

      <InvoicesView invoices={invoices} projects={projects} today={today} />
    </div>
  );
}
