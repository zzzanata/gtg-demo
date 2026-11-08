"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { importInvoices, type InvoiceInput } from "@/app/notas-fiscais/actions";
import { CloseIcon, DownloadIcon } from "@/components/Icons";
import Badge from "@/components/Badge";
import { cleanCity, detectCity } from "@/lib/cities";
import { formatCnpj, normalizeAccessKey, normalizeCnpj } from "@/lib/invoices";
import { parseNotaXml, type ParsedNota } from "@/lib/nfe";
import { parseNotaPdf } from "@/lib/nfePdf";
import { brl } from "@/lib/types";

type Row = {
  file: string;
  nota?: ParsedNota;
  fromPdf?: boolean;
  city: string;
  error?: string;
  duplicate?: boolean;
  type: "IN" | "OUT";
  autoType: boolean; // tipo veio da detecção pelo CNPJ da empresa
};

const dmy = (d: string) => (d ? d.split("-").reverse().join("/") : "—");

export default function InvoiceImport({
  companyCnpj,
  existingKeys,
  cities,
  defaultCity,
  onClose,
}: {
  /** CNPJ da empresa, deduzido das notas já cadastradas ("" se ainda não dá para saber). */
  companyCnpj: string;
  existingKeys: string[];
  cities: string[];
  defaultCity: string;
  onClose: () => void;
}) {
  const [rows, setRows] = useState<Row[]>([]);
  const [myCnpj, setMyCnpj] = useState(companyCnpj);
  const [defaultType, setDefaultType] = useState<"IN" | "OUT">("OUT");
  const [result, setResult] = useState<string>("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const input = useRef<HTMLInputElement>(null);
  const keys = useMemo(() => new Set(existingKeys), [existingKeys]);

  function detect(n: ParsedNota, cnpj: string, fallback: "IN" | "OUT"): { type: "IN" | "OUT"; auto: boolean } {
    const mine = normalizeCnpj(cnpj);
    if (mine) {
      if (normalizeCnpj(n.senderCnpj) === mine) return { type: "IN", auto: true }; // emitida pela empresa
      if (normalizeCnpj(n.recipientCnpj) === mine) return { type: "OUT", auto: true }; // recebida
    }
    return { type: fallback, auto: false };
  }

  async function readFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError("");
    setResult("");
    const next: Row[] = [];
    for (const f of Array.from(files)) {
      const isPdf = /\.pdf$/i.test(f.name);
      if (!isPdf && !/\.xml$/i.test(f.name)) {
        next.push({ file: f.name, error: "Envie o arquivo da nota em XML ou PDF.", type: "OUT", autoType: false, city: "" });
        continue;
      }
      try {
        const nota = isPdf ? await parseNotaPdf(await f.arrayBuffer()) : parseNotaXml(await f.text());
        if (!nota.amount || Number(nota.amount) <= 0) throw new Error("Não consegui ler o valor da nota. Use o XML.");
        const { type, auto } = detect(nota, myCnpj, defaultType);
        const key = normalizeAccessKey(nota.accessKey);
        next.push({ file: f.name, nota, fromPdf: isPdf, city: detectCity(`${nota.description} ${nota.hint ?? ""}`, cities) || (type === "IN" ? nota.recipientCity : nota.senderCity) || defaultCity, type, autoType: auto, duplicate: key ? keys.has(key) : false });
      } catch (e) {
        next.push({ file: f.name, error: (e as Error).message, type: "OUT", autoType: false, city: "" });
      }
    }
    // A mesma nota enviada duas vezes na seleção também conta como repetida.
    const seen = new Set<string>();
    for (const r of next) {
      const k = r.nota ? normalizeAccessKey(r.nota.accessKey) : "";
      if (!k) continue;
      if (seen.has(k)) r.duplicate = true;
      seen.add(k);
    }
    setRows((prev) => [...prev, ...next]);
    if (input.current) input.current.value = "";
  }

  function redetect(cnpj: string, fallback: "IN" | "OUT") {
    setRows((rs) =>
      rs.map((r) => {
        if (!r.nota) return r;
        const d = detect(r.nota, cnpj, fallback);
        return { ...r, type: d.type, autoType: d.auto };
      }),
    );
  }

  const ready = rows.filter((r) => r.nota && !r.duplicate);

  function submit() {
    setError("");
    const payload: InvoiceInput[] = ready.map((r) => {
      const n = r.nota!;
      return {
        type: r.type,
        number: n.number,
        accessKey: n.accessKey,
        description: n.description || "Nota fiscal importada",
        amount: n.amount,
        issuedAt: n.issuedAt,
        dueDate: n.dueDate,
        status: "PENDING",
        paidAt: "",
        senderName: n.senderName,
        senderCnpj: n.senderCnpj,
        recipientName: n.recipientName,
        recipientCnpj: n.recipientCnpj,
        city: cleanCity(r.city),
        projectId: "",
      };
    });
    startTransition(async () => {
      const res = await importInvoices(payload);
      if ("error" in res) return setError(res.error);
      const parts = [`${res.created} nota(s) importada(s)`];
      if (res.skipped) parts.push(`${res.skipped} já existia(m)`);
      if (res.failed.length)
        parts.push(`${res.failed.length} com erro (${res.failed.map((f) => `nº ${f.number}: ${f.error}`).join("; ")})`);
      setResult(parts.join(" · "));
      setRows([]);
    });
  }

  const box =
    "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

  return (
    <>
      <header className="flex items-center justify-between gap-3 border-l-4 border-sun-400 bg-brand-900 px-5 py-4 text-white">
        <h2 className="text-lg font-semibold">Importar notas fiscais</h2>
        <button type="button" onClick={onClose} aria-label="Fechar" className="rounded-lg p-1.5 hover:bg-white/10">
          <CloseIcon />
        </button>
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto p-5">
        <div className="space-y-1.5 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
          <p>
            Envie o <strong>XML</strong> (mais preciso) ou o <strong>PDF</strong> (DANFE) da nota, um ou vários. O sistema lê número, chave de acesso,
            valor, emissão, vencimento, emitente e destinatário e cadastra tudo nas notas fiscais.
          </p>
          <p className="text-xs text-slate-500">
            Notas com a mesma chave de acesso que já estão no sistema são ignoradas. O status entra como Pendente.
          </p>
        </div>

        <label className="block space-y-1">
          <span className="text-xs font-medium text-slate-600">CNPJ da sua empresa (para saber se a nota é entrada ou saída)</span>
          <input
            value={formatCnpj(myCnpj)}
            onChange={(e) => {
              const v = normalizeCnpj(e.target.value);
              setMyCnpj(v);
              redetect(v, defaultType);
            }}
            placeholder="00.000.000/0000-00"
            className={box}
          />
          <span className="text-[11px] text-slate-400">
            Emitida por você = Entrada (a receber). Recebida = Saída (a pagar).
          </span>
        </label>

        <label className="block space-y-1">
          <span className="text-xs font-medium text-slate-600">Quando não der para identificar, tratar como</span>
          <select
            value={defaultType}
            onChange={(e) => {
              const v = e.target.value as "IN" | "OUT";
              setDefaultType(v);
              redetect(myCnpj, v);
            }}
            className={box}
          >
            <option value="OUT">Saída (despesa, a pagar)</option>
            <option value="IN">Entrada (emitida por nós, a receber)</option>
          </select>
        </label>

        <input
          ref={input}
          type="file"
          accept=".xml,.pdf,text/xml,application/xml,application/pdf"
          multiple
          className="hidden"
          onChange={(e) => readFiles(e.target.files)}
        />
        <button
          type="button"
          onClick={() => input.current?.click()}
          className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-brand-300 px-4 py-6 text-sm font-medium text-brand-900 hover:bg-brand-50"
        >
          <DownloadIcon className="h-5 w-5 rotate-180" /> Escolher arquivos XML ou PDF
        </button>

        {result && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{result}</p>}

        {rows.length > 0 && (
          <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
            {rows.map((r, i) => (
              <li key={i} className="space-y-1 px-3 py-2.5 text-sm">
                {r.nota ? (
                  <>
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate font-medium">
                        {r.nota.kind} nº {r.nota.number || "—"} · {(r.type === "IN" ? r.nota.recipientName : r.nota.senderName) || r.nota.senderName}
                      </p>
                      <p className="shrink-0 font-semibold tabular-nums">{r.nota.amount ? brl(Number(r.nota.amount)) : "—"}</p>
                    </div>
                    <p className="truncate text-xs text-slate-500">
                      {r.nota.senderName || "?"} → {r.nota.recipientName || "?"} · emissão {dmy(r.nota.issuedAt)} · venc. {dmy(r.nota.dueDate)}
                    </p>
                    <div className="flex items-center gap-2">
                      {r.duplicate ? (
                        <Badge tone="amber">Já cadastrada (será ignorada)</Badge>
                      ) : (
                        <select
                          value={r.type}
                          onChange={(e) =>
                            setRows((rs) =>
                              rs.map((x, j) => (j === i ? { ...x, type: e.target.value as "IN" | "OUT", autoType: false } : x)),
                            )
                          }
                          className="rounded-md border border-slate-200 px-2 py-1 text-xs"
                          aria-label="Tipo"
                        >
                          <option value="IN">Entrada</option>
                          <option value="OUT">Saída</option>
                        </select>
                      )}
                      <input
                        value={r.city}
                        onChange={(e) => setRows((rs) => rs.map((x, j) => (j === i ? { ...x, city: e.target.value } : x)))}
                        list="cidades-import"
                        placeholder="Cidade"
                        aria-label="Cidade"
                        className="w-36 rounded-md border border-slate-200 px-2 py-1 text-xs"
                      />
                      {r.fromPdf && <span className="text-[11px] text-amber-600">lido do PDF, confira os dados</span>}
                      {!r.duplicate && r.autoType && <span className="text-[11px] text-slate-400">detectado pelo CNPJ</span>}
                      <button type="button" onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))} className="ml-auto text-xs text-slate-400 hover:text-red-600">
                        remover
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{r.file}</p>
                      <p className="text-xs text-red-600">{r.error}</p>
                    </div>
                    <button type="button" onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))} className="shrink-0 text-xs text-slate-400 hover:text-red-600">
                      remover
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <datalist id="cidades-import">
        {cities.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>

      <footer className="space-y-2 border-t border-slate-200 p-4">
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Fechar
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={pending || ready.length === 0}
            className="rounded-lg bg-brand-900 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-50"
          >
            {pending ? "Importando..." : `Importar ${ready.length} nota(s)`}
          </button>
        </div>
      </footer>
    </>
  );
}
