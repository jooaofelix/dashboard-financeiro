"use client";

import { useId } from "react";

/**
 * A marca oficial da BASE: três colunas em perspectiva, crescendo em gradiente
 * do azul ao ciano, apoiadas sobre um arco — a base que sustenta a curva de
 * crescimento.
 *
 * O gradiente é declarado por instância (`useId`) para vários tamanhos do
 * símbolo conviverem na mesma página sem disputar o mesmo `id`.
 */
export function BaseMark({
  size = 24,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  const id = useId();
  const gradColunas = `${id}-colunas`;
  const gradArco = `${id}-arco`;
  const recorte = `${id}-recorte`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      className={className}
      aria-hidden
    >
      <defs>
        <linearGradient id={gradColunas} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--marca-de)" />
          <stop offset="100%" stopColor="var(--marca-ate)" />
        </linearGradient>
        <linearGradient id={gradArco} x1="0.05" y1="1" x2="0.95" y2="0.1">
          <stop offset="0%" stopColor="var(--marca-arco-de)" />
          <stop offset="100%" stopColor="var(--marca-arco-ate)" />
        </linearGradient>

        {/* Tudo acima da aresta interna do arco. As colunas são desenhadas
            inteiras e recortadas por aqui, então encostam no arco sem vazar
            por baixo dele — como no logotipo. */}
        <clipPath id={recorte}>
          <path d="M0 0 H64 V23 C56.4 35 47 42 34 42 C22 42 12 39 5 33.4 L0 33.4 Z" />
        </clipPath>
      </defs>

      {/* Colunas: topo inclinado, crescendo da esquerda para a direita. */}
      <g fill={`url(#${gradColunas})`} clipPath={`url(#${recorte})`}>
        <path d="M18.8 31.8 L28.4 27.6 L28.4 48 L18.8 48 Z" />
        <path d="M30.4 22.4 L40 18.2 L40 48 L30.4 48 Z" />
        <path d="M42 12.6 L51.6 8.4 L51.6 48 L42 48 Z" />
      </g>

      {/* O arco: crescente afilado nas duas pontas, com a direita subindo alto
          — é o que dá o movimento de vela ao símbolo. */}
      <path
        d="M4.6 33.2
           C11.8 42.8 21.4 48.4 31.6 48.4
           C45 48.4 55 39.8 60 24.4
           C56.4 35 47 42 34 42
           C22 42 12 39 5 33.4 Z"
        fill={`url(#${gradArco})`}
      />
    </svg>
  );
}

/** Selo quadrado da marca — avatar do produto no menu e na tela de entrada. */
export function BaseBadge({
  size = 36,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-[10px] ${className}`}
      style={{ width: size, height: size, backgroundColor: "var(--marca-selo)" }}
    >
      <BaseMark size={Math.round(size * 0.78)} />
    </span>
  );
}

/**
 * Assinatura tipográfica: caixa alta, peso leve e entreletras bem aberto, com o
 * "A" desenhado como chevron — a marca registrada do logotipo.
 *
 * O chevron é um caminho SVG, e não a letra grega, para não depender de a fonte
 * ter o glifo. O nome legível para leitores de tela vem à parte.
 */
export function BaseWordmark({
  className = "",
  tamanho = "md",
}: {
  className?: string;
  tamanho?: "sm" | "md" | "lg";
}) {
  const escalas = {
    sm: { texto: "text-sm", tracking: "0.32em" },
    md: { texto: "text-xl", tracking: "0.34em" },
    lg: { texto: "text-[2.75rem]", tracking: "0.32em" },
  };
  const { texto, tracking } = escalas[tamanho];

  return (
    <span className={`inline-flex items-baseline ${texto} ${className}`}>
      <span className="sr-only">BASE</span>
      <span
        aria-hidden
        className="inline-flex items-baseline font-light uppercase leading-none"
        style={{ letterSpacing: tracking }}
      >
        B
        {/* Dimensionado em `em`: o chevron acompanha a altura de caixa alta e a
            espessura das outras letras em qualquer tamanho. */}
        <svg
          viewBox="0 0 11 12"
          fill="none"
          style={{
            width: "0.66em",
            height: "0.72em",
            marginRight: tracking,
            alignSelf: "baseline",
          }}
        >
          <path
            d="M1 11.5 L5.5 0.9 L10 11.5"
            stroke="currentColor"
            strokeWidth="0.9"
            strokeLinecap="butt"
            strokeLinejoin="miter"
          />
        </svg>
        SE
      </span>
    </span>
  );
}

export function BaseLockup({
  size = 36,
  tamanho = "md",
  legenda,
  className = "",
}: {
  size?: number;
  tamanho?: "sm" | "md" | "lg";
  legenda?: string;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <BaseBadge size={size} />
      <span className="flex min-w-0 flex-col gap-1">
        <BaseWordmark tamanho={tamanho} className="text-marca-tipo" />
        {legenda && (
          <span className="truncate text-[11px] leading-none text-ink-3">{legenda}</span>
        )}
      </span>
    </span>
  );
}
