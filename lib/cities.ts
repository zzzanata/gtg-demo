// Cidades das notas fiscais: o texto é livre (o usuário digita), mas "Laranjal Paulista",
// "laranjal  paulista" e "LARANJAL PAULISTA" contam como a mesma cidade.

export const cityKey = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

export const cleanCity = (s: string) => s.replace(/\s+/g, " ").trim().slice(0, 60);

export const NO_CITY = "__none__";

export type CityTab = { key: string; label: string; count: number };

/** Cidades distintas, da mais usada para a menos usada (grafia mais comum de cada uma). */
export function listCities(items: { city: string }[]): CityTab[] {
  const map = new Map<string, { spellings: Map<string, number>; count: number }>();
  for (const i of items) {
    if (!i.city) continue;
    const k = cityKey(i.city);
    const e = map.get(k) ?? { spellings: new Map(), count: 0 };
    e.count++;
    e.spellings.set(i.city, (e.spellings.get(i.city) ?? 0) + 1);
    map.set(k, e);
  }
  return [...map.entries()]
    .map(([key, e]) => ({
      key,
      count: e.count,
      label: [...e.spellings.entries()].sort((a, b) => b[1] - a[1])[0][0],
    }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "pt-BR"));
}

/**
 * Chuta a cidade pelo texto da descrição: se a descrição contém a palavra principal de uma
 * cidade já cadastrada ("... LARANJAL - SP" -> "Laranjal Paulista"), devolve essa cidade.
 */
export function guessCity(description: string, cities: string[]): string {
  const text = ` ${cityKey(description).replace(/[^a-z0-9]+/g, " ")} `;
  let best = "";
  let bestLen = 0;
  for (const city of cities) {
    const base = cityKey(city).split(" - ")[0].replace(/[^a-z0-9 ]+/g, " ");
    const words = base.split(" ").filter((w) => w.length >= 4);
    if (words.length === 0) continue;
    const w = words[0];
    if (text.includes(` ${w} `) && w.length > bestLen) {
      best = city;
      bestLen = w.length;
    }
  }
  return best;
}

// ---------------------------------------------------------------------------
// Detecção automática da cidade pelo texto da descrição.
// As descrições do GTG terminam com o local da obra: "INFRAESTRUTURA LARANJAL - SP",
// "REEMBOLSO MATERIAIS LB - GO", "FORMIGUEIRO RINCÃO 100%", "FRETE DOS MATERIAIS RJ"...
// ---------------------------------------------------------------------------

const UFS = new Set(
  "AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO".split(" "),
);

/**
 * Locais conhecidos. A chave é o jeito que aparece escrito na descrição (sem acento, minúsculo,
 * incluindo siglas e erros de digitação) e o valor é o nome que vira a aba.
 * PARA ACRESCENTAR UM LOCAL NOVO: basta colocar uma linha aqui.
 */
export const KNOWN_PLACES: Record<string, string> = {
  garca: "Garça - SP",
  pirrasununga: "Pirassununga - SP",
  pirassununga: "Pirassununga - SP",
  "ribeirao bonito": "Ribeirão Bonito - SP",
  rb: "Ribeirão Bonito - SP",
  rincao: "Rincão - SP",
  conchal: "Conchal - SP",
  populina: "Populina - SP",
  guaranta: "Guarantã - SP",
  pirangi: "Pirangi - SP",
  ibate: "Ibaté - SP",
  "laranjal paulista": "Laranjal Paulista - SP",
  laranjal: "Laranjal Paulista - SP",
  lp: "Laranjal Paulista - SP",
  "leopoldo de bulhoes": "Leopoldo de Bulhões - GO",
  leopoldo: "Leopoldo de Bulhões - GO",
  lb: "Leopoldo de Bulhões - GO",
  llb: "Leopoldo de Bulhões - GO",
  mineiros: "Mineiros - GO",
  itu: "Itu - SP",
  bes: "BES - SP",
  rgn: "Reginópolis - SP",
  reginopolis: "Reginópolis - SP",
  "monte aprazivel": "Monte Aprazível - SP",
  "monte aplazivel": "Monte Aprazível - SP",
  campinas: "Campinas - SP",
  lins: "Lins - SP",
  sb3: "SB3 - RJ",
  sb6: "SB6 - RJ",
};

// Palavras que não são lugar (evitam que "FRETE MATERIAIS - SP" vire cidade "Materiais").
const NOT_PLACES = new Set(
  "materiais material frete cabo caixas caixa solo tampas tampa estrutura infraestrutura comunicacao reembolso transporte instalacao correcao divida negociacao gerenciamento visita tecnica roçagem rocagem apoio lancamento reforma passagem perimetral ufv concreto kanaflex galvanizado switch microtik cameras camras".split(" "),
);
const CONNECTORS = new Set(["de", "do", "da", "dos", "das"]);

const PLACE_ENTRIES = Object.entries(KNOWN_PLACES).map(([alias, label]) => ({
  tokens: alias.split(" "),
  label,
}));

const titleCase = (s: string) =>
  s
    .split(" ")
    .map((w, i) => {
      if (w.length <= 3 && !CONNECTORS.has(w.toLowerCase())) return w.toUpperCase();
      if (i > 0 && CONNECTORS.has(w.toLowerCase())) return w.toLowerCase();
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    })
    .join(" ");

/** Devolve a cidade/local citado no fim da descrição, ou "" se não houver nenhum. */
export function extractCity(description: string): string {
  // Tokens sem acento, sem "100%", sem números soltos ("1OO%" com letra O também).
  const raw = description.replace(/\b[0-9O]{1,3}\s*%/gi, " ").replace(/\s+/g, " ").trim();
  const tokens = cityKey(raw)
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((t) => t && !/^\d+$/.test(t));
  if (tokens.length === 0) return "";

  // 1) Local conhecido: vale o que aparece por último; empate, o nome mais longo.
  let best: { end: number; len: number; label: string } | null = null;
  for (const p of PLACE_ENTRIES) {
    const n = p.tokens.length;
    for (let i = 0; i + n <= tokens.length; i++) {
      if (p.tokens.every((t, j) => tokens[i + j] === t)) {
        const end = i + n;
        if (!best || end > best.end || (end === best.end && n > best.len)) best = { end, len: n, label: p.label };
      }
    }
  }
  if (best) return best.label;

  // 2) "<local> - UF" no fim: pega a última palavra antes da UF (ou "X de Y").
  const last = tokens[tokens.length - 1];
  const hasDashUf = /-\s*[A-Za-z]{2}\s*$/.test(raw) && UFS.has(last.toUpperCase());
  if (hasDashUf) {
    const uf = last.toUpperCase();
    let i = tokens.length - 2;
    if (i >= 0 && !NOT_PLACES.has(tokens[i])) {
      let start = i;
      if (start >= 2 && CONNECTORS.has(tokens[start - 1])) start -= 2;
      const site = raw
        .replace(/[^A-Za-zÀ-ÿ0-9 ]+/g, " ")
        .split(/\s+/)
        .filter((t) => t && !/^\d+$/.test(t))
        .slice(start, i + 1)
        .join(" ");
      return `${titleCase(site)} - ${uf}`;
    }
    return uf;
  }

  // 3) Só a UF no fim ("FRETE DOS MATERIAIS RJ").
  if (UFS.has(last.toUpperCase()) && tokens.length > 1) return last.toUpperCase();

  return "";
}

/** Detecta a cidade: dicionário/texto primeiro, depois as cidades que você já cadastrou. */
export function detectCity(description: string, existing: string[]): string {
  const found = extractCity(description);
  if (found) {
    const k = cityKey(found);
    return existing.find((c) => cityKey(c) === k) ?? found;
  }
  return guessCity(description, existing);
}
