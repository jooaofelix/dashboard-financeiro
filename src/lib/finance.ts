import {
  addDays,
  addMonths,
  diffDays,
  firstDayOfMonth,
  lastDayOfMonth,
  monthKey,
  todayISO,
} from "./format";
import { dentroDoPeriodo, duracaoEmMeses, mesesDoPeriodo, Periodo } from "./periodo";
import { alvoDoMes, avaliarPlano, planoDaConfig } from "./plano";
import {
  Atendimento,
  BaseDados,
  Cliente,
  Configuracao,
  Profissional,
  Servico,
  Transacao,
} from "./types";

/* -------------------------------------------------------------------------- */
/* Primitivas                                                                  */
/* -------------------------------------------------------------------------- */

export function valorLiquido(a: Atendimento): number {
  return Math.max(0, a.valor - (a.desconto ?? 0));
}

export function estaEmAberto(a: Atendimento): boolean {
  return a.status === "pendente" || a.status === "atrasado";
}

/** Um pendente cujo vencimento já passou é, na prática, inadimplência. */
export function estaAtrasado(a: Atendimento, hoje = todayISO()): boolean {
  if (a.status === "atrasado") return true;
  return a.status === "pendente" && a.vencimento < hoje;
}

/** Data em que o dinheiro efetivamente entrou/saiu (regime de caixa). */
function dataCaixaAtendimento(a: Atendimento): string | undefined {
  if (a.status !== "pago") return undefined;
  return a.pagoEm ?? a.vencimento ?? a.data;
}

function dataCaixaTransacao(t: Transacao): string | undefined {
  if (!t.pago) return undefined;
  return t.pagoEm ?? t.vencimento ?? t.data;
}

/**
 * Saldo em aberto *naquela data*, não hoje. Comparar o "a receber" de dois
 * períodos usando o status atual seria injusto: tudo que já foi cobrado desde
 * então some do período antigo e a variação vira ficção.
 */
export function emAbertoEm(a: Atendimento, data: string): boolean {
  if (a.status === "cancelado") return false;
  if (a.data > data) return false;
  const recebidoEm = dataCaixaAtendimento(a);
  return recebidoEm === undefined || recebidoEm > data;
}

function soma<T>(itens: T[], fn: (item: T) => number): number {
  return itens.reduce((total, item) => total + fn(item), 0);
}

/** Variação percentual entre dois períodos. `null` quando não há base de comparação. */
export function variacao(atual: number, anterior: number): number | null {
  if (!Number.isFinite(anterior) || anterior === 0) return null;
  return ((atual - anterior) / Math.abs(anterior)) * 100;
}

function divisao(numerador: number, denominador: number): number {
  return denominador === 0 ? 0 : numerador / denominador;
}

/** Texto dos alertas — eles são strings prontas, não componentes. */
function moeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/* -------------------------------------------------------------------------- */
/* Resumo executivo                                                            */
/* -------------------------------------------------------------------------- */

export interface ResumoFinanceiro {
  /** Regime de competência: o que foi faturado no período. */
  faturamento: number;
  outrasReceitas: number;
  receitaTotal: number;
  /** Regime de caixa: o que entrou de fato. */
  recebido: number;
  pagoNoPeriodo: number;
  /** Saldo em aberto ao final do período (não é um fluxo, é um estoque). */
  aReceber: number;
  emAtraso: number;
  inadimplenciaPercent: number;
  custosDiretos: number;
  despesasFixas: number;
  despesasVariaveis: number;
  despesasTotais: number;
  impostos: number;
  margemContribuicao: number;
  margemContribuicaoPercent: number;
  lucroLiquido: number;
  margemLiquidaPercent: number;
  pontoEquilibrio: number;
  saldoCaixa: number;
  runwayMeses: number | null;
  qtdAtendimentos: number;
  ticketMedio: number;
  clientesAtivos: number;
  novosClientes: number;
  receitaRecorrenteMensal: number;
  receitaPorCliente: number;
}

export function calcularResumo(
  base: BaseDados,
  config: Configuracao,
  periodo: Periodo,
  hoje = todayISO()
): ResumoFinanceiro {
  const servicoPorId = new Map(base.servicos.map((s) => [s.id, s]));

  const atendimentosCompetencia = base.atendimentos.filter(
    (a) => a.status !== "cancelado" && dentroDoPeriodo(a.data, periodo)
  );

  const faturamento = soma(atendimentosCompetencia, valorLiquido);

  const outrasReceitas = soma(
    base.transacoes.filter((t) => t.tipo === "receita" && dentroDoPeriodo(t.data, periodo)),
    (t) => t.valor
  );

  const receitaTotal = faturamento + outrasReceitas;

  const recebido =
    soma(
      base.atendimentos.filter((a) => dentroDoPeriodo(dataCaixaAtendimento(a), periodo)),
      valorLiquido
    ) +
    soma(
      base.transacoes.filter(
        (t) => t.tipo === "receita" && dentroDoPeriodo(dataCaixaTransacao(t), periodo)
      ),
      (t) => t.valor
    );

  const pagoNoPeriodo = soma(
    base.transacoes.filter(
      (t) => t.tipo === "despesa" && dentroDoPeriodo(dataCaixaTransacao(t), periodo)
    ),
    (t) => t.valor
  );

  // Estoque de recebíveis na data de corte do período (nunca no futuro).
  const corte = periodo.fim < hoje ? periodo.fim : hoje;
  const emAbertoNoCorte = base.atendimentos.filter((a) => emAbertoEm(a, corte));
  const aReceber = soma(emAbertoNoCorte, valorLiquido);
  const emAtraso = soma(
    emAbertoNoCorte.filter((a) => a.vencimento < corte),
    valorLiquido
  );

  const custosDiretos = soma(atendimentosCompetencia, (a) => {
    const servico = a.servicoId ? servicoPorId.get(a.servicoId) : undefined;
    return servico?.custoDireto ?? 0;
  });

  const despesasPeriodo = base.transacoes.filter(
    (t) => t.tipo === "despesa" && dentroDoPeriodo(t.data, periodo)
  );
  const despesasFixas = soma(
    despesasPeriodo.filter((t) => t.natureza === "fixo"),
    (t) => t.valor
  );
  const despesasVariaveis = soma(
    despesasPeriodo.filter((t) => t.natureza !== "fixo"),
    (t) => t.valor
  );
  const despesasTotais = despesasFixas + despesasVariaveis;

  const impostos = receitaTotal * (config.aliquotaImpostos / 100);

  const custosVariaveisTotais = custosDiretos + despesasVariaveis + impostos;
  const margemContribuicao = receitaTotal - custosVariaveisTotais;
  const margemContribuicaoPercent = divisao(margemContribuicao, receitaTotal) * 100;

  const lucroLiquido = receitaTotal - custosDiretos - despesasTotais - impostos;
  const margemLiquidaPercent = divisao(lucroLiquido, receitaTotal) * 100;

  /** Faturamento mínimo que paga a estrutura fixa. */
  const pontoEquilibrio =
    margemContribuicaoPercent > 0 ? despesasFixas / (margemContribuicaoPercent / 100) : 0;

  const saldoCaixa = calcularSaldoCaixa(base, config, periodo.fim);

  const meses = duracaoEmMeses(periodo);
  const queimaMensal = divisao(despesasTotais + custosDiretos + impostos, meses);
  const runwayMeses = queimaMensal > 0 ? saldoCaixa / queimaMensal : null;

  const clientesAtivos = new Set(atendimentosCompetencia.map((a) => a.clienteId)).size;
  const novosClientes = base.clientes.filter((c) => dentroDoPeriodo(c.desde, periodo)).length;

  const ultimoMes = mesesDoPeriodo(periodo).at(-1) ?? monthKey(periodo.fim);
  const receitaRecorrenteMensal = soma(
    base.atendimentos.filter(
      (a) =>
        a.status !== "cancelado" &&
        a.recorrencia === "mensal" &&
        monthKey(a.data) === ultimoMes
    ),
    valorLiquido
  );

  return {
    faturamento,
    outrasReceitas,
    receitaTotal,
    recebido,
    pagoNoPeriodo,
    aReceber,
    emAtraso,
    inadimplenciaPercent: divisao(emAtraso, faturamento) * 100,
    custosDiretos,
    despesasFixas,
    despesasVariaveis,
    despesasTotais,
    impostos,
    margemContribuicao,
    margemContribuicaoPercent,
    lucroLiquido,
    margemLiquidaPercent,
    pontoEquilibrio,
    saldoCaixa,
    runwayMeses,
    qtdAtendimentos: atendimentosCompetencia.length,
    ticketMedio: divisao(faturamento, atendimentosCompetencia.length),
    clientesAtivos,
    novosClientes,
    receitaRecorrenteMensal,
    receitaPorCliente: divisao(faturamento, clientesAtivos),
  };
}

/** Caixa acumulado desde o início da operação até uma data. */
export function calcularSaldoCaixa(
  base: BaseDados,
  config: Configuracao,
  ate: string
): number {
  const entradas =
    soma(
      base.atendimentos.filter((a) => {
        const d = dataCaixaAtendimento(a);
        return d !== undefined && d <= ate;
      }),
      valorLiquido
    ) +
    soma(
      base.transacoes.filter((t) => {
        const d = dataCaixaTransacao(t);
        return t.tipo === "receita" && d !== undefined && d <= ate;
      }),
      (t) => t.valor
    );

  const saidas = soma(
    base.transacoes.filter((t) => {
      const d = dataCaixaTransacao(t);
      return t.tipo === "despesa" && d !== undefined && d <= ate;
    }),
    (t) => t.valor
  );

  return config.saldoInicialCaixa + entradas - saidas;
}

/* -------------------------------------------------------------------------- */
/* Séries temporais                                                            */
/* -------------------------------------------------------------------------- */

export interface PontoMensal {
  chave: string;
  receita: number;
  despesa: number;
  lucro: number;
  recebido: number;
  atendimentos: number;
}

export function serieMensal(
  base: BaseDados,
  config: Configuracao,
  periodo: Periodo
): PontoMensal[] {
  const servicoPorId = new Map(base.servicos.map((s) => [s.id, s]));
  const chaves = mesesDoPeriodo(periodo);
  const pontos = new Map<string, PontoMensal>(
    chaves.map((chave) => [
      chave,
      { chave, receita: 0, despesa: 0, lucro: 0, recebido: 0, atendimentos: 0 },
    ])
  );

  for (const a of base.atendimentos) {
    if (a.status === "cancelado") continue;
    const ponto = pontos.get(monthKey(a.data));
    if (ponto) {
      ponto.receita += valorLiquido(a);
      ponto.atendimentos += 1;
      const servico = a.servicoId ? servicoPorId.get(a.servicoId) : undefined;
      ponto.despesa += servico?.custoDireto ?? 0;
    }
    const dataCaixa = dataCaixaAtendimento(a);
    if (dataCaixa) {
      const pontoCaixa = pontos.get(monthKey(dataCaixa));
      if (pontoCaixa) pontoCaixa.recebido += valorLiquido(a);
    }
  }

  for (const t of base.transacoes) {
    const ponto = pontos.get(monthKey(t.data));
    if (ponto) {
      if (t.tipo === "receita") ponto.receita += t.valor;
      else ponto.despesa += t.valor;
    }
    if (t.tipo === "receita") {
      const dataCaixa = dataCaixaTransacao(t);
      if (dataCaixa) {
        const pontoCaixa = pontos.get(monthKey(dataCaixa));
        if (pontoCaixa) pontoCaixa.recebido += t.valor;
      }
    }
  }

  const lista = [...pontos.values()];
  for (const ponto of lista) {
    const impostos = ponto.receita * (config.aliquotaImpostos / 100);
    ponto.despesa += impostos;
    ponto.lucro = ponto.receita - ponto.despesa;
  }
  return lista;
}

/* -------------------------------------------------------------------------- */
/* DRE gerencial                                                               */
/* -------------------------------------------------------------------------- */

export interface LinhaDRE {
  rotulo: string;
  valor: number;
  /** `total` fecha um bloco; `deducao` é subtraído; `detalhe` é informativo. */
  tipo: "receita" | "deducao" | "total" | "detalhe";
  /** Percentual sobre a receita líquida. */
  percentual: number;
  destaque?: boolean;
}

export function montarDRE(
  base: BaseDados,
  config: Configuracao,
  periodo: Periodo
): LinhaDRE[] {
  const r = calcularResumo(base, config, periodo);
  const receitaBruta = r.receitaTotal;
  const pct = (valor: number) => divisao(valor, receitaBruta) * 100;

  const despesasPorCat = agruparDespesasPorCategoria(base, periodo);

  const linhas: LinhaDRE[] = [
    { rotulo: "Receita de serviços", valor: r.faturamento, tipo: "receita", percentual: pct(r.faturamento) },
    { rotulo: "Outras receitas", valor: r.outrasReceitas, tipo: "receita", percentual: pct(r.outrasReceitas) },
    { rotulo: "Receita bruta", valor: receitaBruta, tipo: "total", percentual: 100, destaque: true },
    { rotulo: "(–) Impostos sobre a receita", valor: -r.impostos, tipo: "deducao", percentual: -pct(r.impostos) },
    {
      rotulo: "Receita líquida",
      valor: receitaBruta - r.impostos,
      tipo: "total",
      percentual: pct(receitaBruta - r.impostos),
    },
    { rotulo: "(–) Custos diretos dos serviços", valor: -r.custosDiretos, tipo: "deducao", percentual: -pct(r.custosDiretos) },
    { rotulo: "(–) Despesas variáveis", valor: -r.despesasVariaveis, tipo: "deducao", percentual: -pct(r.despesasVariaveis) },
    {
      rotulo: "Margem de contribuição",
      valor: r.margemContribuicao,
      tipo: "total",
      percentual: r.margemContribuicaoPercent,
      destaque: true,
    },
    { rotulo: "(–) Despesas fixas", valor: -r.despesasFixas, tipo: "deducao", percentual: -pct(r.despesasFixas) },
  ];

  for (const item of despesasPorCat.filter((c) => c.fixo > 0)) {
    linhas.push({
      rotulo: `    ${item.categoria}`,
      valor: -item.fixo,
      tipo: "detalhe",
      percentual: -pct(item.fixo),
    });
  }

  linhas.push({
    rotulo: "Resultado líquido do período",
    valor: r.lucroLiquido,
    tipo: "total",
    percentual: r.margemLiquidaPercent,
    destaque: true,
  });

  return linhas;
}

/* -------------------------------------------------------------------------- */
/* Aging de recebíveis                                                         */
/* -------------------------------------------------------------------------- */

export interface FaixaAging {
  faixa: string;
  valor: number;
  quantidade: number;
  /** Índice do degrau na rampa ordinal (0 = mais recente). */
  nivel: number;
}

const FAIXAS_AGING = [
  { faixa: "A vencer", limite: 0 },
  { faixa: "1–15 dias", limite: 15 },
  { faixa: "16–30 dias", limite: 30 },
  { faixa: "31–60 dias", limite: 60 },
  { faixa: "60+ dias", limite: Infinity },
];

/**
 * A barra que o mês precisa vencer.
 *
 * Com um plano em curso, a barra é o alvo da rampa — cobrar hoje a meta do fim
 * do prazo transformaria todo mês em fracasso e faria o plano perder o sentido.
 * Sem plano, vale a meta mensal fixa.
 */
export function metaDoMes(config: Configuracao, mes: string): number {
  const plano = planoDaConfig(config);
  return plano ? alvoDoMes(plano, mes) : config.metaReceitaMensal;
}

/** A mesma barra somada mês a mês ao longo de um período de vários meses. */
export function metaDoPeriodo(config: Configuracao, periodo: Periodo): number {
  return mesesDoPeriodo(periodo).reduce((soma, mes) => soma + metaDoMes(config, mes), 0);
}

/**
 * Faturamento de competência de **todos** os meses com movimento, sem recorte
 * de período.
 *
 * O plano de crescimento não pode depender do filtro de período da tela: o alvo
 * do mês corrente é o mesmo esteja o usuário olhando 30 dias ou 12 meses.
 */
export function faturamentoPorMes(base: BaseDados): Map<string, number> {
  const meses = new Map<string, number>();
  const somar = (chave: string, valor: number) =>
    meses.set(chave, (meses.get(chave) ?? 0) + valor);

  for (const a of base.atendimentos) {
    if (a.status === "cancelado") continue;
    somar(monthKey(a.data), valorLiquido(a));
  }
  for (const t of base.transacoes) {
    if (t.tipo === "receita") somar(monthKey(t.data), t.valor);
  }
  return meses;
}

export function agingRecebiveis(base: BaseDados, hoje = todayISO()): FaixaAging[] {
  const buckets = FAIXAS_AGING.map((f, nivel) => ({
    faixa: f.faixa,
    valor: 0,
    quantidade: 0,
    nivel,
  }));

  for (const a of base.atendimentos) {
    if (!estaEmAberto(a)) continue;
    const diasVencido = diffDays(a.vencimento, hoje);
    let indice = 0;
    if (diasVencido > 0) {
      indice = FAIXAS_AGING.findIndex((f, i) => i > 0 && diasVencido <= f.limite);
      if (indice === -1) indice = FAIXAS_AGING.length - 1;
    }
    buckets[indice].valor += valorLiquido(a);
    buckets[indice].quantidade += 1;
  }

  return buckets;
}

/* -------------------------------------------------------------------------- */
/* Fluxo de caixa projetado                                                    */
/* -------------------------------------------------------------------------- */

export interface PontoFluxo {
  data: string;
  entradas: number;
  saidas: number;
  saldo: number;
  projetado: boolean;
}

/**
 * Projeta o caixa dia a dia: parte do saldo de hoje, aplica tudo que está em
 * aberto pelo vencimento e repete os lançamentos recorrentes nos meses à frente.
 * Vencidos entram no primeiro dia — são caixa que ainda não aconteceu.
 */
export function fluxoCaixaProjetado(
  base: BaseDados,
  config: Configuracao,
  dias = 90,
  hoje = todayISO()
): PontoFluxo[] {
  const fim = addDays(hoje, dias);
  const movimentos = new Map<string, { entradas: number; saidas: number }>();

  const registrar = (data: string, entradas: number, saidas: number) => {
    const chave = data < hoje ? hoje : data;
    if (chave > fim) return;
    const atual = movimentos.get(chave) ?? { entradas: 0, saidas: 0 };
    atual.entradas += entradas;
    atual.saidas += saidas;
    movimentos.set(chave, atual);
  };

  for (const a of base.atendimentos) {
    if (!estaEmAberto(a)) continue;
    registrar(a.vencimento, valorLiquido(a), 0);
  }

  for (const t of base.transacoes) {
    if (t.pago) continue;
    if (t.tipo === "receita") registrar(t.vencimento, t.valor, 0);
    else registrar(t.vencimento, 0, t.valor);
  }

  // Recorrências: repete o lançamento mais recente de cada série nos meses à frente.
  const recorrentes = new Map<string, Transacao>();
  for (const t of base.transacoes) {
    if (!t.recorrente) continue;
    const anterior = recorrentes.get(t.descricao);
    if (!anterior || t.data > anterior.data) recorrentes.set(t.descricao, t);
  }
  const mesesAFrente = Math.ceil(dias / 30) + 1;
  for (const t of recorrentes.values()) {
    for (let i = 1; i <= mesesAFrente; i++) {
      const data = addMonths(t.vencimento, i);
      if (data <= hoje || data > fim) continue;
      if (t.tipo === "receita") registrar(data, t.valor, 0);
      else registrar(data, 0, t.valor);
    }
  }

  const recorrentesReceita = base.atendimentos.filter(
    (a) => a.recorrencia === "mensal" && a.status !== "cancelado"
  );
  const porCliente = new Map<string, Atendimento>();
  for (const a of recorrentesReceita) {
    const anterior = porCliente.get(`${a.clienteId}:${a.servicoId ?? ""}`);
    if (!anterior || a.data > anterior.data) {
      porCliente.set(`${a.clienteId}:${a.servicoId ?? ""}`, a);
    }
  }
  for (const a of porCliente.values()) {
    for (let i = 1; i <= mesesAFrente; i++) {
      const data = addMonths(a.vencimento, i);
      if (data <= hoje || data > fim) continue;
      registrar(data, valorLiquido(a), 0);
    }
  }

  let saldo = calcularSaldoCaixa(base, config, hoje);
  const pontos: PontoFluxo[] = [];
  for (let cursor = hoje; cursor <= fim; cursor = addDays(cursor, 1)) {
    const mov = movimentos.get(cursor) ?? { entradas: 0, saidas: 0 };
    saldo += mov.entradas - mov.saidas;
    pontos.push({
      data: cursor,
      entradas: mov.entradas,
      saidas: mov.saidas,
      saldo,
      projetado: cursor > hoje,
    });
  }
  return pontos;
}

/** Agrupa a projeção em semanas — a leitura útil para decidir pagamentos. */
export interface SemanaFluxo {
  inicio: string;
  fim: string;
  rotulo: string;
  entradas: number;
  saidas: number;
  saldoFinal: number;
}

export function fluxoPorSemana(pontos: PontoFluxo[]): SemanaFluxo[] {
  const semanas: SemanaFluxo[] = [];
  for (let i = 0; i < pontos.length; i += 7) {
    const bloco = pontos.slice(i, i + 7);
    if (bloco.length === 0) continue;
    semanas.push({
      inicio: bloco[0].data,
      fim: bloco[bloco.length - 1].data,
      rotulo: `S${semanas.length + 1}`,
      entradas: soma(bloco, (p) => p.entradas),
      saidas: soma(bloco, (p) => p.saidas),
      saldoFinal: bloco[bloco.length - 1].saldo,
    });
  }
  return semanas;
}

/* -------------------------------------------------------------------------- */
/* Rankings e agrupamentos                                                     */
/* -------------------------------------------------------------------------- */

export interface RankingCliente {
  cliente: Cliente;
  faturado: number;
  emAberto: number;
  atrasado: number;
  atendimentos: number;
  ticketMedio: number;
  ultimoAtendimento?: string;
}

export function rankingClientes(
  base: BaseDados,
  periodo: Periodo,
  hoje = todayISO()
): RankingCliente[] {
  const mapa = new Map<string, RankingCliente>();
  for (const cliente of base.clientes) {
    mapa.set(cliente.id, {
      cliente,
      faturado: 0,
      emAberto: 0,
      atrasado: 0,
      atendimentos: 0,
      ticketMedio: 0,
    });
  }

  for (const a of base.atendimentos) {
    const linha = mapa.get(a.clienteId);
    if (!linha || a.status === "cancelado") continue;
    if (dentroDoPeriodo(a.data, periodo)) {
      linha.faturado += valorLiquido(a);
      linha.atendimentos += 1;
    }
    if (estaEmAberto(a)) {
      linha.emAberto += valorLiquido(a);
      if (estaAtrasado(a, hoje)) linha.atrasado += valorLiquido(a);
    }
    if (!linha.ultimoAtendimento || a.data > linha.ultimoAtendimento) {
      linha.ultimoAtendimento = a.data;
    }
  }

  return [...mapa.values()]
    .map((linha) => ({
      ...linha,
      ticketMedio: divisao(linha.faturado, linha.atendimentos),
    }))
    .sort((a, b) => b.faturado - a.faturado);
}

export interface RankingServico {
  servico: Servico;
  faturado: number;
  quantidade: number;
  custoTotal: number;
  margem: number;
  margemPercent: number;
}

export function rankingServicos(base: BaseDados, periodo: Periodo): RankingServico[] {
  const mapa = new Map<string, RankingServico>();
  for (const servico of base.servicos) {
    mapa.set(servico.id, {
      servico,
      faturado: 0,
      quantidade: 0,
      custoTotal: 0,
      margem: 0,
      margemPercent: 0,
    });
  }

  for (const a of base.atendimentos) {
    if (a.status === "cancelado" || !a.servicoId) continue;
    if (!dentroDoPeriodo(a.data, periodo)) continue;
    const linha = mapa.get(a.servicoId);
    if (!linha) continue;
    linha.faturado += valorLiquido(a);
    linha.quantidade += 1;
    linha.custoTotal += linha.servico.custoDireto;
  }

  return [...mapa.values()]
    .filter((linha) => linha.quantidade > 0)
    .map((linha) => ({
      ...linha,
      margem: linha.faturado - linha.custoTotal,
      margemPercent: divisao(linha.faturado - linha.custoTotal, linha.faturado) * 100,
    }))
    .sort((a, b) => b.faturado - a.faturado);
}

export interface GrupoDespesa {
  categoria: string;
  total: number;
  fixo: number;
  variavel: number;
}

export function agruparDespesasPorCategoria(
  base: BaseDados,
  periodo: Periodo
): GrupoDespesa[] {
  const mapa = new Map<string, GrupoDespesa>();
  for (const t of base.transacoes) {
    if (t.tipo !== "despesa" || !dentroDoPeriodo(t.data, periodo)) continue;
    const grupo = mapa.get(t.categoria) ?? {
      categoria: t.categoria,
      total: 0,
      fixo: 0,
      variavel: 0,
    };
    grupo.total += t.valor;
    if (t.natureza === "fixo") grupo.fixo += t.valor;
    else grupo.variavel += t.valor;
    mapa.set(t.categoria, grupo);
  }
  return [...mapa.values()].sort((a, b) => b.total - a.total);
}

export function agruparDespesasPorCentroCusto(
  base: BaseDados,
  periodo: Periodo
): { centroCusto: string; total: number }[] {
  const mapa = new Map<string, number>();
  for (const t of base.transacoes) {
    if (t.tipo !== "despesa" || !dentroDoPeriodo(t.data, periodo)) continue;
    const chave = t.centroCusto || "Não alocado";
    mapa.set(chave, (mapa.get(chave) ?? 0) + t.valor);
  }
  return [...mapa.entries()]
    .map(([centroCusto, total]) => ({ centroCusto, total }))
    .sort((a, b) => b.total - a.total);
}

export function receitaPorFormaPagamento(
  base: BaseDados,
  periodo: Periodo
): { forma: string; total: number }[] {
  const mapa = new Map<string, number>();
  for (const a of base.atendimentos) {
    if (a.status !== "pago" || !dentroDoPeriodo(a.data, periodo)) continue;
    const chave = a.formaPagamento || "Não informado";
    mapa.set(chave, (mapa.get(chave) ?? 0) + valorLiquido(a));
  }
  return [...mapa.entries()]
    .map(([forma, total]) => ({ forma, total }))
    .sort((a, b) => b.total - a.total);
}

/* -------------------------------------------------------------------------- */
/* Comissões                                                                   */
/* -------------------------------------------------------------------------- */

export interface LinhaComissao {
  profissional: Profissional;
  producao: number;
  atendimentos: number;
  comissao: number;
  comissaoSobreRecebido: number;
}

export function calcularComissoes(base: BaseDados, periodo: Periodo): LinhaComissao[] {
  const mapa = new Map<string, LinhaComissao>();
  for (const profissional of base.profissionais) {
    mapa.set(profissional.id, {
      profissional,
      producao: 0,
      atendimentos: 0,
      comissao: 0,
      comissaoSobreRecebido: 0,
    });
  }

  for (const a of base.atendimentos) {
    if (a.status === "cancelado" || !a.profissionalId) continue;
    if (!dentroDoPeriodo(a.data, periodo)) continue;
    const linha = mapa.get(a.profissionalId);
    if (!linha) continue;
    const liquido = valorLiquido(a);
    linha.producao += liquido;
    linha.atendimentos += 1;
    linha.comissao += liquido * (linha.profissional.comissaoPercent / 100);
    if (a.status === "pago") {
      linha.comissaoSobreRecebido += liquido * (linha.profissional.comissaoPercent / 100);
    }
  }

  return [...mapa.values()]
    .filter((linha) => linha.atendimentos > 0)
    .sort((a, b) => b.producao - a.producao);
}

/* -------------------------------------------------------------------------- */
/* Alertas                                                                     */
/* -------------------------------------------------------------------------- */

export type SeveridadeAlerta = "critical" | "warning" | "good";

export interface Alerta {
  id: string;
  severidade: SeveridadeAlerta;
  titulo: string;
  detalhe: string;
  href?: string;
}

export function gerarAlertas(
  base: BaseDados,
  config: Configuracao,
  hoje = todayISO()
): Alerta[] {
  const alertas: Alerta[] = [];
  const limite = addDays(hoje, config.diasAlertaVencimento);

  const contasVencidas = base.transacoes.filter(
    (t) => t.tipo === "despesa" && !t.pago && t.vencimento < hoje
  );
  if (contasVencidas.length > 0) {
    alertas.push({
      id: "contas-vencidas",
      severidade: "critical",
      titulo: `${contasVencidas.length} conta(s) a pagar vencida(s)`,
      detalhe: `Total de ${soma(contasVencidas, (t) => t.valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} em atraso com fornecedores.`,
      href: "/contas",
    });
  }

  const aVencer = base.transacoes.filter(
    (t) => t.tipo === "despesa" && !t.pago && t.vencimento >= hoje && t.vencimento <= limite
  );
  if (aVencer.length > 0) {
    alertas.push({
      id: "contas-a-vencer",
      severidade: "warning",
      titulo: `${aVencer.length} conta(s) vencem em ${config.diasAlertaVencimento} dias`,
      detalhe: `Reserve ${soma(aVencer, (t) => t.valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} de caixa para o período.`,
      href: "/contas",
    });
  }

  const recebiveisAtrasados = base.atendimentos.filter(
    (a) => estaEmAberto(a) && estaAtrasado(a, hoje)
  );
  if (recebiveisAtrasados.length > 0) {
    alertas.push({
      id: "recebiveis-atrasados",
      severidade: "critical",
      titulo: `${recebiveisAtrasados.length} recebimento(s) em atraso`,
      detalhe: `${soma(recebiveisAtrasados, valorLiquido).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} para cobrar. Priorize os mais antigos.`,
      href: "/receitas",
    });
  }

  const saldo = calcularSaldoCaixa(base, config, hoje);
  if (saldo < config.reservaMinimaCaixa) {
    alertas.push({
      id: "reserva-caixa",
      severidade: "critical",
      titulo: "Caixa abaixo da reserva mínima",
      detalhe: `Saldo de ${saldo.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} contra reserva de ${config.reservaMinimaCaixa.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}.`,
      href: "/fluxo-caixa",
    });
  }

  const mesAtual: Periodo = {
    inicio: firstDayOfMonth(hoje),
    fim: lastDayOfMonth(hoje),
    label: "Mês atual",
  };
  const resumoMes = calcularResumo(base, config, mesAtual, hoje);
  const alvoMes = metaDoMes(config, monthKey(hoje));
  const atingido = divisao(resumoMes.faturamento, alvoMes) * 100;
  const diaDoMes = Number(hoje.slice(8, 10));
  const diasNoMes = Number(lastDayOfMonth(hoje).slice(8, 10));
  const mesPercorrido = diaDoMes / diasNoMes;

  if (alvoMes > 0) {
    const esperado = mesPercorrido * 100;
    if (atingido >= 100) {
      alertas.push({
        id: "meta-atingida",
        severidade: "good",
        titulo: "Alvo do mês atingido",
        detalhe: `${atingido.toFixed(0)}% de ${moeda(alvoMes)} já faturados.`,
      });
    } else if (atingido < esperado - 15) {
      alertas.push({
        id: "meta-abaixo",
        severidade: "warning",
        titulo: "Faturamento abaixo do ritmo do mês",
        detalhe: `${atingido.toFixed(0)}% de ${moeda(alvoMes)} com ${diaDoMes}/${diasNoMes} do mês corrido.`,
      });
    }
  }

  /**
   * O mês fechado que ficou abaixo da rampa. Diferente do alerta acima, que
   * olha o mês em curso, este é um veredito definitivo: o mês acabou e o
   * marco não foi entregue — o que muda o esforço de todos os meses seguintes.
   */
  const plano = planoDaConfig(config);
  if (plano) {
    const mesPassado = monthKey(addMonths(firstDayOfMonth(hoje), -1));
    const dentroDoPlano = mesPassado >= plano.inicio;
    if (dentroDoPlano) {
      const diagnostico = avaliarPlano(plano, faturamentoPorMes(base), mesPassado);
      if (!diagnostico.noRitmo && diagnostico.mesesRestantes > 0) {
        alertas.push({
          id: "plano-fora-do-ritmo",
          severidade: "warning",
          titulo: "Mês fechado abaixo do plano",
          detalhe: `${moeda(diagnostico.realizadoMes)} contra alvo de ${moeda(
            diagnostico.alvoMes
          )}. Para fechar no prazo, agora são ${moeda(
            diagnostico.incrementoNecessario
          )} a mais por mês.`,
        });
      }
    }
  }

  // No começo do mês o custo fixo inteiro já está lançado e a receita mal
  // começou: todo mês nasceria "no vermelho". Só vale alertar depois da metade.
  if (mesPercorrido > 0.5 && resumoMes.margemLiquidaPercent < 0 && resumoMes.receitaTotal > 0) {
    alertas.push({
      id: "margem-negativa",
      severidade: "critical",
      titulo: "Resultado negativo no mês",
      detalhe: "As despesas do mês superaram a receita. Revise custos fixos e inadimplência.",
      href: "/relatorios",
    });
  }

  return alertas;
}
