"use client";

import { useState, useTransition } from "react";
import { deleteProject, setProjectStatus } from "@/app/obras/actions";
import { projectStatusLabel, type ProjectStatus } from "@/lib/types";

export default function ProjectAdminActions({
  projectId,
  status,
}: {
  projectId: string;
  status: ProjectStatus;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function changeStatus(next: ProjectStatus) {
    setError("");
    startTransition(async () => {
      const result = await setProjectStatus(projectId, next);
      if ("error" in result) setError(result.error);
    });
  }

  function remove() {
    if (
      !confirm(
        "Excluir esta obra? O checklist e a equipe serão apagados. Lançamentos e notas fiscais ficam, sem vínculo com a obra.",
      )
    )
      return;
    setError("");
    startTransition(async () => {
      const result = await deleteProject(projectId);
      if (result && "error" in result) setError(result.error);
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={status}
        disabled={pending}
        onChange={(e) => changeStatus(e.target.value as ProjectStatus)}
        aria-label="Status da obra"
        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
      >
        {(Object.keys(projectStatusLabel) as ProjectStatus[]).map((s) => (
          <option key={s} value={s}>
            {projectStatusLabel[s]}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={remove}
        disabled={pending}
        className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
      >
        Excluir obra
      </button>
      {error && <p className="basis-full text-sm text-red-600">{error}</p>}
    </div>
  );
}
