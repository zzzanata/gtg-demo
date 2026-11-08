"use client";

import { useRef, useState, useTransition } from "react";
import { addTask, deleteTask, updateTaskStatus } from "@/app/obras/actions";
import { taskStatusLabel, type TaskItem, type TaskStatus } from "@/lib/types";

const statusCls: Record<TaskStatus, string> = {
  TODO: "border-slate-200 bg-white text-slate-600",
  DOING: "border-brand-200 bg-brand-50 text-brand-900",
  DONE: "border-emerald-200 bg-emerald-50 text-emerald-700",
};

const inputCls =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

function TaskRow({ task, isAdmin }: { task: TaskItem; isAdmin: boolean }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function change(status: TaskStatus) {
    setError("");
    startTransition(async () => {
      const result = await updateTaskStatus(task.id, status);
      if ("error" in result) setError(result.error);
    });
  }

  function remove() {
    if (!confirm("Remover esta tarefa do checklist?")) return;
    setError("");
    startTransition(async () => {
      const result = await deleteTask(task.id);
      if ("error" in result) setError(result.error);
    });
  }

  return (
    <li
      className={`flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2.5 ${pending ? "opacity-60" : ""}`}
    >
      <span
        className={`min-w-0 flex-1 text-sm ${
          task.status === "DONE" ? "text-slate-400 line-through" : "text-slate-800"
        }`}
      >
        {task.title}
      </span>

      <select
        value={task.status}
        disabled={pending}
        onChange={(e) => change(e.target.value as TaskStatus)}
        aria-label={`Status de ${task.title}`}
        className={`rounded-md border px-2 py-1 text-xs font-medium ${statusCls[task.status]}`}
      >
        {(Object.keys(taskStatusLabel) as TaskStatus[]).map((s) => (
          <option key={s} value={s}>
            {taskStatusLabel[s]}
          </option>
        ))}
      </select>

      {isAdmin && (
        <button
          type="button"
          onClick={remove}
          disabled={pending}
          aria-label={`Remover ${task.title}`}
          className="rounded-md px-1.5 text-lg leading-none text-slate-400 hover:bg-slate-100 hover:text-red-600"
        >
          ×
        </button>
      )}

      {task.updatedBy && (
        <span className="basis-full text-[11px] text-slate-400">
          Atualizado por {task.updatedBy} em {task.updatedAt}
        </span>
      )}
      {error && <span className="basis-full text-xs text-red-600">{error}</span>}
    </li>
  );
}

function AddTaskForm({ projectId, stages }: { projectId: string; stages: string[] }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const data = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await addTask(data);
      if ("error" in result) setError(result.error);
      else formRef.current?.reset();
    });
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className="space-y-3 border-t border-slate-100 p-4">
      <p className="text-sm font-medium text-slate-700">Adicionar tarefa</p>
      <input type="hidden" name="projectId" value={projectId} />
      <div className="grid gap-3 sm:grid-cols-[1fr_1.5fr_auto]">
        <input
          name="stage"
          list="stage-options"
          required
          placeholder="Etapa (escolha ou digite uma nova)"
          className={inputCls}
        />
        <datalist id="stage-options">
          {stages.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
        <input name="title" required placeholder="Nome da tarefa" className={inputCls} />
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-brand-900 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-60"
        >
          {pending ? "Adicionando..." : "Adicionar"}
        </button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </form>
  );
}

export default function Checklist({
  projectId,
  tasks,
  isAdmin,
}: {
  projectId: string;
  tasks: TaskItem[];
  isAdmin: boolean;
}) {
  // Agrupa por etapa, na ordem em que aparecem.
  const stages: { name: string; tasks: TaskItem[] }[] = [];
  for (const t of tasks) {
    let stage = stages.find((s) => s.name === t.stage);
    if (!stage) {
      stage = { name: t.stage, tasks: [] };
      stages.push(stage);
    }
    stage.tasks.push(t);
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {stages.length === 0 && (
        <p className="px-4 py-10 text-center text-sm text-slate-400">
          Esta obra ainda não tem tarefas.
          {isAdmin ? " Adicione a primeira abaixo." : ""}
        </p>
      )}

      {stages.map((stage) => {
        const done = stage.tasks.filter((t) => t.status === "DONE").length;
        const pct = Math.round((done / stage.tasks.length) * 100);
        return (
          <div key={stage.name} className="border-b border-slate-100 last:border-b-0">
            <div className="flex items-center justify-between gap-3 bg-slate-50 px-3 py-2.5">
              <h3 className="min-w-0 truncate text-sm font-semibold text-slate-700">
                {stage.name}
              </h3>
              <div className="flex shrink-0 items-center gap-2">
                <span className="text-xs text-slate-500">
                  {done}/{stage.tasks.length}
                </span>
                <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-200">
                  <div className="h-full origin-left animate-gtg-fill rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
                </div>
              </div>
            </div>
            <ul className="divide-y divide-slate-100">
              {stage.tasks.map((t) => (
                <TaskRow key={t.id} task={t} isAdmin={isAdmin} />
              ))}
            </ul>
          </div>
        );
      })}

      {isAdmin && <AddTaskForm projectId={projectId} stages={stages.map((s) => s.name)} />}
    </div>
  );
}
