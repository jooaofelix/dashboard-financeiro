"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Stethoscope, Wallet } from "lucide-react";

const links = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/consultas", label: "Consultas", icon: Stethoscope },
  { href: "/financeiro", label: "Financeiro", icon: Wallet },
];

export default function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="sm:hidden sticky top-0 z-10 flex items-center justify-around border-b border-slate-200 bg-white/95 px-2 py-2 backdrop-blur">
      {links.map(({ href, label, icon: Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={`flex flex-col items-center gap-0.5 rounded-lg px-3 py-1.5 text-xs font-medium ${
              active ? "text-teal-700" : "text-slate-500"
            }`}
          >
            <Icon size={18} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
