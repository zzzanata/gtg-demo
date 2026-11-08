// Leitura segura de campos de formulário (usado pelas Server Actions).

export const texto = (v: FormDataEntryValue | null): string => String(v ?? "").trim();

// Aceita "1234,56" ou "1234.56". Devolve null se vazio ou inválido.
export function numero(v: FormDataEntryValue | null): number | null {
  const s = texto(v).replace(",", ".");
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

// <input type="date"> envia "2026-10-26". Vira meia-noite UTC (formato das colunas DATE).
export function dia(v: FormDataEntryValue | null): Date | null {
  const s = texto(v);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}
