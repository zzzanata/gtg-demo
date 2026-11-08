// Lê o PDF (DANFE) de uma NF-e usando a camada de texto do PDF. Funciona com PDFs gerados
// pelo sistema emissor (não com foto/escaneado). É "melhor esforço": o XML é mais confiável.
import type { ParsedNota } from "@/lib/nfe";

export type TextItem = { str: string; x: number; y: number; w: number; page: number };

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();

/** Extrai os pedaços de texto com posição. Só no navegador (carrega o pdf.js sob demanda). */
export async function extractItems(data: ArrayBuffer): Promise<TextItem[]> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(data) }).promise;
  const items: TextItem[] = [];
  for (let p = 1; p <= Math.min(pdf.numPages, 3); p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    for (const it of content.items) {
      if (!("str" in it) || !it.str.trim()) continue;
      items.push({ str: it.str.trim(), x: it.transform[4], y: it.transform[5], w: it.width, page: p });
    }
  }
  return items;
}

// Valor logo abaixo de um rótulo (DANFE é uma grade: rótulo em cima, valor embaixo).
function below(items: TextItem[], label: TextItem, maxGap = 28): string {
  let best: TextItem | null = null;
  for (const it of items) {
    if (it.page !== label.page || it === label) continue;
    const gap = label.y - it.y;
    if (gap < 3 || gap > maxGap) continue;
    const overlap = Math.min(it.x + it.w, label.x + Math.max(label.w, 40)) - Math.max(it.x, label.x - 2);
    if (overlap <= 0) continue;
    if (!best || gap < label.y - best.y || (gap === label.y - best.y && it.x < best.x)) best = it;
  }
  return best?.str ?? "";
}

// Valor na mesma linha, à direita do rótulo (alguns PDFs usam "Rótulo   Valor" em vez de grade).
function beside(items: TextItem[], label: TextItem): string {
  let best: TextItem | null = null;
  for (const it of items) {
    if (it.page !== label.page || it === label) continue;
    if (Math.abs(it.y - label.y) > 3 || it.x <= label.x + label.w - 1) continue;
    if (!best || it.x < best.x) best = it;
  }
  return best?.str ?? "";
}

const findLabels = (items: TextItem[], text: string) =>
  items.filter((i) => norm(i.str).includes(norm(text)));

const dmyToIso = (v: string) => {
  const m = v.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : "";
};

const money = (v: string) => {
  const m = v.match(/\d{1,3}(?:\.\d{3})*,\d{2}|\d+,\d{2}/);
  return m ? m[0].replace(/\./g, "").replace(",", ".") : "";
};

export function parseDanfeItems(items: TextItem[]): ParsedNota {
  // Ordem de leitura: página, de cima para baixo, esquerda para direita.
  const sorted = [...items].sort((a, b) => a.page - b.page || b.y - a.y || a.x - b.x);
  const flat = sorted.map((i) => i.str).join(" ");

  // NFS-e (nota de serviço): chave de 50 dígitos e textos próprios.
  const flatN = norm(flat);
  if (/\d{50}/.test(flat.replace(/(\d)\s+(?=\d)/g, "$1")) || /DANFSE|NFS-?E\b|NOTA FISCAL DE SERVICO/.test(flatN)) {
    return parseDanfse(items, flat);
  }

  // Chave de acesso: 44 dígitos (aparece com espaços de 4 em 4).
  const keyMatch = flat.replace(/(\d)\s+(?=\d)/g, "$1").match(/\d{44}/);
  const accessKey = keyMatch?.[0] ?? "";
  if (!accessKey) throw new Error("Não achei a chave de acesso. Esse PDF parece ser escaneado ou não é um DANFE; use o XML.");

  // A chave carrega o CNPJ do emitente (posições 6–19) e o número da nota (25–33).
  const senderCnpj = accessKey.slice(6, 20);
  const number = String(Number(accessKey.slice(25, 34)));

  const dateLabel = findLabels(items, "DATA DA EMISSAO")[0] ?? findLabels(items, "DATA DE EMISSAO")[0];
  const issuedAt = dmyToIso((dateLabel && below(items, dateLabel)) || flat.match(/\d{2}\/\d{2}\/\d{4}/)?.[0] || "");

  const totalLabel = findLabels(items, "VALOR TOTAL DA NOTA")[0];
  const amount = money((totalLabel && below(items, totalLabel)) || "");

  const emitMatch = flat.match(/RECEBEMOS DE (.+?) OS PRODUTOS/i);
  const senderName = emitMatch?.[1]?.trim() ?? "";

  // Destinatário: primeiro "NOME / RAZÃO SOCIAL" e "CNPJ / CPF" depois do título do bloco.
  const destTitle = findLabels(items, "DESTINATARIO")[0];
  const afterDest = (label: string) => {
    const cands = findLabels(items, label).filter((l) => !destTitle || l.page > destTitle.page || l.y < destTitle.y + 1);
    return cands.sort((a, b) => a.page - b.page || b.y - a.y)[0];
  };
  const nameLabel = afterDest("NOME / RAZAO SOCIAL") ?? afterDest("NOME/RAZAO SOCIAL");
  const recipientName = nameLabel ? below(items, nameLabel) : "";
  const docLabel = afterDest("CNPJ / CPF") ?? afterDest("CNPJ/CPF");
  const recipientCnpj = (docLabel ? below(items, docLabel) : "").replace(/[^0-9A-Za-z]/g, "");

  // Vencimento: menor data entre o título "FATURA/DUPLICATA" e o "CÁLCULO DO IMPOSTO".
  const upper = norm(flat);
  const a = upper.search(/FATURA|DUPLICATA/);
  const b = upper.indexOf("CALCULO DO IMPOSTO");
  let dueDate = "";
  if (a >= 0) {
    const chunk = flat.slice(a, b > a ? b : a + 400);
    const dates = [...chunk.matchAll(/\d{2}\/\d{2}\/\d{4}/g)].map((m) => dmyToIso(m[0])).filter(Boolean).sort();
    dueDate = dates[0] ?? "";
  }

  const natLabel = findLabels(items, "NATUREZA DA OPERACAO")[0];
  const nat = natLabel ? below(items, natLabel) : "";

  return {
    kind: "NF-e",
    number,
    accessKey,
    description: nat ? `NF ${number} – ${nat}` : `Nota fiscal ${number}`,
    amount,
    issuedAt,
    dueDate,
    senderName,
    senderCnpj,
    recipientName,
    recipientCnpj,
  };
}

// ---- NFS-e (DANFSe, padrão nacional ou municipal) ----
// Chave nacional: 50 dígitos = município(7) + ambiente(1) + tipo(1) + CNPJ(14) + nº da nota(13) + AAMM(4) + ...
function parseDanfse(items: TextItem[], flat: string): ParsedNota {
  const digits = flat.replace(/(\d)\s+(?=\d)/g, "$1");
  const key50 = digits.match(/\d{50}/)?.[0] ?? "";

  const labelValue = (...labels: string[]) => {
    for (const l of labels) {
      for (const lab of findLabels(items, l)) {
        const inside = money(lab.str);
        const v = below(items, lab, 24) || beside(items, lab);
        const m = money(v) || inside;
        if (m) return m;
      }
    }
    return "";
  };
  const textValue = (...labels: string[]) => {
    for (const l of labels) {
      for (const lab of findLabels(items, l)) {
        const v = below(items, lab, 24) || beside(items, lab);
        if (v) return v;
      }
    }
    return "";
  };
  // Primeiro rótulo que aparece DEPOIS de um título de seção (ex.: "EMITENTE" -> CNPJ).
  const inSection = (title: string, label: string) => {
    const t = findLabels(items, title)[0];
    if (!t) return "";
    const cands = findLabels(items, label)
      .filter((l) => l.page > t.page || (l.page === t.page && l.y <= t.y + 2))
      .sort((a, b) => a.page - b.page || b.y - a.y || a.x - b.x);
    for (const c of cands) {
      const v = below(items, c, 24) || beside(items, c);
      if (v) return v;
    }
    return "";
  };

  const amount = labelValue(
    "VALOR LIQUIDO DA NFS", "VALOR LIQUIDO", "VALOR DO SERVICO", "VALOR TOTAL DA NFS",
    "VALOR TOTAL DO SERVICO", "VALOR DOS SERVICOS", "VALOR TOTAL",
  );

  const numberText = textValue("NUMERO DA NFS", "NUMERO DA NOTA", "NUMERO");
  const number = (numberText.match(/\d+/)?.[0] ?? "").replace(/^0+(?=\d)/, "") ||
    (key50 ? String(Number(key50.slice(23, 36))) : "");

  const issued = textValue("DATA E HORA DA EMISSAO", "DATA DE EMISSAO", "DATA DA EMISSAO", "EMISSAO") ||
    flat.match(/\d{2}\/\d{2}\/\d{4}/)?.[0] || "";

  const senderCnpj =
    inSection("EMITENTE", "CNPJ").replace(/[^0-9A-Za-z]/g, "") ||
    inSection("PRESTADOR", "CNPJ").replace(/[^0-9A-Za-z]/g, "") ||
    (key50 ? key50.slice(9, 23) : "");
  const senderName =
    inSection("EMITENTE", "NOME") || inSection("EMITENTE", "RAZAO SOCIAL") ||
    inSection("PRESTADOR", "RAZAO SOCIAL") || inSection("PRESTADOR", "NOME");
  const recipientName =
    inSection("TOMADOR", "NOME") || inSection("TOMADOR", "RAZAO SOCIAL");
  const recipientCnpj = (inSection("TOMADOR", "CNPJ") || inSection("TOMADOR", "CPF")).replace(/[^0-9A-Za-z]/g, "");

  const senderCity = inSection("EMITENTE", "MUNICIPIO") || inSection("EMITENTE", "CIDADE");
  const recipientCity = inSection("TOMADOR", "MUNICIPIO") || inSection("TOMADOR", "CIDADE");

  const desc = textValue("DESCRICAO DO SERVICO", "DISCRIMINACAO DO SERVICO", "DISCRIMINACAO");

  return {
    kind: "NFS-e",
    number,
    accessKey: key50,
    description: (desc || `NFS-e ${number}`).replace(/\s+/g, " ").slice(0, 140),
    amount,
    issuedAt: dmyToIso(issued),
    dueDate: "",
    senderCity,
    recipientCity,
    senderName,
    senderCnpj,
    recipientName,
    recipientCnpj,
  };
}

export async function parseNotaPdf(data: ArrayBuffer): Promise<ParsedNota> {
  const items = await extractItems(data);
  if (items.length === 0) throw new Error("Esse PDF não tem texto (parece imagem escaneada). Use o XML da nota.");
  return parseDanfeItems(items);
}
