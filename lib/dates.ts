// Datas "de calendário" (início da obra, vencimento da nota...) são guardadas ao meio-dia UTC.
// Assim o dia não muda por causa de fuso horário, em nenhum lugar do sistema.

const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

const pad = (n: number) => String(n).padStart(2, "0");

/** Hoje em São Paulo, no formato AAAA-MM-DD. */
export function todayBR(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** Início de hoje (em UTC) para comparar com datas de calendário. */
export function todayStart(): Date {
  return new Date(`${todayBR()}T00:00:00Z`);
}

/** Converte o valor de um <input type="date"> (AAAA-MM-DD) em Date. Retorna null se inválido. */
export function parseDay(value: FormDataEntryValue | null | undefined): Date | null {
  const s = String(value ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T12:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

const dayFmt = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "UTC",
});

export function formatDay(d: Date | null | undefined): string {
  return d ? dayFmt.format(d) : "—";
}

export function monthKey(d: Date): string {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`;
}

/** Os últimos n meses (o atual por último): chave AAAA-MM e rótulo "out/26". */
export function lastMonths(n: number): { key: string; label: string }[] {
  const [y, m] = todayBR().split("-").map(Number);
  const out: { key: string; label: string }[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const idx = y * 12 + (m - 1) - i;
    const yy = Math.floor(idx / 12);
    const mm = idx % 12;
    out.push({ key: `${yy}-${pad(mm + 1)}`, label: `${MONTHS[mm]}/${String(yy).slice(2)}` });
  }
  return out;
}
