/**
 * A marca nasce do próprio nome: uma **linha de base** sólida com colunas
 * crescendo a partir dela. É ao mesmo tempo um gráfico e uma fundação — que é
 * exatamente o que o produto faz com o dinheiro de quem usa.
 *
 * Desenhado em `currentColor` para servir em qualquer superfície e tamanho.
 */
export function BaseMark({
  size = 24,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden
    >
      {/* Colunas: crescem da base, com topo arredondado. */}
      <rect x="4" y="11" width="4" height="6" rx="1.4" fill="currentColor" opacity="0.55" />
      <rect x="10" y="7.5" width="4" height="9.5" rx="1.4" fill="currentColor" opacity="0.78" />
      <rect x="16" y="4" width="4" height="13" rx="1.4" fill="currentColor" />
      {/* A base: a régua que sustenta tudo. */}
      <rect x="3" y="19" width="18" height="2.6" rx="1.3" fill="currentColor" />
    </svg>
  );
}

/** Selo quadrado da marca — usado como avatar do produto e favicon-like. */
export function BaseBadge({
  size = 36,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-[10px] bg-brand text-brand-ink ${className}`}
      style={{ width: size, height: size }}
    >
      <BaseMark size={Math.round(size * 0.62)} />
    </span>
  );
}

/**
 * Assinatura completa. O nome é curto e estrutural, então pede caixa alta e
 * entreletras aberto — o espaçamento é o que dá a ele presença de marca.
 */
export function BaseWordmark({
  className = "",
  tamanho = "md",
}: {
  className?: string;
  tamanho?: "sm" | "md" | "lg";
}) {
  const escalas = {
    sm: "text-sm tracking-[0.22em]",
    md: "text-base tracking-[0.24em]",
    lg: "text-2xl tracking-[0.28em]",
  };
  return (
    <span className={`font-bold uppercase leading-none ${escalas[tamanho]} ${className}`}>
      Base
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
        <BaseWordmark tamanho={tamanho} className="text-ink" />
        {legenda && (
          <span className="truncate text-[11px] leading-none text-ink-3">{legenda}</span>
        )}
      </span>
    </span>
  );
}
