"use client";

import { useRef, useState, useTransition } from "react";
import { addMember, removeMember } from "@/app/obras/actions";
import Badge from "@/components/Badge";
import { memberRoleLabel, type TeamMemberItem } from "@/lib/types";

const inputCls =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

function MemberRow({ member, isAdmin }: { member: TeamMemberItem; isAdmin: boolean }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function remove() {
    if (!confirm(`Remover ${member.name} da equipe?`)) return;
    setError("");
    startTransition(async () => {
      const result = await removeMember(member.id);
      if ("error" in result) setError(result.error);
    });
  }

  const initials = member.name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

  return (
    <li className={`flex items-center gap-3 px-4 py-2.5 ${pending ? "opacity-60" : ""}`}>
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
          member.role === "LEAD" ? "bg-sun-100 text-sun-700" : "bg-slate-100 text-slate-600"
        }`}
      >
        {initials || "?"}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{member.name}</p>
        <p className="truncate text-xs text-slate-500">{member.jobTitle || "—"}</p>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
      {member.role === "LEAD" && <Badge tone="amber">{memberRoleLabel.LEAD}</Badge>}
      {isAdmin && (
        <button
          type="button"
          onClick={remove}
          disabled={pending}
          aria-label={`Remover ${member.name}`}
          className="rounded-md px-1.5 text-lg leading-none text-slate-400 hover:bg-slate-100 hover:text-red-600"
        >
          ×
        </button>
      )}
    </li>
  );
}

function AddMemberForm({ projectId }: { projectId: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const data = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await addMember(data);
      if ("error" in result) setError(result.error);
      else formRef.current?.reset();
    });
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className="space-y-3 border-t border-slate-100 p-4">
      <p className="text-sm font-medium text-slate-700">Adicionar à equipe</p>
      <input type="hidden" name="projectId" value={projectId} />
      <input name="name" required placeholder="Nome" className={inputCls} />
      <div className="grid gap-3 sm:grid-cols-2">
        <input name="jobTitle" placeholder="Função (ex.: eletricista)" className={inputCls} />
        <select name="role" defaultValue="MEMBER" className={inputCls}>
          <option value="MEMBER">Equipe</option>
          <option value="LEAD">Líder da obra</option>
        </select>
      </div>
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-brand-900 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-60"
      >
        {pending ? "Adicionando..." : "Adicionar"}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </form>
  );
}

export default function Team({
  projectId,
  team,
  isAdmin,
}: {
  projectId: string;
  team: TeamMemberItem[];
  isAdmin: boolean;
}) {
  const leads = team.filter((m) => m.role === "LEAD").length;
  const others = team.length - leads;

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-slate-50 px-4 py-2.5">
        <h3 className="text-sm font-semibold text-slate-700">Equipe da obra</h3>
        <p className="text-xs text-slate-500">
          {team.length === 0
            ? "Ninguém cadastrado"
            : `${leads} ${leads === 1 ? "líder" : "líderes"} · ${others} na equipe`}
        </p>
      </div>
      {team.length > 0 && (
        <ul className="divide-y divide-slate-100">
          {team.map((m) => (
            <MemberRow key={m.id} member={m} isAdmin={isAdmin} />
          ))}
        </ul>
      )}
      {isAdmin && <AddMemberForm projectId={projectId} />}
    </div>
  );
}
