import {
  addDays,
  addMonths,
  diffDays,
  firstDayOfMonth,
  lastDayOfMonth,
  monthKey,
  todayISO,
} from "./format";

export interface Periodo {
  inicio: string;
  fim: string;
  label: string;
}

export type PresetPeriodo =
  | "mes-atual"
  | "mes-anterior"
  | "ultimos-3-meses"
  | "ultimos-6-meses"
  | "ultimos-12-meses"
  | "ano-atual"
  | "personalizado";

export const PRESETS: { id: PresetPeriodo; label: string }[] = [
  { id: "mes-atual", label: "Mês atual" },
  { id: "mes-anterior", label: "Mês anterior" },
  { id: "ultimos-3-meses", label: "Últimos 3 meses" },
  { id: "ultimos-6-meses", label: "Últimos 6 meses" },
  { id: "ultimos-12-meses", label: "Últimos 12 meses" },
  { id: "ano-atual", label: "Ano atual" },
  { id: "personalizado", label: "Personalizado" },
];

export function resolverPeriodo(
  preset: PresetPeriodo,
  custom?: { inicio: string; fim: string }
): Periodo {
  const hoje = todayISO();
  const label = PRESETS.find((p) => p.id === preset)?.label ?? "Período";

  switch (preset) {
    case "mes-atual":
      return { inicio: firstDayOfMonth(hoje), fim: lastDayOfMonth(hoje), label };
    case "mes-anterior": {
      const anterior = addMonths(firstDayOfMonth(hoje), -1);
      return { inicio: anterior, fim: lastDayOfMonth(anterior), label };
    }
    case "ultimos-3-meses":
      return {
        inicio: firstDayOfMonth(addMonths(hoje, -2)),
        fim: lastDayOfMonth(hoje),
        label,
      };
    case "ultimos-6-meses":
      return {
        inicio: firstDayOfMonth(addMonths(hoje, -5)),
        fim: lastDayOfMonth(hoje),
        label,
      };
    case "ultimos-12-meses":
      return {
        inicio: firstDayOfMonth(addMonths(hoje, -11)),
        fim: lastDayOfMonth(hoje),
        label,
      };
    case "ano-atual":
      return { inicio: `${hoje.slice(0, 4)}-01-01`, fim: `${hoje.slice(0, 4)}-12-31`, label };
    case "personalizado":
    default:
      return {
        inicio: custom?.inicio ?? firstDayOfMonth(hoje),
        fim: custom?.fim ?? hoje,
        label,
      };
  }
}

/**
 * Período imediatamente anterior, de mesma duração — base de todas as
 * comparações "vs. período anterior" dos KPIs.
 */
export function periodoAnterior(periodo: Periodo): Periodo {
  const dias = diffDays(periodo.inicio, periodo.fim) + 1;
  const fim = addDays(periodo.inicio, -1);
  const inicio = addDays(fim, -(dias - 1));
  return { inicio, fim, label: "Período anterior" };
}

export function dentroDoPeriodo(iso: string | undefined, periodo: Periodo): boolean {
  if (!iso) return false;
  return iso >= periodo.inicio && iso <= periodo.fim;
}

/** Lista de chaves "yyyy-mm" cobertas pelo período, em ordem. */
export function mesesDoPeriodo(periodo: Periodo): string[] {
  const chaves: string[] = [];
  let cursor = firstDayOfMonth(periodo.inicio);
  const limite = monthKey(periodo.fim);
  while (monthKey(cursor) <= limite) {
    chaves.push(monthKey(cursor));
    cursor = addMonths(cursor, 1);
    if (chaves.length > 120) break;
  }
  return chaves;
}

export function duracaoEmMeses(periodo: Periodo): number {
  return Math.max(1, mesesDoPeriodo(periodo).length);
}
