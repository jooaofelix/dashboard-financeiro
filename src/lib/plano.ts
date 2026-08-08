/**
 * Plano de crescimento: sair de onde o negócio está hoje e chegar a um
 * faturamento-alvo dentro de um prazo.
 *
 * Uma meta solta ("quero faturar 80 mil") não orienta ninguém — ela não diz
 * quanto isso significa *neste mês*, nem quantos atendimentos são precisos para
 * chegar lá. O plano quebra a meta em marcos mensais e traduz cada marco em
 * esforço concreto, para que o painel possa dizer se o mês está no ritmo ou
 * fora dele.
 *
 * A rampa é **linear** (um incremento fixo por mês) de propósito. Uma curva
 * composta descreveria melhor um negócio maduro, mas é indefinida quando o
 * ponto de partida é zero — o caso de quem acabou de abrir a conta — e "some
 * R$ 1.700 por mês" é uma instrução que se executa; "cresça 3,2% ao mês" não.
 * O percentual equivalente continua disponível para exibição.
 */
import { addMonths, monthKey } from "./format";
import { Configuracao } from "./types";

export interface PlanoCrescimento {
  /** Faturamento mensal no momento em que o plano foi traçado. */
  faturamentoBase: number;
  /** Onde se quer chegar, por mês. */
  metaReceitaMensal: number;
  /** Em quantos meses. */
  horizonteMeses: number;
  /**
   * Primeiro mês em que a rampa vale (`AAAA-MM`) — ele **é** o marco 1, não o
   * mês anterior a ele. Quem traça o plano hoje já tem o mês corrente cobrado.
   */
  inicio: string;
}

export interface MarcoPlano {
  /** `AAAA-MM`. */
  chave: string;
  /** 1 para o primeiro mês do plano. */
  numero: number;
  /** Faturamento que este mês precisa entregar. */
  alvo: number;
}

export interface DiagnosticoPlano {
  /** Alvo do mês corrente segundo a rampa. */
  alvoMes: number;
  realizadoMes: number;
  /** Realizado − alvo. Negativo é atraso. */
  diferenca: number;
  /** Realizado sobre o alvo do mês, em %. */
  aderenciaPercent: number;
  noRitmo: boolean;
  mesesDecorridos: number;
  mesesRestantes: number;
  concluido: boolean;
  /**
   * Onde o negócio chega no fim do prazo mantendo o ritmo observado até aqui
   * (crescimento médio por mês desde a partida, projetado até o fim).
   */
  projecaoFinal: number;
  chegaNaMeta: boolean;
  /** Quanto somar por mês, a partir de agora, para ainda fechar no prazo. */
  incrementoNecessario: number;
}

export const HORIZONTES = [6, 12, 24] as const;

/**
 * Valores saem daqui **sem arredondamento**: arredondar o passo e depois
 * multiplicá-lo pelos meses fazia a rampa errar o destino (doze passos de
 * R$ 1.666,67 chegam a R$ 60.000,04, não à meta). Quem exibe é quem arredonda.
 */

/** Quanto o faturamento precisa subir a cada mês para vencer o prazo. */
export function incrementoMensal(plano: PlanoCrescimento): number {
  const { faturamentoBase, metaReceitaMensal, horizonteMeses } = plano;
  if (horizonteMeses <= 0) return 0;
  return (metaReceitaMensal - faturamentoBase) / horizonteMeses;
}

/**
 * O mesmo esforço expresso em percentual composto, só para leitura — é o número
 * que se compara com o mercado. Indefinido quando não há de onde crescer.
 */
export function crescimentoMensalPercent(plano: PlanoCrescimento): number | null {
  const { faturamentoBase, metaReceitaMensal, horizonteMeses } = plano;
  if (faturamentoBase <= 0 || metaReceitaMensal <= 0 || horizonteMeses <= 0) return null;
  return (Math.pow(metaReceitaMensal / faturamentoBase, 1 / horizonteMeses) - 1) * 100;
}

/** Um marco por mês, do primeiro mês do plano até o prazo final. */
export function trajetoria(plano: PlanoCrescimento): MarcoPlano[] {
  const marcos: MarcoPlano[] = [];
  for (let n = 1; n <= plano.horizonteMeses; n++) {
    marcos.push({
      chave: monthKey(addMonths(`${plano.inicio}-01`, n - 1)),
      numero: n,
      alvo: alvoDoMarco(plano, n),
    });
  }
  return marcos;
}

/** Número do marco a que um mês pertence: 1 no mês de partida, 0 antes dele. */
export function marcoDoMes(plano: PlanoCrescimento, mes: string): number {
  return Math.max(0, distanciaEmMeses(plano.inicio, mes) + 1);
}

/** Alvo do n-ésimo mês da rampa. O último é a meta, sem resíduo de ponto flutuante. */
function alvoDoMarco(plano: PlanoCrescimento, n: number): number {
  if (n <= 0) return plano.faturamentoBase;
  if (n >= plano.horizonteMeses) return plano.metaReceitaMensal;
  return plano.faturamentoBase + incrementoMensal(plano) * n;
}

/** Quantos meses separam dois meses `AAAA-MM` (negativo se `ate` for anterior). */
export function distanciaEmMeses(de: string, ate: string): number {
  const [anoDe, mesDe] = de.split("-").map(Number);
  const [anoAte, mesAte] = ate.split("-").map(Number);
  return (anoAte - anoDe) * 12 + (mesAte - mesDe);
}

/**
 * Alvo de um mês qualquer. Antes da partida vale a base; depois do prazo, a
 * meta — a rampa acabou, o patamar é para manter.
 */
export function alvoDoMes(plano: PlanoCrescimento, mes: string): number {
  return alvoDoMarco(plano, marcoDoMes(plano, mes));
}

/**
 * O que o alvo do mês significa em operação: quantos atendimentos, e a que
 * ritmo semanal. Sem ticket médio não há tradução possível.
 */
export function esforcoDoMes(
  alvoMensal: number,
  ticketMedio: number
): { atendimentos: number; porSemana: number } | null {
  if (ticketMedio <= 0 || alvoMensal <= 0) return null;
  const atendimentos = Math.ceil(alvoMensal / ticketMedio);
  return { atendimentos, porSemana: Math.ceil(atendimentos / 4.33) };
}

/**
 * Compara o plano com o que aconteceu de fato.
 *
 * `realizadoPorMes` traz o faturamento fechado de cada mês (`AAAA-MM`). O ritmo
 * observado sai da média de ganho por mês decorrido — não do último mês
 * isolado, que oscila demais para virar previsão.
 */
export function avaliarPlano(
  plano: PlanoCrescimento,
  realizadoPorMes: Map<string, number>,
  mesAtual: string
): DiagnosticoPlano {
  const marco = marcoDoMes(plano, mesAtual);
  const mesesDecorridos = Math.min(marco, plano.horizonteMeses);
  const mesesRestantes = Math.max(0, plano.horizonteMeses - marco);
  const alvoMes = alvoDoMes(plano, mesAtual);
  const realizadoMes = realizadoPorMes.get(mesAtual) ?? 0;
  const diferenca = realizadoMes - alvoMes;
  const aderenciaPercent = alvoMes > 0 ? (realizadoMes / alvoMes) * 100 : 0;

  // Ritmo médio desde a partida. Antes do primeiro mês do plano não há ritmo a
  // observar, e chutar um seria pior do que admitir que ainda não dá para saber.
  const ritmo =
    mesesDecorridos > 0 ? (realizadoMes - plano.faturamentoBase) / mesesDecorridos : 0;
  const projecaoFinal =
    mesesDecorridos > 0 ? realizadoMes + ritmo * mesesRestantes : realizadoMes;

  const incrementoNecessario =
    mesesRestantes > 0
      ? Math.max(0, plano.metaReceitaMensal - realizadoMes) / mesesRestantes
      : 0;

  return {
    alvoMes,
    realizadoMes,
    diferenca,
    aderenciaPercent,
    // Uma folga de 5% evita chamar de "fora do ritmo" quem fechou o mês a um
    // arredondamento do alvo.
    noRitmo: realizadoMes >= alvoMes * 0.95,
    mesesDecorridos,
    mesesRestantes,
    concluido: marco >= plano.horizonteMeses,
    projecaoFinal,
    chegaNaMeta: mesesDecorridos > 0 && projecaoFinal >= plano.metaReceitaMensal,
    incrementoNecessario,
  };
}

/** Nada de rampa quando não há meta, prazo ou avanço a fazer. */
export function planoValido(plano: PlanoCrescimento | null): plano is PlanoCrescimento {
  return (
    plano !== null &&
    plano.horizonteMeses > 0 &&
    plano.metaReceitaMensal > 0 &&
    /^\d{4}-\d{2}$/.test(plano.inicio)
  );
}

/**
 * Lê o plano da configuração do workspace. Devolve `null` para quem nunca
 * traçou um — a meta mensal sozinha continua valendo, só não vira trajetória.
 */
export function planoDaConfig(config: Configuracao): PlanoCrescimento | null {
  const plano: PlanoCrescimento = {
    faturamentoBase: config.faturamentoBase ?? 0,
    metaReceitaMensal: config.metaReceitaMensal,
    horizonteMeses: config.metaHorizonteMeses ?? 0,
    inicio: config.planoInicio ?? "",
  };
  return planoValido(plano) ? plano : null;
}
