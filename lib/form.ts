export const text = (v: FormDataEntryValue | null) => String(v ?? "").trim();

/** Aceita "1234.56", "1.234,56", "R$ 1.234,56". Retorna null se vazio ou inválido. */
export function parseNumber(v: FormDataEntryValue | null): number | null {
  let s = text(v).replace(/\s/g, "").replace(/^R\$/, "");
  if (s === "") return null;
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export const round2 = (n: number) => Math.round(n * 100) / 100;
