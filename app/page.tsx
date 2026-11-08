import Link from "next/link";
import Badge from "@/components/Badge";
import FinanceChart from "@/components/FinanceChart";
import InvoiceRings from "@/components/InvoiceRings";
import { ArrowsIcon, BoxIcon, FileIcon, SunIcon, TrendIcon } from "@/components/Icons";
import Panel from "@/components/Panel";
import ProjectsBoard from "@/components/ProjectsBoard";
import StatCard from "@/components/StatCard";
import { getCurrentUser } from "@/lib/auth";
import { getFinanceSeries, getInvoiceSummary, getProducts, getProjectSummaries } from "@/lib/data";
import {
  brl,
  stockStatus,
  type FinancePoint,
  invoiceTypeLabel,
  type InvoiceSummary,
  type ProjectSummary,
} from "@/lib/types";

// Lê do banco a cada acesso (não gera a página estática no build).
export const dynamic = "force-dynamic";

// 2026-10-28 -> 28/10/26
const shortDay = (d: string) => (d ? `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(2, 4)}` : "—");

const panelLink = "text-xs font-medium text-white/80 hover:text-white";

function ProjectsPanel({
  projects,
  wide,
  isAdmin,
  index,
}: {
  projects: ProjectSummary[];
  wide: boolean;
  isAdmin: boolean;
  index: number;
}) {
  return (
    <Panel
      index={index}
      title="Evolução das obras"
      action={
        <Link href="/obras" className={panelLink}>
          Ver todas
        </Link>
      }
    >
      {projects.length === 0 ? (
        <div className="py-8 text-center text-sm text-slate-500">
          <p>Nenhuma obra cadastrada ainda.</p>
          {isAdmin && (
            <Link
              href="/obras/new"
              className="mt-3 inline-block rounded-lg bg-brand-900 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800"
            >
              Cadastrar a primeira obra
            </Link>
          )}
        </div>
      ) : (
        <ProjectsBoard projects={projects} wide={wide} />
      )}
    </Panel>
  );
}

function FinancePanel({ data, index }: { data: FinancePoint[]; index: number }) {
  return (
    <Panel
      index={index}
      title="Faturamento e custos"
      action={
        <Link href="/financeiro" className={panelLink}>
          Movimentações
        </Link>
      }
    >
      <div className="space-y-4">
        <FinanceChart data={data} />
      </div>
    </Panel>
  );
}

function InvoicesPanel({ summary, index }: { summary: InvoiceSummary; index: number }) {
  return (
    <Panel
      index={index}
      title="Notas fiscais"
      action={
        <Link href="/notas-fiscais" className={panelLink}>
          Ver todas
        </Link>
      }
    >
      <div className="space-y-4">
        <InvoiceRings summary={summary} compact />

        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Próximos vencimentos
          </h3>
          {summary.next.length === 0 ? (
            <p className="rounded-lg bg-slate-50 px-4 py-6 text-center text-sm text-slate-400">
              Nenhuma nota em aberto.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100 rounded-lg border border-slate-100">
              {summary.next.slice(0, 3).map((n) => (
                <li key={n.id} className="flex items-center justify-between gap-3 px-3 py-2.5 transition hover:bg-brand-50/60">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{n.description}</p>
                    <p className="truncate text-xs text-slate-500">
                      {invoiceTypeLabel[n.type]}
                      {n.number ? ` · NF ${n.number}` : ""} · vence {shortDay(n.dueDate)}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-medium">{brl(n.amount)}</p>
                    {n.shown === "OVERDUE" && <Badge tone="rose">Vencido</Badge>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Panel>
  );
}

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const isAdmin = user?.role === "ADMIN";

  // Faturamento e notas fiscais só aparecem para administradores.
  const [projects, products, finance, invoices] = await Promise.all([
    getProjectSummaries(),
    getProducts(),
    isAdmin ? getFinanceSeries(12) : Promise.resolve(null),
    isAdmin ? getInvoiceSummary() : Promise.resolve(null),
  ]);

  const stockValue = products.reduce((s, p) => s + p.currentStock * p.costPrice, 0);
  const lowItems = products.filter((p) => stockStatus(p) === "low");
  const outItems = products.filter((p) => stockStatus(p) === "out");

  const last6 = finance ? finance.slice(-6) : [];
  const revenue = last6.reduce((t, d) => t + d.revenue, 0);
  const cost = last6.reduce((t, d) => t + d.cost, 0);
  const result = revenue - cost;
  const openAmount = invoices ? invoices.pendingAmount + invoices.overdueAmount : 0;
  const openCount = invoices ? invoices.pendingCount + invoices.overdueCount : 0;

  const grid4 = "grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 xl:grid-cols-4";
  const sectionTitle = "text-sm font-semibold uppercase tracking-wide text-slate-500";
  const icon = "h-4.5 w-4.5";

  return (
    <div data-gtg-own className="space-y-6">
      <header className="animate-gtg-rise">
        <h1 className="text-2xl font-semibold tracking-tight">Painel</h1>
        <p className="text-sm text-slate-500">Andamento das obras, financeiro e estoque</p>
      </header>

      {finance && invoices && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className={`${sectionTitle} truncate`}>Financeiro · 6 meses</h2>
            <Link href="/financeiro" className="shrink-0 whitespace-nowrap text-sm text-slate-500 hover:text-slate-900">
              Movimentações
            </Link>
          </div>
          <div className={grid4}>
            <StatCard index={0} label="Faturamento" value={revenue} kind="brl" tone="good" series={last6.map((d) => ({ label: d.label, value: d.revenue }))} icon={<TrendIcon className={icon} />} hint="entradas" />
            <StatCard index={1} label="Custos" value={cost} kind="brl" tone="bad" series={last6.map((d) => ({ label: d.label, value: d.cost }))} icon={<ArrowsIcon className={icon} />} hint="saídas" />
            <StatCard index={2} label="Resultado" value={result} kind="brl" tone={result >= 0 ? "good" : "bad"} series={last6.map((d) => ({ label: d.label, value: d.revenue - d.cost }))} icon={<TrendIcon className={icon} />} hint={result >= 0 ? "no azul" : "no vermelho"} />
            <StatCard index={3} label="Notas em aberto" value={openAmount} kind="brl" tone={invoices.overdueCount > 0 ? "warn" : "default"} icon={<FileIcon className={icon} />} hint={`${openCount} nota(s)${invoices.overdueCount ? ` · ${invoices.overdueCount} vencida(s)` : ""}`} />
          </div>
        </section>
      )}

      <div className="grid items-stretch gap-6 xl:grid-cols-3">
        <div className={finance && invoices ? "" : "xl:col-span-3"}>
          <ProjectsPanel index={0} projects={projects} wide={!(finance && invoices)} isAdmin={isAdmin} />
        </div>
        {finance && <FinancePanel index={1} data={finance} />}
        {invoices && <InvoicesPanel index={2} summary={invoices} />}
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className={sectionTitle}>Estoque</h2>
          <Link href="/products" className="text-sm text-slate-500 hover:text-slate-900">
            Ver produtos
          </Link>
        </div>
        <div className={grid4}>
          <StatCard index={0} label="Produtos ativos" value={products.length} icon={<BoxIcon className={icon} />} hint="cadastrados" />
          <StatCard index={1} label="Valor em estoque" value={stockValue} kind="brl" icon={<SunIcon className={icon} />} hint="valor unitário × quantidade" />
          <StatCard index={2} label="Estoque baixo" value={lowItems.length} tone="warn" icon={<ArrowsIcon className={icon} />} hint="abaixo do mínimo" />
          <StatCard index={3} label="Em falta" value={outItems.length} tone="danger" icon={<BoxIcon className={icon} />} hint="sem estoque" />
        </div>
      </section>
    </div>
  );
}
