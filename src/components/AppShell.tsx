"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Cloud,
  CreditCard,
  FileBarChart,
  HardDrive,
  LayoutDashboard,
  LucideIcon,
  Menu,
  ReceiptText,
  Settings,
  Users,
  Waves,
  X,
} from "lucide-react";
import { useData } from "@/lib/data-context";
import PeriodPicker from "./PeriodPicker";
import ThemeToggle from "./ThemeToggle";
import { iniciais } from "@/lib/format";

interface ItemNav {
  href: string;
  label: string;
  icon: LucideIcon;
}

function useNavegacao(): { grupo: string; itens: ItemNav[] }[] {
  const { segmento } = useData();
  const rotulos = segmento.labels;

  return [
    {
      grupo: "Visão geral",
      itens: [{ href: "/", label: "Dashboard", icon: LayoutDashboard }],
    },
    {
      grupo: "Operação",
      itens: [
        { href: "/receitas", label: rotulos.receitaOperacional, icon: ReceiptText },
        { href: "/clientes", label: rotulos.clientes, icon: Users },
      ],
    },
    {
      grupo: "Financeiro",
      itens: [
        { href: "/contas", label: "Contas a pagar", icon: CreditCard },
        { href: "/fluxo-caixa", label: "Fluxo de caixa", icon: Waves },
      ],
    },
    {
      grupo: "Gestão",
      itens: [
        { href: "/relatorios", label: "Relatórios", icon: FileBarChart },
        { href: "/configuracoes", label: "Configurações", icon: Settings },
      ],
    },
  ];
}

function Marca({ compacta = false }: { compacta?: boolean }) {
  const { config, segmento } = useData();
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand text-xs font-bold text-brand-ink">
        {iniciais(config.empresa || "Dashboard Financeiro")}
      </div>
      {/* Em telas estreitas o nome viraria "Clí…" e não informa nada: só a sigla fica. */}
      <div className={compacta ? "hidden min-w-0 min-[430px]:block" : "min-w-0"}>
        <p className="truncate text-sm font-semibold leading-tight text-ink">
          {config.empresa || "Dashboard Financeiro"}
        </p>
        <p className="truncate text-[11px] leading-tight text-ink-3">{segmento.nome}</p>
      </div>
    </div>
  );
}

function Navegacao({ aoNavegar }: { aoNavegar?: () => void }) {
  const pathname = usePathname();
  const grupos = useNavegacao();

  return (
    <nav className="flex flex-col gap-5">
      {grupos.map(({ grupo, itens }) => (
        <div key={grupo}>
          <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-ink-3">
            {grupo}
          </p>
          <ul className="flex flex-col gap-0.5">
            {itens.map(({ href, label, icon: Icon }) => {
              const ativo = href === "/" ? pathname === "/" : pathname.startsWith(href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={aoNavegar}
                    aria-current={ativo ? "page" : undefined}
                    className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      ativo
                        ? "bg-brand-soft text-brand"
                        : "text-ink-2 hover:bg-raised hover:text-ink"
                    }`}
                  >
                    <Icon size={17} aria-hidden />
                    <span className="truncate">{label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function IndicadorArmazenamento() {
  const { usandoFirebase } = useData();
  const Icone = usandoFirebase ? Cloud : HardDrive;
  return (
    <div className="flex items-start gap-2 rounded-lg bg-raised px-3 py-2.5 text-[11px] leading-snug text-ink-3">
      <Icone size={14} className="mt-px shrink-0" aria-hidden />
      <span>
        {usandoFirebase
          ? "Sincronizado com o Firebase."
          : "Modo local: os dados ficam neste navegador."}
      </span>
    </div>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { pronto, ocupado } = useData();
  const [menuAberto, setMenuAberto] = useState(false);

  useEffect(() => {
    if (!menuAberto) return;
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuAberto(false);
    };
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [menuAberto]);

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 shrink-0 flex-col gap-6 border-r border-line bg-surface px-3 py-5 lg:flex">
        <div className="px-2">
          <Marca />
        </div>
        <Navegacao />
        <div className="mt-auto">
          <IndicadorArmazenamento />
        </div>
      </aside>

      {menuAberto && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/45"
            onClick={() => setMenuAberto(false)}
            aria-hidden
          />
          <div className="absolute inset-y-0 left-0 flex w-72 flex-col gap-6 border-r border-line bg-surface px-3 py-5">
            <div className="flex items-center justify-between gap-2 px-2">
              <Marca />
              <button
                onClick={() => setMenuAberto(false)}
                aria-label="Fechar menu"
                className="rounded-lg p-1.5 text-ink-3 hover:bg-raised hover:text-ink"
              >
                <X size={18} />
              </button>
            </div>
            <Navegacao aoNavegar={() => setMenuAberto(false)} />
            <div className="mt-auto">
              <IndicadorArmazenamento />
            </div>
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-line bg-surface/95 px-4 py-3 backdrop-blur lg:px-8">
          <button
            onClick={() => setMenuAberto(true)}
            aria-label="Abrir menu"
            className="rounded-lg p-1.5 text-ink-2 hover:bg-raised lg:hidden"
          >
            <Menu size={20} />
          </button>

          <div className="min-w-0 flex-1 lg:hidden">
            <Marca compacta />
          </div>

          <div className="ml-auto flex items-center gap-2">
            {ocupado && (
              <span className="hidden text-xs text-ink-3 sm:inline" role="status">
                Sincronizando…
              </span>
            )}
            <PeriodPicker />
            <ThemeToggle />
          </div>
        </header>

        {/* `clip` (e não `hidden`) impede que o rótulo de eixo que sobra de um
            gráfico estreito crie rolagem lateral na página, sem virar um
            contexto de rolagem que quebraria elementos fixos. */}
        <main className="min-w-0 flex-1 overflow-x-clip px-4 py-6 lg:px-8">
          {pronto ? children : <Esqueleto />}
        </main>
      </div>
    </div>
  );
}

function Esqueleto() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Carregando dados">
      <div className="h-8 w-56 rounded-lg bg-raised" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-28 rounded-xl border border-line bg-surface" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="h-80 rounded-xl border border-line bg-surface lg:col-span-2" />
        <div className="h-80 rounded-xl border border-line bg-surface" />
      </div>
    </div>
  );
}
