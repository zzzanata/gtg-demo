import ProjectForm from "@/components/ProjectForm";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function NewProjectPage() {
  await requireAdmin();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Nova obra</h1>
        <p className="text-sm text-slate-500">Cadastre a usina e comece o acompanhamento</p>
      </header>
      <ProjectForm />
    </div>
  );
}
