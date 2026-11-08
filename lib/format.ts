// Formatação pura (sem dependência do Next), usada no servidor e no navegador.

const nf = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });

// 1.250 -> "1,3 mil" | 2.400.000 -> "2,4 mi"
export function compacto(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `${nf.format(v / 1_000_000)} mi`;
  if (abs >= 1_000) return `${nf.format(v / 1_000)} mil`;
  return nf.format(v);
}

export const brlCompacto = (v: number) => `R$ ${compacto(v)}`;

// Datas "só dia" (colunas DATE do banco) vêm como meia-noite UTC: formatar em UTC evita voltar um dia.
const dia = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "UTC",
});

export function formatarDia(d: Date | null | undefined): string | null {
  return d ? dia.format(d) : null;
}

export function plural(n: number, singular: string, pluralForm: string): string {
  return `${n} ${n === 1 ? singular : pluralForm}`;
}
