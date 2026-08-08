"use client";

import { LucideIcon } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

/* -------------------------------------------------------------------------- */
/* Superfícies                                                                 */
/* -------------------------------------------------------------------------- */

export function Panel({
  titulo,
  descricao,
  acoes,
  children,
  className = "",
  padding = true,
}: {
  titulo?: string;
  descricao?: string;
  acoes?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  padding?: boolean;
}) {
  return (
    <section
      className={`flex flex-col rounded-xl border border-line bg-surface shadow-[0_1px_2px_rgb(0_0_0/0.04)] ${className}`}
    >
      {(titulo || acoes) && (
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-4 py-3">
          <div className="min-w-0">
            {titulo && <h2 className="text-sm font-semibold text-ink">{titulo}</h2>}
            {descricao && <p className="mt-0.5 text-xs text-ink-3">{descricao}</p>}
          </div>
          {acoes && <div className="flex shrink-0 items-center gap-2">{acoes}</div>}
        </header>
      )}
      <div className={padding ? "flex-1 p-4" : "flex-1"}>{children}</div>
    </section>
  );
}

export function EmptyState({
  icon: Icon,
  titulo,
  descricao,
  acao,
}: {
  icon?: LucideIcon;
  titulo: string;
  descricao?: string;
  acao?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
      {Icon && (
        <div className="mb-1 flex h-10 w-10 items-center justify-center rounded-full bg-raised text-ink-3">
          <Icon size={18} />
        </div>
      )}
      <p className="text-sm font-medium text-ink-2">{titulo}</p>
      {descricao && <p className="max-w-sm text-xs text-ink-3">{descricao}</p>}
      {acao && <div className="mt-2">{acao}</div>}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Controles                                                                   */
/* -------------------------------------------------------------------------- */

type Variante = "primary" | "secondary" | "ghost" | "danger";

const variantes: Record<Variante, string> = {
  primary: "bg-brand text-brand-ink hover:opacity-90",
  secondary: "border border-line bg-surface text-ink hover:bg-raised",
  ghost: "text-ink-2 hover:bg-raised hover:text-ink",
  danger: "border border-crit/30 bg-crit-soft text-crit-ink hover:border-crit/60",
};

export function Button({
  variante = "secondary",
  icon: Icon,
  children,
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: Variante;
  icon?: LucideIcon;
}) {
  return (
    <button
      {...props}
      className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-lg px-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-50 ${variantes[variante]} ${className}`}
    >
      {Icon && <Icon size={16} />}
      {children}
    </button>
  );
}

const campoBase =
  "h-9 w-full rounded-lg border border-line bg-surface px-3 text-sm text-ink placeholder:text-ink-3 transition-colors focus:border-brand focus:outline-none";

export function Field({
  label,
  hint,
  children,
  className = "",
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`flex flex-col gap-1 ${className}`}>
      <span className="text-xs font-medium text-ink-2">{label}</span>
      {children}
      {hint && <span className="text-[11px] text-ink-3">{hint}</span>}
    </label>
  );
}

export function Input({
  className = "",
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${campoBase} ${className}`} />;
}

export function Select({
  className = "",
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} className={`${campoBase} ${className}`}>
      {children}
    </select>
  );
}

export function Checkbox({
  label,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-ink-2">
      <input
        type="checkbox"
        {...props}
        className="h-4 w-4 rounded border-line-strong accent-[var(--brand)]"
      />
      {label}
    </label>
  );
}

export function Segmented<T extends string>({
  opcoes,
  valor,
  onChange,
  ariaLabel,
}: {
  opcoes: { id: T; label: string }[];
  valor: T;
  onChange: (id: T) => void;
  ariaLabel: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="inline-flex rounded-lg border border-line bg-raised p-0.5"
    >
      {opcoes.map((opcao) => {
        const ativo = opcao.id === valor;
        return (
          <button
            key={opcao.id}
            role="tab"
            aria-selected={ativo}
            onClick={() => onChange(opcao.id)}
            className={`rounded-[6px] px-3 py-1.5 text-xs font-medium transition-colors ${
              ativo ? "bg-surface text-ink shadow-sm" : "text-ink-3 hover:text-ink-2"
            }`}
          >
            {opcao.label}
          </button>
        );
      })}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Modal                                                                       */
/* -------------------------------------------------------------------------- */

export function Modal({
  aberto,
  onFechar,
  titulo,
  descricao,
  children,
  largura = "max-w-2xl",
}: {
  aberto: boolean;
  onFechar: () => void;
  titulo: string;
  descricao?: string;
  children: React.ReactNode;
  largura?: string;
}) {
  const tituloId = useId();
  const painel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") onFechar();
    };
    document.addEventListener("keydown", aoTeclar);
    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    painel.current?.focus();
    return () => {
      document.removeEventListener("keydown", aoTeclar);
      document.body.style.overflow = anterior;
    };
  }, [aberto, onFechar]);

  if (!aberto) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-6"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onFechar();
      }}
    >
      <div
        ref={painel}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        className={`max-h-[92vh] w-full overflow-y-auto rounded-t-2xl border border-line bg-surface shadow-xl outline-none sm:rounded-2xl ${largura}`}
      >
        <header className="sticky top-0 z-10 border-b border-line bg-surface px-5 py-4">
          <h2 id={tituloId} className="text-base font-semibold text-ink">
            {titulo}
          </h2>
          {descricao && <p className="mt-0.5 text-xs text-ink-3">{descricao}</p>}
        </header>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Tabela                                                                      */
/* -------------------------------------------------------------------------- */

export function TableWrap({ children }: { children: React.ReactNode }) {
  return <div className="w-full overflow-x-auto">{children}</div>;
}

const alinhamentos = {
  left: "text-left",
  right: "text-right",
  center: "text-center",
} as const;

export function Th({
  children,
  className = "",
  align = "left",
}: {
  children?: React.ReactNode;
  className?: string;
  align?: keyof typeof alinhamentos;
}) {
  return (
    <th
      className={`whitespace-nowrap px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-ink-3 ${alinhamentos[align]} ${className}`}
    >
      {children}
    </th>
  );
}

/**
 * Paginação derivada: a página efetiva é sempre recalculada a partir do total,
 * então filtrar a lista nunca deixa o usuário preso numa página que sumiu.
 */
export function usePaginacao<T>(itens: T[], tamanho = 25) {
  const [paginaDesejada, setPagina] = useState(1);
  const totalPaginas = Math.max(1, Math.ceil(itens.length / tamanho));
  const pagina = Math.min(Math.max(1, paginaDesejada), totalPaginas);
  const primeiro = (pagina - 1) * tamanho;

  return {
    visiveis: itens.slice(primeiro, primeiro + tamanho),
    pagina,
    totalPaginas,
    setPagina,
    total: itens.length,
    de: itens.length === 0 ? 0 : primeiro + 1,
    ate: Math.min(primeiro + tamanho, itens.length),
  };
}

export function Paginacao({
  pagina,
  totalPaginas,
  setPagina,
  de,
  ate,
  total,
  rotulo = "registros",
}: {
  pagina: number;
  totalPaginas: number;
  setPagina: (p: number) => void;
  de: number;
  ate: number;
  total: number;
  rotulo?: string;
}) {
  if (total === 0) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3">
      <p className="text-xs text-ink-3">
        <span className="tabular">
          {de}–{ate}
        </span>{" "}
        de <span className="tabular">{total}</span> {rotulo}
      </p>
      {totalPaginas > 1 && (
        <div className="flex items-center gap-2">
          <Button
            variante="secondary"
            onClick={() => setPagina(pagina - 1)}
            disabled={pagina <= 1}
            className="h-8 px-2.5 text-xs"
          >
            Anterior
          </Button>
          <span className="tabular text-xs text-ink-3">
            {pagina} / {totalPaginas}
          </span>
          <Button
            variante="secondary"
            onClick={() => setPagina(pagina + 1)}
            disabled={pagina >= totalPaginas}
            className="h-8 px-2.5 text-xs"
          >
            Próxima
          </Button>
        </div>
      )}
    </div>
  );
}

export function Td({
  children,
  className = "",
  colSpan,
}: {
  children?: React.ReactNode;
  className?: string;
  colSpan?: number;
}) {
  return (
    <td colSpan={colSpan} className={`px-4 py-2.5 text-sm text-ink-2 ${className}`}>
      {children}
    </td>
  );
}
