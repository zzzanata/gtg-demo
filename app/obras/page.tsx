import Link from "next/link";
import ProjectCard from "@/components/ProjectCard";
import { getCurrentUser } from "@/lib/auth";
import { getProjectSummaries } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const [projects, user] = await Promise.all([getProjectSummaries(), getCurrentUser()]);

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Obras</h1>
          <p className="text-sm text-slate-500">
            {projects.length} {projects.length === 1 ? "obra" : "obras"} cadastradas
          </p>
        </div>
        {user?.role === "ADMIN" && (
          <Link
            href="/obras/new"
            className="shrink-0 rounded-lg bg-brand-900 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800"
          >
            Nova obra
          </Link>
        )}
      </header>

      {projects.length === 0 ? (
        <p className="rounded-2xl border border-slate-200 bg-white px-4 py-12 text-center text-sm text-slate-400">
          Nenhuma obra cadastrada ainda.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {projects.map((p) => (
            <ProjectCard key={p.id} project={p} />
          ))}
        </div>
      )}
    </div>
  );
}
