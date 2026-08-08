"use client";

import { ArrowDown, ArrowUp, LucideIcon, Minus } from "lucide-react";
import { formatDelta } from "@/lib/format";

/**
 * Ficha de indicador: rótulo, valor e — quando existe base de comparação — a
 * variação contra o período anterior. A cor da variação depende de a alta ser
 * boa ou ruim para aquele indicador (despesa subindo não é verde).
 */
export default function KpiCard({
  label,
  value,
  hint,
  delta,
  altaEBoa = true,
  icon: Icon,
  destaque = false,
  spark,
}: {
  label: string;
  value: string;
  hint?: string;
  delta?: number | null;
  altaEBoa?: boolean;
  icon?: LucideIcon;
  destaque?: boolean;
  spark?: number[];
}) {
  const temDelta = delta !== undefined && delta !== null && Number.isFinite(delta);
  const subiu = temDelta && (delta as number) > 0.05;
  const caiu = temDelta && (delta as number) < -0.05;
  const positivo = (subiu && altaEBoa) || (caiu && !altaEBoa);
  const negativo = (subiu && !altaEBoa) || (caiu && altaEBoa);

  const corDelta = positivo ? "text-good-ink" : negativo ? "text-crit-ink" : "text-ink-3";
  const IconeDelta = subiu ? ArrowUp : caiu ? ArrowDown : Minus;

  return (
    <div
      className={`flex flex-col gap-3 rounded-xl border p-4 shadow-[0_1px_2px_rgb(0_0_0/0.04)] ${
        destaque ? "border-brand/30 bg-brand-soft" : "border-line bg-surface"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-ink-2">{label}</p>
        {Icon && <Icon size={16} className="shrink-0 text-ink-3" aria-hidden />}
      </div>

      <p
        className={`font-semibold leading-none text-ink ${
          destaque ? "text-2xl sm:text-3xl" : "text-xl sm:text-2xl"
        }`}
      >
        {value}
      </p>

      <div className="flex min-h-[18px] flex-wrap items-center gap-x-2 gap-y-1">
        {temDelta && (
          <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${corDelta}`}>
            <IconeDelta size={12} aria-hidden />
            {formatDelta(delta as number)}
          </span>
        )}
        {hint && <span className="text-xs text-ink-3">{hint}</span>}
        {spark && spark.length > 1 && <Sparkline valores={spark} />}
      </div>
    </div>
  );
}

/** Doze pontos de contexto — tendência, não leitura de valor. */
function Sparkline({ valores }: { valores: number[] }) {
  const largura = 64;
  const altura = 18;
  const min = Math.min(...valores);
  const max = Math.max(...valores);
  const amplitude = max - min || 1;
  const passo = largura / (valores.length - 1);
  const pontos = valores
    .map((v, i) => `${(i * passo).toFixed(1)},${(altura - ((v - min) / amplitude) * altura).toFixed(1)}`)
    .join(" ");

  return (
    <svg
      width={largura}
      height={altura}
      viewBox={`0 0 ${largura} ${altura}`}
      className="ml-auto shrink-0 overflow-visible"
      aria-hidden
    >
      <polyline
        points={pontos}
        fill="none"
        stroke="var(--series-1)"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.55}
      />
      <circle
        cx={largura}
        cy={altura - ((valores[valores.length - 1] - min) / amplitude) * altura}
        r={2.5}
        fill="var(--series-1)"
      />
    </svg>
  );
}
