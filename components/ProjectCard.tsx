import Link from "next/link";
import Badge from "@/components/Badge";
import ProgressRing from "@/components/ProgressRing";
import { projectStatusLabel, type ProjectSummary } from "@/lib/types";

export default function ProjectCard({ project: p }: { project: ProjectSummary }) {
  return (
    <Link
      href={`/obras/${p.id}`}
      className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md"
    >
      <ProgressRing percent={p.percent} className="h-20 w-20 shrink-0" />
      <div className="min-w-0 space-y-1">
        <p className="truncate font-medium">{p.name}</p>
        <p className="truncate text-xs text-slate-500">{p.location || "Local não informado"}</p>
        <p className="text-xs text-slate-500">
          {p.done} de {p.total} tarefas · {p.teamSize} na equipe
        </p>
        <div className="flex flex-wrap gap-1.5 pt-0.5">
          <Badge tone={p.status === "DONE" ? "emerald" : p.status === "ON_HOLD" ? "amber" : "brand"}>
            {projectStatusLabel[p.status]}
          </Badge>
          {p.late && <Badge tone="rose">Atrasada</Badge>}
        </div>
      </div>
    </Link>
  );
}
