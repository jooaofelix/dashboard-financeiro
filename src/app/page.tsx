"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  LabelList,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  CheckCircle2,
  CircleDollarSign,
  Info,
  PiggyBank,
  Receipt,
  Target,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { useBase, useData } from "@/lib/data-context";
import { usePeriodo } from "@/lib/periodo-context";
import KpiCard from "@/components/KpiCard";
import PainelPlano from "@/components/PainelPlano";
import { Panel } from "@/components/ui";
import { planoDaConfig } from "@/lib/plano";
import {
  ChartCard,
  ChartTooltip,
  Legenda,
  SemDados,
  eixoX,
  eixoY,
  gradeProps,
} from "@/components/charts";
import {
  agingRecebiveis,
  agruparDespesasPorCategoria,
  calcularResumo,
  gerarAlertas,
  rankingClientes,
  serieMensal,
  variacao,
} from "@/lib/finance";
import {
  formatCompact,
  formatCurrency,
  formatMonthKey,
  formatMonthLong,
  formatNumber,
  formatPercent,
  truncar,
} from "@/lib/format";

const CORES_ORDINAIS = [
  "var(--ordinal-1)",
  "var(--ordinal-2)",
  "var(--ordinal-3)",
  "var(--ordinal-4)",
  "var(--ordinal-5)",
];

const CORES_SERIES = [
  "var(--series-1)",
  "var(--series-2)",
  "var(--series-3)",
  "var(--series-4)",
  "var(--series-5)",
  "var(--series-6)",
];

export default function DashboardPage() {
  const base = useBase();
  const { config, segmento } = useData();
  const { periodo, anterior } = usePeriodo();

  const resumo = useMemo(
    () => calcularResumo(base, config, periodo),
    [base, config, periodo]
  );
  const resumoAnterior = useMemo(
    () => calcularResumo(base, config, anterior),
    [base, config, anterior]
  );
  const serie = useMemo(
    () => serieMensal(base, config, periodo),
    [base, config, periodo]
  );
  const aging = useMemo(() => agingRecebiveis(base), [base]);
  const alertas = useMemo(() => gerarAlertas(base, config), [base, config]);
  const topClientes = useMemo(
    () => rankingClientes(base, periodo).filter((l) => l.faturado > 0).slice(0, 6),
    [base, periodo]
  );

  const despesas = useMemo(() => {
    const grupos = agruparDespesasPorCategoria(base, periodo);
    // Uma rosca só é legível até ~6 fatias; o resto vira "Outros".
    if (grupos.length <= 6) return grupos.map((g) => ({ nome: g.categoria, valor: g.total }));
    const principais = grupos.slice(0, 5).map((g) => ({ nome: g.categoria, valor: g.total }));
    const resto = grupos.slice(5).reduce((soma, g) => soma + g.total, 0);
    return [...principais, { nome: "Outros", valor: resto }];
  }, [base, periodo]);

  const totalDespesas = despesas.reduce((soma, d) => soma + d.valor, 0);
  const sparkReceita = serie.map((p) => p.receita);

  const mesesNoPeriodo = Math.max(1, serie.length);
  const metaPeriodo = config.metaReceitaMensal * mesesNoPeriodo;
  const progressoMeta = metaPeriodo > 0 ? (resumo.faturamento / metaPeriodo) * 100 : 0;

  const plano = useMemo(() => planoDaConfig(config), [config]);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-ink">Visão geral</h1>
          <p className="mt-0.5 text-sm text-ink-3">
            {periodo.label} · {formatMonthLong(periodo.inicio.slice(0, 7))}
            {serie.length > 1 && ` a ${formatMonthLong(periodo.fim.slice(0, 7))}`}
          </p>
        </div>
        <Link
          href="/relatorios"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:underline"
        >
          Ver relatórios completos
          <ArrowRight size={15} aria-hidden />
        </Link>
      </header>

      {alertas.length > 0 && <ListaAlertas alertas={alertas} />}

      <section aria-label="Indicadores principais" className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="Faturamento no período"
            value={formatCurrency(resumo.faturamento)}
            icon={CircleDollarSign}
            delta={variacao(resumo.faturamento, resumoAnterior.faturamento)}
            hint={`${formatNumber(resumo.qtdAtendimentos)} ${segmento.labels.atendimentos.toLowerCase()}`}
            spark={sparkReceita}
            destaque
          />
          <KpiCard
            label="Recebido (caixa)"
            value={formatCurrency(resumo.recebido)}
            icon={Banknote}
            delta={variacao(resumo.recebido, resumoAnterior.recebido)}
            hint={`${formatPercent(
              resumo.faturamento > 0 ? (resumo.recebido / resumo.faturamento) * 100 : 0,
              0
            )} do faturado`}
          />
          <KpiCard
            label="Despesas no período"
            value={formatCurrency(resumo.despesasTotais + resumo.custosDiretos)}
            icon={TrendingDown}
            delta={variacao(
              resumo.despesasTotais + resumo.custosDiretos,
              resumoAnterior.despesasTotais + resumoAnterior.custosDiretos
            )}
            altaEBoa={false}
            hint={`${formatCurrency(resumo.despesasFixas)} fixas`}
          />
          <KpiCard
            label="Resultado líquido"
            value={formatCurrency(resumo.lucroLiquido)}
            icon={resumo.lucroLiquido >= 0 ? TrendingUp : TrendingDown}
            delta={variacao(resumo.lucroLiquido, resumoAnterior.lucroLiquido)}
            hint={`margem ${formatPercent(resumo.margemLiquidaPercent, 1)}`}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="A receber em aberto"
            value={formatCurrency(resumo.aReceber)}
            icon={Receipt}
            hint={
              resumo.emAtraso > 0
                ? `${formatCurrency(resumo.emAtraso)} vencidos`
                : "nada vencido"
            }
          />
          <KpiCard
            label="Inadimplência"
            value={formatPercent(resumo.inadimplenciaPercent, 1)}
            icon={AlertTriangle}
            altaEBoa={false}
            delta={variacao(resumo.inadimplenciaPercent, resumoAnterior.inadimplenciaPercent)}
            hint="sobre o faturado"
          />
          <KpiCard
            label="Ticket médio"
            value={formatCurrency(resumo.ticketMedio)}
            icon={Users}
            delta={variacao(resumo.ticketMedio, resumoAnterior.ticketMedio)}
            hint={`${formatNumber(resumo.clientesAtivos)} ${segmento.labels.clientes.toLowerCase()} ativos`}
          />
          <KpiCard
            label="Saldo em caixa"
            value={formatCurrency(resumo.saldoCaixa)}
            icon={Wallet}
            hint={
              resumo.runwayMeses !== null
                ? `${formatNumber(Math.max(0, resumo.runwayMeses), 1)} meses de folga`
                : undefined
            }
          />
        </div>
      </section>

      <MedidorMeta
        atual={resumo.faturamento}
        meta={metaPeriodo}
        progresso={progressoMeta}
        pontoEquilibrio={resumo.pontoEquilibrio}
        receitaRecorrente={resumo.receitaRecorrenteMensal}
      />

      {plano && (
        <PainelPlano
          plano={plano}
          base={base}
          ticketMedio={resumo.ticketMedio}
          rotuloAtendimentos={segmento.labels.atendimentos}
        />
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <ChartCard
          className="xl:col-span-2"
          titulo="Receita, despesa e resultado"
          descricao="Regime de competência, com impostos já aplicados na despesa."
          altura={300}
          legenda={
            <Legenda
              itens={[
                { cor: "var(--series-1)", label: "Receita" },
                { cor: "var(--series-2)", label: "Despesa total" },
                { cor: "var(--series-3)", label: "Resultado", tracejado: true },
              ]}
            />
          }
          tabela={{
            cabecalho: ["Mês", "Receita", "Despesa", "Resultado"],
            numericas: [1, 2, 3],
            linhas: serie.map((p) => [
              formatMonthKey(p.chave),
              formatCurrency(p.receita),
              formatCurrency(p.despesa),
              formatCurrency(p.lucro),
            ]),
          }}
        >
          {serie.length === 0 ? (
            <SemDados />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={serie} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
                <CartesianGrid {...gradeProps} />
                <XAxis dataKey="chave" tickFormatter={formatMonthKey} {...eixoX} />
                <YAxis tickFormatter={(v) => formatCompact(Number(v))} {...eixoY} />
                <Tooltip
                  cursor={{ fill: "var(--raised)" }}
                  content={
                    <ChartTooltip formatar={formatCurrency} formatarLabel={formatMonthKey} />
                  }
                />
                <Bar
                  dataKey="receita"
                  name="Receita"
                  fill="var(--series-1)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={24}
                />
                <Bar
                  dataKey="despesa"
                  name="Despesa total"
                  fill="var(--series-2)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={24}
                />
                <Line
                  dataKey="lucro"
                  name="Resultado"
                  type="monotone"
                  stroke="var(--series-3)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--surface)" }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard
          titulo="Para onde vai o dinheiro"
          descricao={`Despesas lançadas por categoria — ${formatCurrency(totalDespesas)} no período.`}
          altura={300}
          legenda={
            despesas.length > 0 ? (
              <Legenda
                itens={despesas.map((d, i) => ({
                  cor: CORES_SERIES[i % CORES_SERIES.length],
                  label: d.nome,
                }))}
              />
            ) : undefined
          }
          tabela={{
            cabecalho: ["Categoria", "Valor", "% do total"],
            numericas: [1, 2],
            linhas: despesas.map((d) => [
              d.nome,
              formatCurrency(d.valor),
              formatPercent(totalDespesas > 0 ? (d.valor / totalDespesas) * 100 : 0),
            ]),
          }}
        >
          {despesas.length === 0 ? (
            <SemDados mensagem="Nenhuma despesa lançada no período." />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={despesas}
                  dataKey="valor"
                  nameKey="nome"
                  innerRadius="58%"
                  outerRadius="86%"
                  paddingAngle={2}
                  stroke="none"
                >
                  {despesas.map((d, i) => (
                    <Cell key={d.nome} fill={CORES_SERIES[i % CORES_SERIES.length]} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip formatar={formatCurrency} />} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ChartCard
          titulo="Aging de recebíveis"
          descricao="Quanto tempo o dinheiro já está parado esperando entrar."
          altura={260}
          tabela={{
            cabecalho: ["Faixa", "Títulos", "Valor"],
            numericas: [1, 2],
            linhas: aging.map((f) => [f.faixa, formatNumber(f.quantidade), formatCurrency(f.valor)]),
          }}
        >
          {aging.every((f) => f.valor === 0) ? (
            <SemDados mensagem="Nada em aberto. Todos os recebimentos estão em dia." />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={aging}
                layout="vertical"
                margin={{ top: 4, right: 68, bottom: 4, left: 4 }}
              >
                <CartesianGrid {...gradeProps} horizontal={false} vertical />
                <XAxis type="number" tickFormatter={(v) => formatCompact(Number(v))} {...eixoX} />
                <YAxis type="category" dataKey="faixa" {...eixoY} width={86} />
                <Tooltip
                  cursor={{ fill: "var(--raised)" }}
                  content={<ChartTooltip formatar={formatCurrency} />}
                />
                <Bar dataKey="valor" name="Em aberto" radius={[0, 4, 4, 0]} maxBarSize={22}>
                  {aging.map((f) => (
                    <Cell key={f.faixa} fill={CORES_ORDINAIS[f.nivel]} />
                  ))}
                  <LabelList
                    dataKey="valor"
                    position="right"
                    formatter={(v) => (Number(v) > 0 ? formatCompact(Number(v)) : "")}
                    className="tabular"
                    fill="var(--ink-2)"
                    fontSize={11}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard
          titulo={`${segmento.labels.clientes} que mais faturam`}
          descricao="Concentração de receita no período — atenção se um só cliente domina."
          altura={260}
          tabela={{
            cabecalho: [segmento.labels.cliente, segmento.labels.atendimentos, "Faturado"],
            numericas: [1, 2],
            linhas: topClientes.map((l) => [
              l.cliente.nome,
              formatNumber(l.atendimentos),
              formatCurrency(l.faturado),
            ]),
          }}
        >
          {topClientes.length === 0 ? (
            <SemDados />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={topClientes.map((l) => ({
                  nome: truncar(l.cliente.nome, 22),
                  valor: l.faturado,
                }))}
                layout="vertical"
                margin={{ top: 4, right: 68, bottom: 4, left: 4 }}
              >
                <CartesianGrid {...gradeProps} horizontal={false} vertical />
                <XAxis type="number" tickFormatter={(v) => formatCompact(Number(v))} {...eixoX} />
                <YAxis type="category" dataKey="nome" {...eixoY} width={140} />
                <Tooltip
                  cursor={{ fill: "var(--raised)" }}
                  content={<ChartTooltip formatar={formatCurrency} />}
                />
                <Bar
                  dataKey="valor"
                  name="Faturado"
                  fill="var(--series-1)"
                  radius={[0, 4, 4, 0]}
                  maxBarSize={22}
                >
                  <LabelList
                    dataKey="valor"
                    position="right"
                    formatter={(v) => formatCompact(Number(v))}
                    className="tabular"
                    fill="var(--ink-2)"
                    fontSize={11}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function ListaAlertas({
  alertas,
}: {
  alertas: ReturnType<typeof gerarAlertas>;
}) {
  const estilos = {
    critical: { classe: "border-crit/25 bg-crit-soft text-crit-ink", icone: AlertTriangle },
    warning: { classe: "border-warn/30 bg-warn-soft text-warn-ink", icone: Info },
    good: { classe: "border-good/25 bg-good-soft text-good-ink", icone: CheckCircle2 },
  } as const;

  return (
    <section aria-label="Alertas" className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
      {alertas.map((alerta) => {
        const { classe, icone: Icone } = estilos[alerta.severidade];
        const conteudo = (
          <div className={`flex h-full items-start gap-2.5 rounded-xl border px-3.5 py-3 ${classe}`}>
            <Icone size={16} className="mt-0.5 shrink-0" aria-hidden />
            <div className="min-w-0">
              <p className="text-sm font-medium">{alerta.titulo}</p>
              <p className="mt-0.5 text-xs opacity-90">{alerta.detalhe}</p>
            </div>
            {alerta.href && <ArrowRight size={15} className="ml-auto mt-0.5 shrink-0" aria-hidden />}
          </div>
        );
        return alerta.href ? (
          <Link key={alerta.id} href={alerta.href} className="block">
            {conteudo}
          </Link>
        ) : (
          <div key={alerta.id}>{conteudo}</div>
        );
      })}
    </section>
  );
}

function MedidorMeta({
  atual,
  meta,
  progresso,
  pontoEquilibrio,
  receitaRecorrente,
}: {
  atual: number;
  meta: number;
  progresso: number;
  pontoEquilibrio: number;
  receitaRecorrente: number;
}) {
  const preenchido = Math.min(100, Math.max(0, progresso));
  const cor =
    progresso >= 95 ? "var(--good)" : progresso >= 70 ? "var(--warn)" : "var(--crit)";
  const marcaEquilibrio = meta > 0 ? Math.min(100, (pontoEquilibrio / meta) * 100) : 0;

  return (
    <Panel
      titulo="Meta de faturamento"
      descricao="Onde o período está em relação à meta e ao ponto de equilíbrio."
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-8">
        <div className="shrink-0">
          <p className="text-xs text-ink-3">Realizado</p>
          <p className="text-2xl font-semibold text-ink">{formatCurrency(atual)}</p>
          <p className="mt-0.5 text-xs text-ink-3">
            de {formatCurrency(meta)} · {formatPercent(progresso, 0)}
          </p>
        </div>

        <div className="min-w-0 flex-1">
          <div
            className="relative h-2.5 w-full overflow-hidden rounded-full"
            style={{ backgroundColor: `color-mix(in oklab, ${cor} 20%, var(--surface))` }}
            role="meter"
            aria-valuenow={Math.round(progresso)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Progresso da meta de faturamento"
          >
            <div
              className="h-full rounded-full transition-[width] duration-500"
              style={{ width: `${preenchido}%`, backgroundColor: cor }}
            />
            {marcaEquilibrio > 0 && marcaEquilibrio < 100 && (
              <span
                className="absolute top-0 h-full w-0.5 bg-[var(--ink-3)]"
                style={{ left: `${marcaEquilibrio}%` }}
                aria-hidden
              />
            )}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-ink-3">
            <span className="flex items-center gap-1.5">
              <Target size={12} aria-hidden />
              Meta {formatCurrency(meta)}
            </span>
            {pontoEquilibrio > 0 && (
              <span className="flex items-center gap-1.5">
                <span aria-hidden className="h-3 w-0.5 bg-[var(--ink-3)]" />
                Ponto de equilíbrio {formatCurrency(pontoEquilibrio)}
              </span>
            )}
            {receitaRecorrente > 0 && (
              <span className="flex items-center gap-1.5">
                <PiggyBank size={12} aria-hidden />
                Receita recorrente {formatCurrency(receitaRecorrente)}/mês
              </span>
            )}
          </div>
        </div>
      </div>
    </Panel>
  );
}
