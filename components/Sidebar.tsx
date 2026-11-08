"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { logout } from "@/app/auth/actions";
import {
  BoxIcon,
  CloseIcon,
  FileIcon,
  HomeIcon,
  IdCardIcon,
  MenuIcon,
  SunIcon,
  TrendIcon,
  UsersIcon,
} from "@/components/Icons";
import { roleLabel, type Role } from "@/lib/types";

type Item = { href: string; label: string; icon: (p: { className?: string }) => React.ReactNode };
type Group = { title: string; adminOnly?: boolean; items: Item[] };

const groups: Group[] = [
  {
    title: "Obras",
    items: [
      { href: "/", label: "Painel", icon: HomeIcon },
      { href: "/obras", label: "Obras", icon: SunIcon },
    ],
  },
  {
    title: "Financeiro",
    adminOnly: true,
    items: [
      { href: "/financeiro", label: "Movimentações", icon: TrendIcon },
      { href: "/notas-fiscais", label: "Notas fiscais", icon: FileIcon },
    ],
  },
  {
    title: "Estoque",
    items: [
      { href: "/products", label: "Produtos", icon: BoxIcon },
    ],
  },
  {
    title: "Administração",
    adminOnly: true,
    items: [
      { href: "/funcionarios", label: "Funcionários", icon: IdCardIcon },
      { href: "/users", label: "Usuários", icon: UsersIcon },
    ],
  },
];

export default function Sidebar({ user }: { user: { name: string; role: Role } }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const visible = groups.filter((g) => !g.adminOnly || user.role === "ADMIN");

  return (
    <aside className="shrink-0 border-b border-slate-200 bg-white md:sticky md:top-0 md:flex md:h-screen md:w-64 md:flex-col md:border-b-0 md:border-r">
      <div className="flex items-center justify-between px-4 py-2.5 md:justify-center md:px-6 md:py-6">
        <Link href="/" onClick={() => setOpen(false)} aria-label="GTG Energia, ir ao painel">
          <Image
            src="/logo.png"
            alt="GTG Energia"
            width={640}
            height={364}
            priority
            className="h-10 w-auto md:h-20"
          />
        </Link>
        <button
          type="button"
          className="rounded-lg p-2 text-brand-900 hover:bg-brand-50 md:hidden"
          aria-label={open ? "Fechar menu" : "Abrir menu"}
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <CloseIcon /> : <MenuIcon />}
        </button>
      </div>

      <div
        className={`${open ? "flex" : "hidden"} flex-col md:flex md:min-h-0 md:flex-1 md:overflow-y-auto`}
      >
        <nav className="flex flex-col gap-4 px-3 pb-4">
          {visible.map((g) => (
            <div key={g.title} className="space-y-0.5">
              <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                {g.title}
              </p>
              {g.items.map((item) => {
                const active =
                  item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                      active
                        ? "bg-brand-900 text-white"
                        : "text-slate-600 hover:bg-brand-50 hover:text-brand-900"
                    }`}
                  >
                    <Icon className={`h-5 w-5 ${active ? "text-sun-400" : ""}`} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="mt-auto flex items-center justify-between gap-3 border-t border-slate-200 p-4">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-brand-900">{user.name}</p>
            <p className="text-xs text-slate-500">{roleLabel[user.role]}</p>
          </div>
          <form action={logout}>
            <button
              type="submit"
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-brand-50 hover:text-brand-900"
            >
              Sair
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
