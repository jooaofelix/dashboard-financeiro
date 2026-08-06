"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Stethoscope, Wallet, Wallet2 } from "lucide-react";
import { useData } from "@/lib/data-context";

const links = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/consultas", label: "Consultas", icon: Stethoscope },
  { href: "/financeiro", label: "Financeiro", icon: Wallet },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { usandoFirebase } = useData();

  return (
    <aside className="hidden sm:flex w-60 shrink-0 flex-col border-r border-slate-200 bg-white px-4 py-6">
      <div className="flex items-center gap-2 px-2 pb-8">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-600 text-white">
          <Wallet2 size={18} />
        </div>
        <div>
          <p className="text-sm font-semibold leading-tight">Dashboard</p>
          <p className="text-xs leading-tight text-slate-500">Financeiro</p>
        </div>
      </div>

      <nav className="flex flex-col gap-1">
        {links.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? "bg-teal-50 text-teal-700"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Icon size={18} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto rounded-lg bg-slate-50 px-3 py-3 text-xs text-slate-500">
        {usandoFirebase
          ? "Dados sincronizados com o Firebase."
          : "Dados salvos localmente neste navegador."}
      </div>
    </aside>
  );
}
