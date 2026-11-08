import Link from "next/link";
import { notFound } from "next/navigation";
import Badge from "@/components/Badge";
import Checklist from "@/components/Checklist";
import ProgressRing from "@/components/ProgressRing";
import ProjectAdminActions from "@/components/ProjectAdminActions";
import Team from "@/components/Team";
import { getCurrentUser } from "@/lib/auth";
import { getProject } from "@/lib/data";
import { projectStatusLabel } from "@/lib/types";

export const dynamic = "force-dynamic";

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="text-sm font-medium">{value}</dd>
    </div>
  );
}

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [project, user] = await Promise.all([getProject(id), getCurrentUser()]);
  if (!project) notFound();

  const isAdmin = user?.role === "ADMIN";
  const pending = project.total - project.done - project.doing;

  return (
    <div className="space-y-6">
      <Link href="/obras" className="text-sm text-slate-500 hover:text-slate-900">
        ← Todas as obras
      </Link>

      <header className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:flex-row md:items-center">
        <ProgressRing percent={project.percent} className="h-28 w-28 shrink-0" />

        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">{project.name}</h1>
              <Badge
                tone={
                  project.status === "DONE" ? "emerald" : project.status === "ON_HOLD" ? "amber" : "brand"
                }
              >
                {projectStatusLabel[project.status]}
              </Badge>
              {project.late && <Badge tone="rose">Atrasada</Badge>}
            </div>
            <p className="text-sm text-slate-500">{project.location || "Local não informado"}</p>
          </div>

          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
            <Info
              label="Potência"
              value={
                project.powerKwp === null
                  ? "—"
                  : `${project.powerKwp.toLocaleString("pt-BR")} kWp`
              }
            />
            <Info label="Início" value={project.startDate} />
            <Info label="Previsão de término" value={project.expectedEnd} />
            <Info
              label="Tarefas"
              value={`${project.done} concluídas · ${project.doing} em andamento · ${pending} pendentes`}
            />
          </dl>
        </div>

        {isAdmin && <ProjectAdminActions projectId={project.id} status={project.status} />}
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Checklist
          </h2>
          <Checklist projectId={project.id} tasks={project.tasks} isAdmin={isAdmin} />
        </div>

        <div className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Equipe</h2>
          <Team projectId={project.id} team={project.team} isAdmin={isAdmin} />
        </div>
      </div>
    </div>
  );
}
