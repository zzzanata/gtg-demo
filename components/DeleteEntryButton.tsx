"use client";

import { useState, useTransition } from "react";
import { deleteEntry } from "@/app/financeiro/actions";

export default function DeleteEntryButton({ entryId }: { entryId: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function remove() {
    if (!confirm("Excluir este lançamento? Isso muda os totais do painel.")) return;
    setError("");
    startTransition(async () => {
      const result = await deleteEntry(entryId);
      if ("error" in result) setError(result.error);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={remove}
        disabled={pending}
        aria-label="Excluir lançamento"
        className="rounded-md px-1.5 text-lg leading-none text-slate-400 hover:bg-slate-100 hover:text-red-600 disabled:opacity-50"
      >
        ×
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </>
  );
}
