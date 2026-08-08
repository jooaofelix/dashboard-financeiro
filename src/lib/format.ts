const MESES_CURTOS = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
];

const MESES_LONGOS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

export function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Versão compacta para eixos e KPIs: R$ 1,2 mil / R$ 3,4 mi. */
export function formatCompact(value: number): string {
  const abs = Math.abs(value);
  const sinal = value < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sinal}R$ ${(abs / 1_000_000).toFixed(1).replace(".", ",")} mi`;
  if (abs >= 1_000) return `${sinal}R$ ${(abs / 1_000).toFixed(abs >= 10_000 ? 0 : 1).replace(".", ",")} mil`;
  return `${sinal}R$ ${abs.toFixed(0)}`;
}

export function formatNumber(value: number, casas = 0): string {
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  });
}

export function formatPercent(value: number, casas = 1): string {
  return `${value.toLocaleString("pt-BR", {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  })}%`;
}

/** Percentual assinado, para variações período a período. */
export function formatDelta(value: number | null, casas = 1): string {
  if (value === null || !Number.isFinite(value)) return "—";
  const sinal = value > 0 ? "+" : "";
  return `${sinal}${formatPercent(value, casas)}`;
}

export function formatDate(iso: string): string {
  if (!iso) return "—";
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

export function formatDateShort(iso: string): string {
  if (!iso) return "—";
  const [, mes, dia] = iso.split("-");
  return `${dia}/${mes}`;
}

/** "2026-08" -> "ago/26" */
export function formatMonthKey(chave: string): string {
  const [ano, mes] = chave.split("-");
  return `${MESES_CURTOS[Number(mes) - 1]}/${ano.slice(2)}`;
}

/** "2026-08" -> "Agosto de 2026" */
export function formatMonthLong(chave: string): string {
  const [ano, mes] = chave.split("-");
  return `${MESES_LONGOS[Number(mes) - 1]} de ${ano}`;
}

export function todayISO(): string {
  return toISO(new Date());
}

export function toISO(date: Date): string {
  const ano = date.getFullYear();
  const mes = String(date.getMonth() + 1).padStart(2, "0");
  const dia = String(date.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

/** Interpreta a data ISO no fuso local, sem o deslocamento de UTC do `new Date(iso)`. */
export function parseISO(iso: string): Date {
  const [ano, mes, dia] = iso.split("-").map(Number);
  return new Date(ano, (mes ?? 1) - 1, dia ?? 1);
}

export function addDays(iso: string, dias: number): string {
  const d = parseISO(iso);
  d.setDate(d.getDate() + dias);
  return toISO(d);
}

export function addMonths(iso: string, meses: number): string {
  const d = parseISO(iso);
  d.setMonth(d.getMonth() + meses);
  return toISO(d);
}

export function diffDays(de: string, ate: string): number {
  const ms = parseISO(ate).getTime() - parseISO(de).getTime();
  return Math.round(ms / 86_400_000);
}

export function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

export function firstDayOfMonth(iso: string): string {
  return `${iso.slice(0, 7)}-01`;
}

export function lastDayOfMonth(iso: string): string {
  const d = parseISO(iso);
  return toISO(new Date(d.getFullYear(), d.getMonth() + 1, 0));
}

/** Encurta preservando o começo — cortar por palavras faria "Grupo X" e "Grupo X Sul" virarem o mesmo rótulo. */
export function truncar(texto: string, limite = 20): string {
  return texto.length <= limite ? texto : `${texto.slice(0, limite - 1).trimEnd()}…`;
}

export function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/);
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return `${partes[0][0]}${partes[partes.length - 1][0]}`.toUpperCase();
}
