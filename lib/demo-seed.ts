// DADOS 100% FICTÍCIOS para a demonstração. Nomes, empresas, CNPJs e valores são inventados.
// As datas são relativas a hoje, então o painel sempre aparece "atualizado".
import bcrypt from "bcryptjs";
import { DEFAULT_CHECKLIST } from "@/lib/template";

export const DEMO_EMAIL = "admin@demo.com";
export const DEMO_PASSWORD = "demo123";

type Row = Record<string, unknown>;

let n = 0;
const id = (p: string) => `${p}_${(++n).toString(36)}`;

// Data de calendário (meio-dia UTC) deslocada em dias a partir de hoje.
function day(offset: number): Date {
  const d = new Date();
  d.setUTCHours(12, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + offset);
  return d;
}
// Dia 'dd' de um mês, 'back' meses atrás.
function monthDay(back: number, dd: number): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - back, dd, 12));
}

const COMPANY = { name: "Solaris Engenharia Demo Ltda", cnpj: "11.222.333/0001-81" };

export function buildSeed(): Record<string, Row[]> {
  const hash = bcrypt.hashSync(DEMO_PASSWORD, 8);
  const created = day(-90);

  const users: Row[] = [
    { id: "u_admin", name: "Administrador Demo", email: DEMO_EMAIL, passwordHash: hash, role: "ADMIN", createdAt: created },
    { id: "u_op", name: "Operador Demo", email: "operador@demo.com", passwordHash: hash, role: "OPERATOR", createdAt: created },
  ];

  // ---------- Obras ----------
  const projectDefs = [
    { name: "Usina Solar Alvorada", location: "Sorocaba, SP", kwp: 1200, start: -150, end: 35, done: 18, lead: "Ricardo Almeida",
      team: [["Thiago Barros", "Eletricista"], ["Mateus Freitas", "Instalador"], ["Caio Ribeiro", "Instalador"], ["Pedro Nogueira", "Auxiliar"]] },
    { name: "Fazenda Sol Nascente", location: "Uberaba, MG", kwp: 850, start: -95, end: 70, done: 12, lead: "Fernanda Lopes",
      team: [["Gabriel Santos", "Técnico"], ["Leandro Gomes", "Eletricista"], ["Otávio Prado", "Auxiliar"]] },
    { name: "Parque Solar Horizonte", location: "Londrina, PR", kwp: 2000, start: -200, end: -12, done: 20, lead: "Marcelo Tavares",
      team: [["Rodrigo Esteves", "Eletricista"], ["Henrique Duarte", "Instalador"], ["Samuel Cunha", "Instalador"], ["Bruno Teles", "Auxiliar"], ["Davi Moraes", "Técnico"]] },
    { name: "Usina Brisa do Cerrado", location: "Rio Verde, GO", kwp: 600, start: -40, end: 110, done: 5, lead: "Juliana Peixoto",
      team: [["Alan Rezende", "Eletricista"], ["Igor Mattos", "Auxiliar"]] },
    { name: "Condomínio Raio de Sol", location: "Campinas, SP", kwp: 320, start: -260, end: -120, done: 99, lead: "Patrícia Viana",
      team: [["Vitor Cardoso", "Eletricista"], ["Luan Siqueira", "Instalador"]] },
  ];

  const projects: Row[] = [];
  const tasks: Row[] = [];
  const team: Row[] = [];
  const total = DEFAULT_CHECKLIST.reduce((s, st) => s + st.tasks.length, 0);

  projectDefs.forEach((p, pi) => {
    const pid = `p_${pi + 1}`;
    const finished = p.done >= total;
    projects.push({
      id: pid, name: p.name, location: p.location, powerKwp: p.kwp,
      startDate: day(p.start), expectedEnd: day(p.end),
      status: finished ? "DONE" : "ACTIVE", createdAt: day(p.start),
    });
    let pos = 0;
    for (const st of DEFAULT_CHECKLIST) {
      for (const title of st.tasks) {
        const i = pos++;
        const status = i < p.done ? "DONE" : i === p.done && p.done < total ? "DOING" : "TODO";
        tasks.push({
          id: id("t"), projectId: pid, stage: st.stage, title, status, position: i,
          updatedAt: day(-Math.max(1, Math.round((total - i) / 3))),
          updatedById: status === "TODO" ? null : "u_admin",
        });
      }
    }
    team.push({ id: id("m"), projectId: pid, name: p.lead, role: "LEAD", jobTitle: "Líder de obra", createdAt: day(p.start) });
    for (const [name, jobTitle] of p.team) {
      team.push({ id: id("m"), projectId: pid, name, role: "MEMBER", jobTitle, createdAt: day(p.start) });
    }
  });

  // ---------- Funcionários ----------
  const employees: Row[] = [
    ["Ricardo Almeida", "Engenheiro eletricista", null, 9800],
    ["Fernanda Lopes", "Engenheira civil", null, 9200],
    ["Marcelo Tavares", "Líder de obra", null, 6400],
    ["Thiago Barros", "Eletricista", 220, null],
    ["Mateus Freitas", "Instalador", 180, null],
    ["Caio Ribeiro", "Instalador", 180, null],
    ["Juliana Peixoto", "Técnica em segurança", null, 5200],
    ["Pedro Nogueira", "Auxiliar de obra", 140, null],
    ["Patrícia Viana", "Analista administrativa", null, 4300],
  ].map(([fullName, jobTitle, dailyRate, monthlyRate]) => ({
    id: id("e"), fullName, jobTitle, dailyRate, monthlyRate, createdAt: created,
  }));

  // ---------- Produtos ----------
  const categories = ["Módulos fotovoltaicos", "Inversores", "Estruturas", "Cabos e proteções", "Ferramentas", "EPI"].map(
    (name, i) => ({ id: `cat_${i + 1}`, name }),
  );
  const cat = (name: string) => categories.find((c) => c.name === name)!.id;
  const products: Row[] = [
    ["Módulo 550W monocristalino", "Módulos fotovoltaicos", "un", 780, 980, 200, 640],
    ["Módulo 610W bifacial", "Módulos fotovoltaicos", "un", 910, 1150, 150, 120],
    ["Inversor string 75kW", "Inversores", "un", 24500, 29800, 4, 9],
    ["Inversor string 50kW", "Inversores", "un", 17200, 21000, 4, 3],
    ["Microinversor 2kW", "Inversores", "un", 1850, 2400, 20, 46],
    ["Perfil de alumínio 4,2m", "Estruturas", "un", 118, 165, 300, 820],
    ["Grampo intermediário", "Estruturas", "un", 4.8, 7.5, 1000, 4200],
    ["Cabo solar 6mm² (rolo 100m)", "Cabos e proteções", "rolo", 690, 890, 12, 31],
    ["String box CC 4 entradas", "Cabos e proteções", "un", 540, 720, 10, 6],
    ["Disjuntor 63A tripolar", "Cabos e proteções", "un", 96, 140, 20, 58],
    ["Conector MC4 (par)", "Cabos e proteções", "par", 9.5, 15, 400, 1300],
    ["Furadeira de impacto", "Ferramentas", "un", 520, 0, 3, 5],
    ["Alicate crimpador MC4", "Ferramentas", "un", 135, 0, 6, 4],
    ["Capacete de segurança", "EPI", "un", 28, 0, 20, 34],
    ["Cinto paraquedista", "EPI", "un", 210, 0, 10, 14],
  ].map(([name, c, unit, costPrice, salePrice, minStock, currentStock], i) => ({
    id: `pr_${i + 1}`, sku: `DEMO${String(i + 1).padStart(3, "0")}`, name, categoryId: cat(c as string),
    unit, costPrice, salePrice, minStock, currentStock, active: true, createdAt: created, updatedAt: created,
  }));

  // ---------- Financeiro ----------
  const financeCategories = [
    "Hotel", "Combustível", "Alimentação", "Funcionários", "Materiais",
    "Ferramentas", "Transporte", "Manutenção", "Medição de obra", "Outros",
  ].map((name, i) => ({ id: `fc_${i + 1}`, name, createdAt: created }));
  const fc = (name: string) => financeCategories.find((c) => c.name === name)!.id;

  const entries: Row[] = [];
  const today = day(-1);
  const add = (type: "REVENUE" | "COST", rawDate: Date, description: string, amount: number, category: string, projectId: string | null, qty = 1) => {
    const date = rawDate > today ? today : rawDate; // nada de lançamento no futuro
    entries.push({
      id: id("fe"), type, date, description, quantity: qty, unitValue: Math.round((amount / qty) * 100) / 100,
      amount, categoryId: fc(category), projectId, createdAt: date,
    });
  };
  for (let back = 5; back >= 0; back--) {
    const k = 5 - back;
    add("REVENUE", monthDay(back, 10), "Medição de obra do mês", [120000, 175000, 150000, 205000, 140000, 150000][k], "Medição de obra", `p_${(k % 3) + 1}`);
    add("COST", monthDay(back, 5), "Folha de pagamento da equipe", [58000, 61000, 60500, 64000, 63000, 66000][k], "Funcionários", `p_${(k % 5) + 1}`);
    add("COST", monthDay(back, 12), "Combustível das equipes", [4200, 4650, 4400, 5100, 4800, 5300][k], "Combustível", `p_${(k % 4) + 1}`, 6);
    add("COST", monthDay(back, 18), "Hospedagem da equipe em viagem", [7800, 6200, 8900, 7400, 9100, 8200][k], "Hotel", `p_${((k + 1) % 4) + 1}`, 14);
    add("COST", monthDay(back, 20), "Alimentação em campo", [3900, 4100, 3700, 4500, 4300, 4700][k], "Alimentação", `p_${((k + 2) % 5) + 1}`, 30);
    if (k % 2 === 0) add("COST", monthDay(back, 22), "Manutenção de veículos", [2800, 3400, 2600][k / 2], "Manutenção", `p_${((k + 3) % 5) + 1}`);
  }

  const invoices: Row[] = [];
  const nf = (o: {
    type: "IN" | "OUT"; number: string; description: string; amount: number; status: string;
    issued: number; due: number; paid?: number; party: [string, string]; city: string; projectId: string | null;
  }) => {
    const [pname, pcnpj] = o.party;
    invoices.push({
      id: id("nf"), type: o.type, number: o.number, description: o.description, amount: o.amount,
      status: o.status, issuedAt: day(o.issued), dueDate: day(o.due), paidAt: o.paid === undefined ? null : day(o.paid),
      accessKey: null, createdAt: day(o.issued),
      senderName: o.type === "IN" ? COMPANY.name : pname,
      senderCnpj: o.type === "IN" ? COMPANY.cnpj : pcnpj,
      recipientName: o.type === "IN" ? pname : COMPANY.name,
      recipientCnpj: o.type === "IN" ? pcnpj : COMPANY.cnpj,
      city: o.city, projectId: o.projectId,
    });
  };

  const clients = {
    alvorada: ["Agropecuária Vale Verde S.A.", "22.333.444/0001-55"],
    nascente: ["Cooperativa Sol Nascente", "33.444.555/0001-66"],
    horizonte: ["Grupo Horizonte Energia Ltda", "44.555.666/0001-77"],
    cerrado: ["Frigorífico Brisa do Cerrado", "55.666.777/0001-88"],
    raio: ["Condomínio Residencial Raio de Sol", "66.777.888/0001-99"],
  } as Record<string, [string, string]>;
  const sup = {
    mod: ["Distribuidora Fotovoltaica Brasil Ltda", "77.888.999/0001-10"],
    inv: ["Inversores & Cia Comércio", "88.999.000/0001-21"],
    est: ["Metalúrgica Perfil Sul", "99.000.111/0001-32"],
    cab: ["Cabos e Proteções Nacional", "10.111.222/0001-43"],
    log: ["TransLog Cargas Pesadas", "21.222.333/0001-54"],
    loc: ["Locadora de Equipamentos Torre", "32.333.444/0001-65"],
  } as Record<string, [string, string]>;

  // Entradas (notas emitidas pela empresa)
  nf({ type: "IN", number: "2101", description: "Medição 4 - Usina Solar Alvorada", amount: 148000, status: "PAID", issued: -72, due: -57, paid: -58, party: clients.alvorada, city: "Sorocaba - SP", projectId: "p_1" });
  nf({ type: "IN", number: "2102", description: "Medição 5 - Usina Solar Alvorada", amount: 152000, status: "PAID", issued: -32, due: -17, paid: -18, party: clients.alvorada, city: "Sorocaba - SP", projectId: "p_1" });
  nf({ type: "IN", number: "2103", description: "Medição 6 - Usina Solar Alvorada", amount: 139000, status: "PENDING", issued: -4, due: 11, party: clients.alvorada, city: "Sorocaba - SP", projectId: "p_1" });
  nf({ type: "IN", number: "2104", description: "Medição 2 - Fazenda Sol Nascente", amount: 96000, status: "PAID", issued: -100, due: -85, paid: -86, party: clients.nascente, city: "Uberaba - MG", projectId: "p_2" });
  nf({ type: "IN", number: "2105", description: "Medição 3 - Fazenda Sol Nascente", amount: 104000, status: "PENDING", issued: -18, due: -3, party: clients.nascente, city: "Uberaba - MG", projectId: "p_2" });
  nf({ type: "IN", number: "2106", description: "Medição 8 - Parque Solar Horizonte", amount: 210000, status: "PAID", issued: -50, due: -35, paid: -36, party: clients.horizonte, city: "Londrina - PR", projectId: "p_3" });
  nf({ type: "IN", number: "2107", description: "Medição 9 - Parque Solar Horizonte", amount: 198000, status: "PENDING", issued: -9, due: 6, party: clients.horizonte, city: "Londrina - PR", projectId: "p_3" });
  nf({ type: "IN", number: "2108", description: "Entrada - Usina Brisa do Cerrado", amount: 88000, status: "PAID", issued: -36, due: -21, paid: -22, party: clients.cerrado, city: "Rio Verde - GO", projectId: "p_4" });
  nf({ type: "IN", number: "2109", description: "Medição 1 - Usina Brisa do Cerrado", amount: 72000, status: "PENDING", issued: -2, due: 13, party: clients.cerrado, city: "Rio Verde - GO", projectId: "p_4" });
  nf({ type: "IN", number: "2110", description: "Parcela final - Condomínio Raio de Sol", amount: 64000, status: "PAID", issued: -135, due: -120, paid: -121, party: clients.raio, city: "Campinas - SP", projectId: "p_5" });

  // Saídas (notas de despesa)
  nf({ type: "OUT", number: "88201", description: "Módulos 550W - lote 1", amount: 186000, status: "PAID", issued: -108, due: -93, paid: -94, party: sup.mod, city: "Sorocaba - SP", projectId: "p_1" });
  nf({ type: "OUT", number: "88455", description: "Inversores string 75kW", amount: 122500, status: "PAID", issued: -85, due: -70, paid: -71, party: sup.inv, city: "Sorocaba - SP", projectId: "p_1" });
  nf({ type: "OUT", number: "5120", description: "Perfis e grampos de fixação", amount: 38400, status: "PAID", issued: -68, due: -53, paid: -54, party: sup.est, city: "Uberaba - MG", projectId: "p_2" });
  nf({ type: "OUT", number: "3301", description: "Cabos solares e string box", amount: 29700, status: "PAID", issued: -55, due: -40, paid: -41, party: sup.cab, city: "Uberaba - MG", projectId: "p_2" });
  nf({ type: "OUT", number: "88790", description: "Módulos 610W bifaciais", amount: 264000, status: "PAID", issued: -48, due: -33, paid: -34, party: sup.mod, city: "Londrina - PR", projectId: "p_3" });
  nf({ type: "OUT", number: "9022", description: "Frete de equipamentos", amount: 14800, status: "PAID", issued: -28, due: -13, paid: -14, party: sup.log, city: "Londrina - PR", projectId: "p_3" });
  nf({ type: "OUT", number: "88911", description: "Módulos 550W - lote 2", amount: 142000, status: "PENDING", issued: -12, due: 3, party: sup.mod, city: "Rio Verde - GO", projectId: "p_4" });
  nf({ type: "OUT", number: "4410", description: "Locação de guindaste", amount: 21500, status: "PENDING", issued: -20, due: -5, party: sup.loc, city: "Londrina - PR", projectId: "p_3" });
  nf({ type: "OUT", number: "3355", description: "Proteções e disjuntores", amount: 17200, status: "PENDING", issued: -6, due: 9, party: sup.cab, city: "Rio Verde - GO", projectId: "p_4" });
  nf({ type: "OUT", number: "5188", description: "Estruturas metálicas - lote 2", amount: 46500, status: "PENDING", issued: -1, due: 14, party: sup.est, city: "Sorocaba - SP", projectId: "p_1" });

  return {
    user: users, category: categories, product: products, stockMovement: [], supplier: [],
    project: projects, task: tasks, teamMember: team, employee: employees,
    financeCategory: financeCategories, financeEntry: entries, invoice: invoices,
  };
}
