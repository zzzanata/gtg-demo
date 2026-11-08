// Regras de negócio puras de obras e finanças (sem banco, sem Next): fáceis de testar.
import type {
  MesFinanceiro,
  NotaItem,
  ObraStatus,
  Progresso,
  ProximaTarefa,
  ResumoNotas,
  TarefaStatus,
} from "./types";

// Checklist padrão de uma usina solar. Cada obra recebe uma cópia, que depois pode ser editada.
export const etapasPadrao: { nome: string; tarefas: string[] }[] = [
  {
    nome: "Projeto e homologação",
    tarefas: [
      "Levantamento técnico do terreno",
      "Projeto elétrico e layout dos módulos",
      "Aprovação do projeto na distribuidora",
      "Licenças ambientais e ART",
    ],
  },
  {
    nome: "Compras e logística",
    tarefas: [
      "Compra dos módulos fotovoltaicos",
      "Compra dos inversores",
      "Compra de estruturas e cabos",
      "Entrega do material no canteiro",
    ],
  },
  {
    nome: "Obra civil",
    tarefas: [
      "Mobilização do canteiro",
      "Terraplenagem e drenagem",
      "Cravação de estacas e fundações",
      "Cercamento e acessos",
    ],
  },
  {
    nome: "Estrutura e módulos",
    tarefas: [
      "Montagem das estruturas metálicas",
      "Instalação dos módulos",
      "Alinhamento e fixação final",
    ],
  },
  {
    nome: "Instalação elétrica",
    tarefas: [
      "Cabeamento CC e string boxes",
      "Instalação dos inversores",
      "Cabeamento CA e quadros",
      "Aterramento e proteções",
    ],
  },
  {
    nome: "Conexão à rede",
    tarefas: [
      "Cabine de medição",
      "Vistoria da distribuidora",
      "Troca do medidor e ligação",
    ],
  },
  {
    nome: "Comissionamento e entrega",
    tarefas: [
      "Testes e comissionamento",
      "Energização",
      "Treinamento e entrega ao cliente",
      "Documentação final (as-built)",
    ],
  },
];

export function calcularProgresso(tarefas: { status: TarefaStatus }[]): Progresso {
  const total = tarefas.length;
  const concluidas = tarefas.filter((t) => t.status === "CONCLUIDA").length;
  const andamento = tarefas.filter((t) => t.status === "EM_ANDAMENTO").length;
  const pendentes = total - concluidas - andamento;
  // floor: só mostra 100% quando tudo está concluído de verdade
  const percentual = total === 0 ? 0 : Math.floor((concluidas / total) * 100);
  return { total, concluidas, andamento, pendentes, percentual };
}

// O que fazer agora: a primeira tarefa em andamento; se não houver, a primeira pendente.
export function proximaTarefa(
  etapas: { nome: string; tarefas: { titulo: string; status: TarefaStatus }[] }[],
): ProximaTarefa | null {
  let primeiraPendente: ProximaTarefa | null = null;
  for (const etapa of etapas) {
    for (const t of etapa.tarefas) {
      if (t.status === "EM_ANDAMENTO") {
        return { etapa: etapa.nome, titulo: t.titulo, emAndamento: true };
      }
      if (t.status === "PENDENTE" && !primeiraPendente) {
        primeiraPendente = { etapa: etapa.nome, titulo: t.titulo, emAndamento: false };
      }
    }
  }
  return primeiraPendente;
}

const TRES_HORAS = 3 * 60 * 60 * 1000; // São Paulo = UTC-3

// Início de "hoje" em São Paulo, como meia-noite UTC (formato das colunas DATE).
function hojeSP(agora: Date): number {
  const d = new Date(agora.getTime() - TRES_HORAS);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

export function dataPassou(data: Date | null, agora: Date): boolean {
  if (!data) return false;
  return data.getTime() < hojeSP(agora);
}

export function obraAtrasada(
  status: ObraStatus,
  previsaoTermino: Date | null,
  agora: Date,
): boolean {
  return status !== "CONCLUIDA" && dataPassou(previsaoTermino, agora);
}

// ---------- Finanças por mês ----------

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

export function chaveMes(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

// Os últimos n meses (do mais antigo ao atual), contando o mês atual de São Paulo.
export function ultimosMeses(
  n: number,
  agora: Date,
): { chave: string; rotulo: string; titulo: string }[] {
  const base = new Date(agora.getTime() - TRES_HORAS);
  const ano = base.getUTCFullYear();
  const mes = base.getUTCMonth();
  const lista: { chave: string; rotulo: string; titulo: string }[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(ano, mes - i, 1));
    lista.push({
      chave: chaveMes(d),
      rotulo: MESES[d.getUTCMonth()],
      titulo: `${MESES[d.getUTCMonth()]}/${String(d.getUTCFullYear()).slice(2)}`,
    });
  }
  return lista;
}

export function agruparPorMes(
  meses: { chave: string; rotulo: string; titulo: string }[],
  faturamento: { data: Date; valor: number }[],
  custos: { data: Date; valor: number }[],
): MesFinanceiro[] {
  const mapa = new Map<string, MesFinanceiro>(
    meses.map((m) => [m.chave, { ...m, faturamento: 0, custos: 0 }]),
  );
  for (const f of faturamento) {
    const m = mapa.get(chaveMes(f.data));
    if (m) m.faturamento += f.valor;
  }
  for (const c of custos) {
    const m = mapa.get(chaveMes(c.data));
    if (m) m.custos += c.valor;
  }
  return meses.map((m) => mapa.get(m.chave)!);
}

export function resumirNotas(notas: NotaItem[]): ResumoNotas {
  const resumo: ResumoNotas = {
    emitidas: 0,
    aEmitir: 0,
    atrasadas: 0,
    valorAEmitir: 0,
    valorEmitido: 0,
  };
  for (const n of notas) {
    if (n.status === "EMITIDA") {
      resumo.emitidas++;
      resumo.valorEmitido += n.valor;
    } else {
      resumo.aEmitir++;
      resumo.valorAEmitir += n.valor;
      if (n.atrasada) resumo.atrasadas++;
    }
  }
  return resumo;
}
