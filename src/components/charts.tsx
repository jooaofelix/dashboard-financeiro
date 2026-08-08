"use client";

import { useState } from "react";
import { TrendingUp } from "lucide-react";
import { Segmented, TableWrap, Td, Th } from "./ui";

/* -------------------------------------------------------------------------- */
/* Chrome compartilhado                                                        */
/* -------------------------------------------------------------------------- */

export const eixoX = {
  tickLine: false,
  axisLine: { stroke: "var(--axis)" },
  tick: { fontSize: 11, fill: "var(--ink-3)" },
  dy: 4,
} as const;

export const eixoY = {
  tickLine: false,
  axisLine: false,
  tick: { fontSize: 11, fill: "var(--ink-3)" },
  width: 88,
} as const;

export const gradeProps = {
  stroke: "var(--grid)",
  strokeWidth: 1,
  vertical: false,
} as const;

interface ItemTooltip {
  name?: string | number;
  value?: number | string;
  color?: string;
  dataKey?: string | number;
  payload?: Record<string, unknown>;
}

/** Tooltip própria: as cores vêm das séries, o texto usa os tokens de tinta. */
export function ChartTooltip({
  active,
  payload,
  label,
  formatar,
  formatarLabel,
  total,
}: {
  active?: boolean;
  payload?: ItemTooltip[];
  label?: string | number;
  formatar: (valor: number) => string;
  formatarLabel?: (label: string) => string;
  total?: boolean;
}) {
  if (!active || !payload?.length) return null;
  const soma = payload.reduce((acc, item) => acc + Number(item.value ?? 0), 0);

  return (
    <div className="min-w-[168px] rounded-lg border border-line bg-surface px-3 py-2 shadow-lg">
      {label !== undefined && (
        <p className="mb-1.5 text-xs font-semibold text-ink">
          {formatarLabel ? formatarLabel(String(label)) : String(label)}
        </p>
      )}
      <ul className="flex flex-col gap-1">
        {payload.map((item, i) => (
          <li key={i} className="flex items-center justify-between gap-4 text-xs">
            <span className="flex items-center gap-1.5 text-ink-2">
              <span
                aria-hidden
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              {item.name}
            </span>
            <span className="tabular font-medium text-ink">
              {formatar(Number(item.value ?? 0))}
            </span>
          </li>
        ))}
      </ul>
      {total && payload.length > 1 && (
        <p className="mt-1.5 flex items-center justify-between gap-4 border-t border-line pt-1.5 text-xs text-ink-2">
          Total <span className="tabular font-semibold text-ink">{formatar(soma)}</span>
        </p>
      )}
    </div>
  );
}

/** Legenda sempre presente a partir de duas séries — identidade nunca é só cor. */
export function Legenda({
  itens,
  className = "",
}: {
  itens: { cor: string; label: string; tracejado?: boolean }[];
  className?: string;
}) {
  return (
    <ul className={`flex flex-wrap items-center gap-x-4 gap-y-1.5 ${className}`}>
      {itens.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5 text-xs text-ink-2">
          <span
            aria-hidden
            className={item.tracejado ? "h-0.5 w-4 rounded-full" : "h-2.5 w-2.5 rounded-[3px]"}
            style={{ backgroundColor: item.cor }}
          />
          {item.label}
        </li>
      ))}
    </ul>
  );
}

/* -------------------------------------------------------------------------- */
/* Cartão de gráfico com visão de tabela                                       */
/* -------------------------------------------------------------------------- */

export interface DadosTabela {
  cabecalho: string[];
  linhas: (string | number)[][];
  /** Índices das colunas alinhadas à direita (valores). */
  numericas?: number[];
}

/**
 * Todo gráfico tem uma tabela equivalente: quem não distingue as cores, usa
 * leitor de tela ou precisa do número exato tem o mesmo dado sem depender do
 * gráfico.
 */
export function ChartCard({
  titulo,
  descricao,
  legenda,
  acoes,
  tabela,
  altura = 280,
  className = "",
  children,
}: {
  titulo: string;
  descricao?: string;
  legenda?: React.ReactNode;
  acoes?: React.ReactNode;
  tabela?: DadosTabela;
  altura?: number;
  className?: string;
  children: React.ReactNode;
}) {
  const [visao, setVisao] = useState<"grafico" | "tabela">("grafico");

  return (
    <section
      className={`flex flex-col rounded-xl border border-line bg-surface shadow-[0_1px_2px_rgb(0_0_0/0.04)] ${className}`}
    >
      <header className="flex flex-wrap items-start justify-between gap-3 px-4 pb-3 pt-4">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-ink">{titulo}</h2>
          {descricao && <p className="mt-0.5 text-xs text-ink-3">{descricao}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {acoes}
          {tabela && (
            <Segmented
              ariaLabel={`Visualização de ${titulo}`}
              valor={visao}
              onChange={setVisao}
              opcoes={[
                { id: "grafico", label: "Gráfico" },
                { id: "tabela", label: "Tabela" },
              ]}
            />
          )}
        </div>
      </header>

      {legenda && <div className="px-4 pb-3">{legenda}</div>}

      {visao === "grafico" ? (
        <div className="px-2 pb-3" style={{ height: altura }}>
          {children}
        </div>
      ) : (
        <div className="max-h-[420px] overflow-y-auto border-t border-line">
          <TableWrap>
            <table className="w-full">
              <thead className="sticky top-0 bg-raised">
                <tr className="border-b border-line">
                  {tabela?.cabecalho.map((coluna, i) => (
                    <Th key={coluna} align={tabela.numericas?.includes(i) ? "right" : "left"}>
                      {coluna}
                    </Th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tabela?.linhas.map((linha, i) => (
                  <tr key={i} className="border-b border-line last:border-0">
                    {linha.map((celula, j) => (
                      <Td
                        key={j}
                        className={
                          tabela.numericas?.includes(j) ? "tabular text-right text-ink" : ""
                        }
                      >
                        {celula}
                      </Td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        </div>
      )}
    </section>
  );
}

/** Espaço reservado enquanto não há dados suficientes para desenhar. */
export function SemDados({ mensagem = "Sem dados no período selecionado." }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
      <TrendingUp size={18} className="text-ink-3" aria-hidden />
      <p className="text-xs text-ink-3">{mensagem}</p>
    </div>
  );
}
