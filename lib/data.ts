// Consultas ao banco. Use apenas em Server Components e Server Actions.
import prisma from "@/lib/prisma";
import { summarizeInvoices } from "@/lib/invoices";
import { formatDay, lastMonths, monthKey, todayBR, todayStart } from "@/lib/dates";
import { NOTES_CATEGORY_ID } from "@/lib/types";
import type {
  AppUser,
  Category,
  Employee,
  CategoryOption,
  MovementRecord,
  FinancePoint,
  InvoiceRecord,
  InvoiceSummary,
  Product,
  ProjectDetail,
  ProjectOption,
  ProjectSummary,
} from "@/lib/types";

const dateTimeFmt = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Sao_Paulo",
});

const dayFmtSP = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "America/Sao_Paulo",
});

// ---------- Usuários ----------

export async function getUsers(): Promise<AppUser[]> {
  const rows = await prisma.user.findMany({ orderBy: { createdAt: "asc" } });
  return rows.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    createdAt: dayFmtSP.format(u.createdAt),
  }));
}

// ---------- Estoque ----------

export async function getProducts(): Promise<Product[]> {
  const rows = await prisma.product.findMany({
    where: { active: true },
    include: { category: true },
    orderBy: { name: "asc" },
  });

  // Decimal do Prisma não pode ir para Client Components: converte para number.
  return rows.map((p) => ({
    id: p.id,
    sku: p.sku,
    name: p.name,
    category: p.category?.name ?? "Sem categoria",
    categoryId: p.categoryId ?? "",
    unit: p.unit,
    costPrice: Number(p.costPrice),
    salePrice: Number(p.salePrice),
    minStock: Number(p.minStock),
    currentStock: Number(p.currentStock),
    active: p.active,
  }));
}

export async function getCategories(): Promise<Category[]> {
  const rows = await prisma.category.findMany({ orderBy: { name: "asc" } });
  return rows.map((c) => ({ id: c.id, name: c.name }));
}

// ---------- Obras ----------

function toProgress(tasks: { status: string }[]) {
  const total = tasks.length;
  const done = tasks.filter((t) => t.status === "DONE").length;
  const doing = tasks.filter((t) => t.status === "DOING").length;
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);
  return { total, done, doing, percent };
}

function isLate(expectedEnd: Date | null, status: string, percent: number) {
  if (!expectedEnd || status === "DONE" || percent >= 100) return false;
  return expectedEnd < todayStart();
}

export async function getProjectSummaries(): Promise<ProjectSummary[]> {
  const rows = await prisma.project.findMany({
    include: {
      tasks: { orderBy: { position: "asc" } },
      team: { orderBy: { createdAt: "asc" } },
    },
    orderBy: { createdAt: "asc" },
  });

  return rows.map((p) => {
    const progress = toProgress(p.tasks);
    const open = p.tasks.filter((t) => t.status !== "DONE");
    const next = [
      ...open.filter((t) => t.status === "DOING"),
      ...open.filter((t) => t.status === "TODO"),
    ]
      .slice(0, 2)
      .map((t) => t.title);

    return {
      id: p.id,
      name: p.name,
      location: p.location ?? "",
      status: p.status,
      ...progress,
      next,
      lead: p.team.find((m) => m.role === "LEAD")?.name ?? null,
      teamSize: p.team.length,
      late: isLate(p.expectedEnd, p.status, progress.percent),
      expectedEnd: formatDay(p.expectedEnd),
    };
  });
}

export async function getProjectOptions(): Promise<ProjectOption[]> {
  const rows = await prisma.project.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  return rows;
}

export async function getProject(id: string): Promise<ProjectDetail | null> {
  const p = await prisma.project.findUnique({
    where: { id },
    include: {
      tasks: {
        orderBy: { position: "asc" },
        include: { updatedBy: { select: { name: true } } },
      },
      team: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!p) return null;

  const progress = toProgress(p.tasks);

  return {
    id: p.id,
    name: p.name,
    location: p.location ?? "",
    powerKwp: p.powerKwp === null ? null : Number(p.powerKwp),
    startDate: formatDay(p.startDate),
    expectedEnd: formatDay(p.expectedEnd),
    status: p.status,
    late: isLate(p.expectedEnd, p.status, progress.percent),
    ...progress,
    tasks: p.tasks.map((t) => ({
      id: t.id,
      stage: t.stage,
      title: t.title,
      status: t.status,
      updatedBy: t.updatedBy?.name ?? null,
      updatedAt: dateTimeFmt.format(t.updatedAt),
    })),
    // Líder primeiro.
    team: [...p.team]
      .sort((a, b) => Number(b.role === "LEAD") - Number(a.role === "LEAD"))
      .map((m) => ({
        id: m.id,
        name: m.name,
        role: m.role,
        jobTitle: m.jobTitle ?? "",
      })),
  };
}

// ---------- Financeiro ----------

// Data que a nota conta no financeiro: emissão (ou vencimento / cadastro, se faltar).
const invoiceDate = (n: { issuedAt: Date | null; dueDate: Date | null; createdAt: Date }) =>
  n.issuedAt ?? n.dueDate ?? n.createdAt;

export async function getFinanceSeries(months = 6): Promise<FinancePoint[]> {
  const range = lastMonths(months);
  const since = new Date(`${range[0].key}-01T00:00:00Z`);

  const [rows, notes] = await Promise.all([
    prisma.financeEntry.findMany({
      where: { date: { gte: since } },
      select: { type: true, amount: true, date: true },
    }),
    // Notas fiscais entram no faturamento (Entrada) e nos custos (Saída); canceladas ficam de fora.
    prisma.invoice.findMany({
      where: { status: { not: "CANCELED" } },
      select: { type: true, amount: true, issuedAt: true, dueDate: true, createdAt: true },
    }),
  ]);

  const byMonth = new Map<string, FinancePoint>(
    range.map((m) => [m.key, { label: m.label, revenue: 0, cost: 0 }]),
  );

  for (const r of rows) {
    const point = byMonth.get(monthKey(r.date));
    if (!point) continue; // lançamento em mês futuro: fora do gráfico
    if (r.type === "REVENUE") point.revenue += Number(r.amount);
    else point.cost += Number(r.amount);
  }

  for (const n of notes) {
    const point = byMonth.get(monthKey(invoiceDate(n)));
    if (!point) continue;
    if (n.type === "IN") point.revenue += Number(n.amount);
    else point.cost += Number(n.amount);
  }

  return [...byMonth.values()];
}

const DEFAULT_FINANCE_CATEGORIES = [
  "Hotel", "Combustível", "Alimentação", "Funcionários", "Materiais",
  "Ferramentas", "Transporte", "Manutenção", "Medição de obra", "Outros",
];

export async function getFinanceCategories(): Promise<CategoryOption[]> {
  // Primeira vez: cria categorias comuns para você não começar do zero.
  if ((await prisma.financeCategory.count()) === 0) {
    await prisma.financeCategory.createMany({
      data: DEFAULT_FINANCE_CATEGORIES.map((name) => ({ name })),
      skipDuplicates: true,
    });
  }
  const rows = await prisma.financeCategory.findMany({ orderBy: { name: "asc" } });
  return rows.map((c) => ({ id: c.id, name: c.name }));
}

export async function getMovementRecords(): Promise<MovementRecord[]> {
  const [rows, notes] = await Promise.all([
    prisma.financeEntry.findMany({
      include: { project: { select: { name: true } }, category: { select: { name: true } } },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    }),
    prisma.invoice.findMany({
      where: { status: { not: "CANCELED" } },
      include: { project: { select: { name: true } } },
    }),
  ]);

  const manual: MovementRecord[] = rows.map((e) => {
    const amount = Number(e.amount);
    const quantity = Number(e.quantity) || 1;
    return {
      id: e.id,
      type: e.type,
      date: e.date.toISOString().slice(0, 10),
      categoryId: e.categoryId ?? "",
      categoryName: e.category?.name ?? "",
      description: e.description,
      quantity,
      // Lançamentos antigos não têm valor unitário: deduz do total.
      unitValue: e.unitValue === null ? amount / quantity : Number(e.unitValue),
      amount,
      projectId: e.projectId ?? "",
      projectName: e.project?.name ?? "",
      source: "MANUAL" as const,
      invoiceNumber: "",
      invoiceStatus: "",
    };
  });

  // Cada nota fiscal vira uma linha (Entrada = faturamento, Saída = custo), só para leitura.
  const fromNotes: MovementRecord[] = notes.map((n) => {
    const amount = Number(n.amount);
    const party = n.type === "IN" ? n.recipientName : n.senderName;
    return {
      id: `nf-${n.id}`,
      type: n.type === "IN" ? ("REVENUE" as const) : ("COST" as const),
      date: invoiceDate(n).toISOString().slice(0, 10),
      categoryId: NOTES_CATEGORY_ID,
      categoryName: "Notas fiscais",
      description: [n.number ? `NF ${n.number}` : "NF", n.description, party ? `(${party})` : ""]
        .filter(Boolean)
        .join(" · "),
      quantity: 1,
      unitValue: amount,
      amount,
      projectId: n.projectId ?? "",
      projectName: n.project?.name ?? "",
      source: "NOTA" as const,
      invoiceNumber: n.number ?? "",
      invoiceStatus: n.status,
    };
  });

  return [...manual, ...fromNotes].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

// ---------- Notas fiscais ----------

const isoDay = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "");

export async function getInvoices(): Promise<InvoiceRecord[]> {
  const rows = await prisma.invoice.findMany({
    include: { project: { select: { name: true } } },
    orderBy: [{ issuedAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
  });

  return rows.map((i) => ({
    id: i.id,
    type: i.type,
    number: i.number ?? "",
    accessKey: i.accessKey ?? "",
    description: i.description,
    amount: Number(i.amount),
    issuedAt: isoDay(i.issuedAt),
    dueDate: isoDay(i.dueDate),
    paidAt: isoDay(i.paidAt),
    status: i.status,
    senderName: i.senderName ?? "",
    senderCnpj: i.senderCnpj ?? "",
    recipientName: i.recipientName ?? "",
    recipientCnpj: i.recipientCnpj ?? "",
    city: i.city ?? "",
    projectId: i.projectId ?? "",
    projectName: i.project?.name ?? "",
  }));
}

export async function getInvoiceSummary(): Promise<InvoiceSummary> {
  return summarizeInvoices(await getInvoices(), todayBR());
}

// ---------- Funcionários ----------

export async function getEmployees(): Promise<Employee[]> {
  const rows = await prisma.employee.findMany({ orderBy: { fullName: "asc" } });
  return rows.map((e) => ({
    id: e.id,
    fullName: e.fullName,
    jobTitle: e.jobTitle,
    dailyRate: e.dailyRate === null ? null : Number(e.dailyRate),
    monthlyRate: e.monthlyRate === null ? null : Number(e.monthlyRate),
  }));
}
