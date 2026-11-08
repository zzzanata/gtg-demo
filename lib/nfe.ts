// Lê o XML de uma nota fiscal (NF-e / NFC-e padrão nacional; NFS-e no padrão ABRASF em
// "melhor esforço") e devolve os campos que o sistema usa. Roda no navegador (DOMParser).

export type ParsedNota = {
  number: string;
  accessKey: string;
  description: string;
  amount: string; // "1234.56"
  issuedAt: string; // yyyy-mm-dd
  dueDate: string; // yyyy-mm-dd ou ""
  senderName: string;
  senderCnpj: string; // só dígitos/letras
  recipientName: string;
  recipientCnpj: string;
  kind: "NF-e" | "NFS-e";
  /** Cidade do emitente / do destinatário, quando a nota traz o endereço ("Garça - SP"). */
  senderCity?: string;
  recipientCity?: string;
  /** Informações complementares da nota (às vezes citam a obra e a cidade). */
  hint?: string;
};

function find(root: Element | Document | null, ...path: string[]): Element | null {
  let cur: Element | Document | null = root;
  for (const tag of path) {
    if (!cur) return null;
    cur = cur.getElementsByTagName(tag)[0] ?? null;
  }
  return cur as Element | null;
}

const txt = (el: Element | null) => (el?.textContent ?? "").trim();
const day = (v: string) => (/^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10) : "");

function doc(el: Element | null) {
  return txt(find(el, "CNPJ")) || txt(find(el, "CPF")) || txt(find(el, "Cnpj")) || txt(find(el, "Cpf"));
}

function cityOf(party: Element | null) {
  const end = find(party, "enderEmit") ?? find(party, "enderDest") ?? find(party, "Endereco") ?? party;
  const name = txt(find(end, "xMun")) || txt(find(end, "Cidade")) || txt(find(end, "xCidade"));
  const uf = txt(find(end, "UF")) || txt(find(end, "Uf"));
  return name ? (uf ? `${name} - ${uf}` : name) : "";
}

function collapse(s: string, max: number) {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length > max ? t.slice(0, max - 1).trimEnd() + "…" : t;
}

export function parseNotaXml(xml: string): ParsedNota {
  const d = new DOMParser().parseFromString(xml, "application/xml");
  if (d.getElementsByTagName("parsererror").length) throw new Error("O arquivo não é um XML válido.");

  const inf = d.getElementsByTagName("infNFe")[0] ?? null;
  if (inf) return parseNfe(d, inf);

  const nfse = d.getElementsByTagName("InfNfse")[0] ?? d.getElementsByTagName("infNFSe")[0] ?? null;
  if (nfse) return parseNfse(nfse);

  throw new Error("Não reconheci esse XML como nota fiscal (esperava NF-e ou NFS-e).");
}

function parseNfe(d: Document, inf: Element): ParsedNota {
  const id = inf.getAttribute("Id") ?? "";
  const accessKey = (txt(find(d.documentElement, "chNFe")) || id.replace(/^NFe/i, "")).replace(/\D/g, "");

  const ide = find(inf, "ide");
  const issued = txt(find(ide, "dhEmi")) || txt(find(ide, "dEmi"));

  const amount = txt(find(inf, "total", "ICMSTot", "vNF")) || txt(find(inf, "vNF"));

  // Descrição: produtos (primeiros itens) ou, sem itens, a natureza da operação.
  const items = Array.from(inf.getElementsByTagName("det"))
    .map((det) => txt(find(det, "prod", "xProd")))
    .filter(Boolean);
  const natOp = txt(find(ide, "natOp"));
  let description = items.length ? items.slice(0, 3).join("; ") : natOp;
  if (items.length > 3) description += ` (+${items.length - 3})`;

  // Vencimento: a primeira parcela da cobrança (a mais próxima, se houver várias).
  const dues = Array.from(inf.getElementsByTagName("dVenc")).map((e) => day(txt(e))).filter(Boolean).sort();

  const emit = find(inf, "emit");
  const dest = find(inf, "dest");

  return {
    kind: "NF-e",
    number: txt(find(ide, "nNF")),
    accessKey,
    description: collapse(description, 140),
    amount,
    issuedAt: day(issued),
    dueDate: dues[0] ?? "",
    senderCity: cityOf(emit),
    recipientCity: cityOf(dest),
    hint: collapse(txt(find(inf, "infCpl")), 300),
    senderName: txt(find(emit, "xNome")),
    senderCnpj: doc(emit),
    recipientName: txt(find(dest, "xNome")),
    recipientCnpj: doc(dest),
  };
}

function parseNfse(inf: Element): ParsedNota {
  const prest = find(inf, "PrestadorServico") ?? find(inf, "Prestador") ?? find(inf, "emit");
  const tom = find(inf, "TomadorServico") ?? find(inf, "Tomador") ?? find(inf, "toma");
  const amount =
    txt(find(inf, "ValorLiquidoNfse")) || txt(find(inf, "ValorServicos")) || txt(find(inf, "vLiq")) || txt(find(inf, "vServ"));

  return {
    kind: "NFS-e",
    number: txt(find(inf, "Numero")) || txt(find(inf, "nNFSe")),
    accessKey: (txt(find(inf, "CodigoVerificacao")) || "").replace(/\W/g, "").length === 44
      ? txt(find(inf, "CodigoVerificacao")).replace(/\D/g, "")
      : "",
    description: collapse(txt(find(inf, "Discriminacao")) || txt(find(inf, "xDescServ")) || "Serviço", 140),
    amount,
    issuedAt: day(txt(find(inf, "DataEmissao")) || txt(find(inf, "dhEmi"))),
    dueDate: "",
    senderCity: cityOf(prest),
    recipientCity: cityOf(tom),
    senderName: txt(find(prest, "RazaoSocial")) || txt(find(prest, "xNome")),
    senderCnpj: doc(prest),
    recipientName: txt(find(tom, "RazaoSocial")) || txt(find(tom, "xNome")),
    recipientCnpj: doc(tom),
  };
}
