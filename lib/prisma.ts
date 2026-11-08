/* eslint-disable @typescript-eslint/no-explicit-any */
// VERSÃO DEMO: no lugar do banco de dados, um "mini Prisma" que guarda tudo na memória do servidor.
// Ele imita só o que o sistema usa (findMany, create, update, delete, upsert...), então as telas e as
// ações funcionam como no sistema real. Os dados voltam ao início quando o servidor reinicia.
import { buildSeed } from "@/lib/demo-seed";

type Row = Record<string, any>;
type Store = Record<string, Row[]>;

const g = globalThis as unknown as { __gtgDemoDb?: Store };
const db: Store = (g.__gtgDemoDb ??= buildSeed() as Store);

// Relações usadas em include/select.
const REL: Record<string, Record<string, { model: string; fk?: string; many?: string }>> = {
  product: { category: { model: "category", fk: "categoryId" } },
  financeEntry: {
    project: { model: "project", fk: "projectId" },
    category: { model: "financeCategory", fk: "categoryId" },
  },
  invoice: { project: { model: "project", fk: "projectId" } },
  task: { updatedBy: { model: "user", fk: "updatedById" } },
  project: {
    tasks: { model: "task", many: "projectId" },
    team: { model: "teamMember", many: "projectId" },
  },
};

// Campos únicos (violação vira o erro P2002, como no Prisma).
const UNIQUE: Record<string, string[]> = {
  user: ["email"],
  category: ["name"],
  financeCategory: ["name"],
  product: ["sku"],
  invoice: ["accessKey"],
};

// Valores padrão ao criar.
const DEFAULTS: Record<string, () => Row> = {
  user: () => ({ role: "OPERATOR" }),
  product: () => ({ unit: "un", costPrice: 0, salePrice: 0, minStock: 0, currentStock: 0, active: true, categoryId: null }),
  project: () => ({ status: "ACTIVE", location: null, powerKwp: null, startDate: null, expectedEnd: null }),
  task: () => ({ status: "TODO", updatedById: null }),
  teamMember: () => ({ role: "MEMBER", jobTitle: null }),
  employee: () => ({ dailyRate: null, monthlyRate: null }),
  financeEntry: () => ({ projectId: null, categoryId: null, quantity: 1, unitValue: null }),
  invoice: () => ({
    projectId: null, number: null, status: "PENDING", dueDate: null, issuedAt: null, type: "OUT",
    accessKey: null, paidAt: null, senderName: null, senderCnpj: null, recipientName: null,
    recipientCnpj: null, city: null,
  }),
};

const uid = () => "c" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
const clone = <T,>(v: T): T => (v === undefined ? v : structuredClone(v));
const same = (a: any, b: any) =>
  a instanceof Date && b instanceof Date ? a.getTime() === b.getTime() : a === b;
const isOp = (v: any) => v && typeof v === "object" && !(v instanceof Date) && !Array.isArray(v);

function cmp(a: any, b: any): number {
  const av = a instanceof Date ? a.getTime() : a;
  const bv = b instanceof Date ? b.getTime() : b;
  return av < bv ? -1 : av > bv ? 1 : 0;
}

function match(row: Row, where?: Row): boolean {
  if (!where) return true;
  for (const [k, cond] of Object.entries(where)) {
    const v = row[k];
    if (isOp(cond)) {
      for (const [op, x] of Object.entries(cond as Row)) {
        if (op === "in") { if (!(x as any[]).some((i) => same(i, v))) return false; }
        else if (op === "not") { if (same(v, x)) return false; }
        else if (op === "equals") { if (!same(v, x)) return false; }
        else if (op === "gte") { if (v == null || cmp(v, x) < 0) return false; }
        else if (op === "gt") { if (v == null || cmp(v, x) <= 0) return false; }
        else if (op === "lte") { if (v == null || cmp(v, x) > 0) return false; }
        else if (op === "lt") { if (v == null || cmp(v, x) >= 0) return false; }
        else if (op === "startsWith") { if (!String(v ?? "").startsWith(String(x))) return false; }
        else if (op === "endsWith") { if (!String(v ?? "").endsWith(String(x))) return false; }
        else if (op === "contains") { if (!String(v ?? "").toLowerCase().includes(String(x).toLowerCase())) return false; }
      }
    } else if (!same(v, cond)) return false;
  }
  return true;
}

function sortRows(rows: Row[], orderBy?: any): Row[] {
  if (!orderBy) return rows;
  const list: Row[] = Array.isArray(orderBy) ? orderBy : [orderBy];
  return [...rows].sort((a, b) => {
    for (const o of list) {
      const [field, dirSpec] = Object.entries(o)[0] as [string, any];
      const dir = typeof dirSpec === "string" ? dirSpec : dirSpec.sort;
      const nullsLast = typeof dirSpec === "object" && dirSpec.nulls === "last";
      const av = a[field], bv = b[field];
      if (av == null || bv == null) {
        if (av == null && bv == null) continue;
        const r = av == null ? 1 : -1; // nulos por último
        return nullsLast || dir === "asc" ? r : -r;
      }
      const c = cmp(av, bv);
      if (c !== 0) return dir === "desc" ? -c : c;
    }
    return 0;
  });
}

function shape(model: string, row: Row, args?: Row): Row {
  const rels = REL[model] ?? {};
  const out: Row = {};
  const select = args?.select as Row | undefined;
  const include = args?.include as Row | undefined;

  const resolve = (name: string, sub?: any) => {
    const r = rels[name];
    const subArgs = sub && typeof sub === "object" ? sub : undefined;
    if (r.many) {
      let rows = db[r.model].filter((x) => x[r.many!] === row.id);
      rows = sortRows(rows, subArgs?.orderBy);
      return rows.map((x) => shape(r.model, x, subArgs));
    }
    const fk = row[r.fk!];
    const found = fk == null ? undefined : db[r.model].find((x) => x.id === fk);
    return found ? shape(r.model, found, subArgs) : null;
  };

  if (select) {
    for (const [k, v] of Object.entries(select)) {
      if (!v) continue;
      out[k] = rels[k] ? resolve(k, v) : clone(row[k]);
    }
    return out;
  }
  Object.assign(out, clone(row));
  if (include) for (const [k, v] of Object.entries(include)) if (v) out[k] = resolve(k, v);
  return out;
}

function checkUnique(model: string, data: Row, ignoreId?: string) {
  for (const f of UNIQUE[model] ?? []) {
    if (data[f] == null) continue;
    if (db[model].some((r) => r.id !== ignoreId && r[f] === data[f])) {
      throw Object.assign(new Error(`Unique constraint failed on ${model}.${f}`), { code: "P2002" });
    }
  }
}

function insert(model: string, data: Row): Row {
  const nested: Row = {};
  const plain: Row = {};
  for (const [k, v] of Object.entries(data)) {
    if (REL[model]?.[k]?.many) nested[k] = v;
    else if (v !== undefined) plain[k] = v;
  }
  const now = new Date();
  const row: Row = { id: uid(), createdAt: now, ...(DEFAULTS[model]?.() ?? {}), ...plain };
  if (model === "task" || model === "product") row.updatedAt = now;
  if (model === "financeEntry" && row.quantity == null) row.quantity = 1;
  checkUnique(model, row);
  db[model].push(row);
  for (const [k, v] of Object.entries(nested)) {
    const r = REL[model][k];
    const items = (v as Row)?.create;
    for (const it of Array.isArray(items) ? items : items ? [items] : []) {
      insert(r.model, { ...it, [r.many!]: row.id });
    }
  }
  return row;
}

function findOne(model: string, where: Row): Row | undefined {
  return db[model].find((r) => match(r, where));
}

function cascadeDelete(model: string, row: Row) {
  if (model === "project") {
    db.task = db.task.filter((t) => t.projectId !== row.id);
    db.teamMember = db.teamMember.filter((t) => t.projectId !== row.id);
    for (const e of db.financeEntry) if (e.projectId === row.id) e.projectId = null;
    for (const i of db.invoice) if (i.projectId === row.id) i.projectId = null;
  } else if (model === "financeCategory") {
    for (const e of db.financeEntry) if (e.categoryId === row.id) e.categoryId = null;
  } else if (model === "category") {
    for (const p of db.product) if (p.categoryId === row.id) p.categoryId = null;
  }
}

const notFound = (model: string) =>
  Object.assign(new Error(`${model}: registro não encontrado`), { code: "P2025" });

function delegate(model: string) {
  return {
    async findMany(args: Row = {}) {
      const rows = sortRows(db[model].filter((r) => match(r, args.where)), args.orderBy);
      return rows.map((r) => shape(model, r, args));
    },
    async findFirst(args: Row = {}) {
      const r = sortRows(db[model].filter((x) => match(x, args.where)), args.orderBy)[0];
      return r ? shape(model, r, args) : null;
    },
    async findUnique(args: Row) {
      const r = findOne(model, args.where);
      return r ? shape(model, r, args) : null;
    },
    async count(args: Row = {}) {
      return db[model].filter((r) => match(r, args.where)).length;
    },
    async create(args: Row) {
      return shape(model, insert(model, args.data), args);
    },
    async createMany(args: Row) {
      let count = 0;
      for (const d of args.data as Row[]) {
        try {
          insert(model, d);
          count++;
        } catch (e) {
          if (!(args.skipDuplicates && (e as any).code === "P2002")) throw e;
        }
      }
      return { count };
    },
    async update(args: Row) {
      const r = findOne(model, args.where);
      if (!r) throw notFound(model);
      const data: Row = {};
      for (const [k, v] of Object.entries(args.data as Row)) if (v !== undefined) data[k] = v;
      checkUnique(model, data, r.id);
      Object.assign(r, data);
      if ("updatedAt" in r) r.updatedAt = new Date();
      return shape(model, r, args);
    },
    async updateMany(args: Row) {
      const rows = db[model].filter((r) => match(r, args.where));
      for (const r of rows) {
        Object.assign(r, args.data);
        if ("updatedAt" in r) r.updatedAt = new Date();
      }
      return { count: rows.length };
    },
    async upsert(args: Row) {
      const r = findOne(model, args.where);
      if (r) return shape(model, Object.assign(r, args.update), args);
      return shape(model, insert(model, args.create), args);
    },
    async delete(args: Row) {
      const r = findOne(model, args.where);
      if (!r) throw notFound(model);
      const out = shape(model, r, args);
      cascadeDelete(model, r);
      db[model] = db[model].filter((x) => x !== r);
      return out;
    },
    async deleteMany(args: Row = {}) {
      const rows = db[model].filter((r) => match(r, args.where));
      for (const r of rows) cascadeDelete(model, r);
      db[model] = db[model].filter((r) => !rows.includes(r));
      return { count: rows.length };
    },
    async aggregate(args: Row = {}) {
      const rows = db[model].filter((r) => match(r, args.where));
      const out: Row = {};
      if (args._max) {
        out._max = {};
        for (const f of Object.keys(args._max)) {
          const vals = rows.map((r) => r[f]).filter((v) => v != null);
          out._max[f] = vals.length ? vals.reduce((a, b) => (cmp(a, b) >= 0 ? a : b)) : null;
        }
      }
      return out;
    },
  };
}

const models = [
  "user", "category", "product", "stockMovement", "supplier", "project", "task",
  "teamMember", "employee", "financeCategory", "financeEntry", "invoice",
];

const client: any = Object.fromEntries(models.map((m) => [m, delegate(m)]));

// Sem transação de verdade: executa direto (basta para a demonstração).
client.$transaction = async (arg: any) => (typeof arg === "function" ? arg(client) : Promise.all(arg));

const prisma: any = client;
export default prisma;
