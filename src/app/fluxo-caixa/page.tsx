"use client";

import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowDownRight, ArrowUpRight, ShieldAlert, Wallet } from "lucide-react";
import { useBase, useData } from "@/lib/data-context";
import KpiCard from "@/components/KpiCard";
import { Panel, Segmented, TableWrap, Td, Th } from "@/components/ui";
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
  calcularSaldoCaixa,
  estaEmAberto,
  fluxoCaixaProjetado,
  fluxoPorSemana,
  valorLiquido,
} from "@/lib/finance";
import {
  addDays,
  formatCompact,
  formatCurrency,
  formatDate,
  formatDateShort,
  todayISO,
} from "@/lib/format";

const HORIZONTES = [
  { id: "30", label: "30 dias" },
  { id: "60", label: "60 dias" },
  { id: "90", label: "90 dias" },
] as const;

type Horizonte = (typeof HORIZONTES)[number]["id"];

export default function FluxoCaixaPage() {
  const base = useBase();
  const { config, segmento } = useData();
  const hoje = todayISO();
  const [horizonte, setHorizonte] = useState<Horizonte>("60");
  const dias = Number(horizonte);

  const projecao = useMemo(
    () => fluxoCaixaProjetado(base, config, dias, hoje),
    [base, config, dias, hoje]
  );
  const semanas = useMemo(() => fluxoPorSemana(projecao), [projecao]);

  const saldoHoje = useMemo(
    () => calcularSaldoCaixa(base, config, hoje),
    [base, config, hoje]
  );

  const resumo = useMemo(() => {
    const entradas = projecao.reduce((s, p) => s + p.entradas, 0);
    const saidas = projecao.reduce((s, p) => s + p.saidas, 0);
    const saldoFinal = projecao.at(-1)?.saldo ?? saldoHoje;
    const pior = projecao.reduce((menor, p) => (p.saldo < menor.saldo ? p : menor), projecao[0]);
    return { entradas, saidas, saldoFinal, pior };
  }, [projecao, saldoHoje]);

  /** Próximos compromissos: o que efetivamente move o caixa nos próximos dias. */
  const proximosMovimentos = useMemo(() => {
    const limite = addDays(hoje, dias);
    const entradas = base.atendimentos
      .filter((a) => estaEmAberto(a) && a.vencimento <= limite)
      .map((a) => ({
        id: `a-${a.id}`,
        data: a.vencimento < hoje ? hoje : a.vencimento,
        descricao:
          base.clientes.find((c) => c.id === a.clienteId)?.nome ??
          segmento.labels.atendimento,
        detalhe: a.vencimento < hoje ? "Recebimento vencido" : "A receber",
        valor: valorLiquido(a),
        entrada: true,
        atrasado: a.vencimento < hoje,
      }));

    const saidas = base.transacoes
      .filter((t) => !t.pago && t.vencimento <= limite)
      .map((t) => ({
        id: `t-${t.id}`,
        data: t.vencimento < hoje ? hoje : t.vencimento,
        descricao: t.descricao,
        detalhe: t.vencimento < hoje ? "Vencida" : t.categoria,
        valor: t.valor,
        entrada: t.tipo === "receita",
        atrasado: t.vencimento < hoje,
      }));

    return [...entradas, ...saidas]
      .sort((a, b) => a.data.localeCompare(b.data) || b.valor - a.valor)
      .slice(0, 10);
  }, [base, hoje, dias, segmento.labels.atendimento]);

  const abaixoDaReserva = projecao.find((p) => p.saldo < config.reservaMinimaCaixa);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-ink">Fluxo de caixa projetado</h1>
          <p className="mt-0.5 text-sm text-ink-3">
            Saldo dia a dia com base nos vencimentos em aberto e nos lançamentos recorrentes.
          </p>
        </div>
        <Segmented
          ariaLabel="Horizonte da projeção"
          valor={horizonte}
          onChange={setHorizonte}
          opcoes={HORIZONTES.map((h) => ({ id: h.id, label: h.label }))}
        />
      </header>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <KpiCard label="Saldo hoje" value={formatCurrency(saldoHoje)} icon={Wallet} />
        <KpiCard
          label={`Entradas previstas (${dias}d)`}
          value={formatCurrency(resumo.entradas)}
          icon={ArrowUpRight}
        />
        <KpiCard
          label={`Saídas previstas (${dias}d)`}
          value={formatCurrency(resumo.saidas)}
          icon={ArrowDownRight}
          altaEBoa={false}
        />
        <KpiCard
          label={`Saldo projetado em ${dias} dias`}
          value={formatCurrency(resumo.saldoFinal)}
          hint={
            resumo.pior
              ? `mínimo ${formatCurrency(resumo.pior.saldo)} em ${formatDateShort(resumo.pior.data)}`
              : undefined
          }
          destaque
        />
      </div>

      {abaixoDaReserva && (
        <div className="flex items-start gap-2.5 rounded-xl border border-warn/30 bg-warn-soft px-4 py-3 text-warn-ink">
          <ShieldAlert size={17} className="mt-0.5 shrink-0" aria-hidden />
          <div>
            <p className="text-sm font-medium">
              A projeção cruza a reserva mínima em {formatDate(abaixoDaReserva.data)}
            </p>
            <p className="mt-0.5 text-xs opacity-90">
              Saldo previsto de {formatCurrency(abaixoDaReserva.saldo)} contra reserva de{" "}
              {formatCurrency(config.reservaMinimaCaixa)}. Antecipe recebimentos ou renegocie
              vencimentos antes dessa data.
            </p>
          </div>
        </div>
      )}

      <ChartCard
        titulo="Saldo projetado"
        descricao="A linha horizontal marca a reserva mínima de caixa configurada."
        altura={300}
        tabela={{
          cabecalho: ["Data", "Entradas", "Saídas", "Saldo"],
          numericas: [1, 2, 3],
          linhas: projecao
            .filter((p) => p.entradas > 0 || p.saidas > 0)
            .map((p) => [
              formatDate(p.data),
              formatCurrency(p.entradas),
              formatCurrency(p.saidas),
              formatCurrency(p.saldo),
            ]),
        }}
      >
        {projecao.length === 0 ? (
          <SemDados />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={projecao} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
              <defs>
                <linearGradient id="gradienteSaldo" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--series-1)" stopOpacity={0.18} />
                  <stop offset="100%" stopColor="var(--series-1)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid {...gradeProps} />
              <XAxis
                dataKey="data"
                tickFormatter={formatDateShort}
                minTickGap={28}
                {...eixoX}
              />
              <YAxis tickFormatter={(v) => formatCompact(Number(v))} {...eixoY} />
              <Tooltip
                content={
                  <ChartTooltip formatar={formatCurrency} formatarLabel={formatDate} />
                }
              />
              <ReferenceLine
                y={config.reservaMinimaCaixa}
                stroke="var(--warn)"
                strokeWidth={2}
                label={{
                  value: "Reserva mínima",
                  position: "insideTopRight",
                  fill: "var(--ink-3)",
                  fontSize: 11,
                }}
              />
              <ReferenceLine y={0} stroke="var(--axis)" strokeWidth={1} />
              <Area
                dataKey="saldo"
                name="Saldo projetado"
                type="monotone"
                stroke="var(--series-1)"
                strokeWidth={2}
                fill="url(#gradienteSaldo)"
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--surface)" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-2">
        <ChartCard
          titulo="Entradas e saídas por semana"
          descricao="Onde se concentram os compromissos do período."
          altura={260}
          legenda={
            <Legenda
              itens={[
                { cor: "var(--series-1)", label: "Entradas" },
                { cor: "var(--series-2)", label: "Saídas" },
              ]}
            />
          }
          tabela={{
            cabecalho: ["Semana", "Entradas", "Saídas", "Saldo ao fim"],
            numericas: [1, 2, 3],
            linhas: semanas.map((s) => [
              `${formatDateShort(s.inicio)} – ${formatDateShort(s.fim)}`,
              formatCurrency(s.entradas),
              formatCurrency(s.saidas),
              formatCurrency(s.saldoFinal),
            ]),
          }}
        >
          {semanas.length === 0 ? (
            <SemDados />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={semanas} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
                <CartesianGrid {...gradeProps} />
                <XAxis dataKey="rotulo" {...eixoX} />
                <YAxis tickFormatter={(v) => formatCompact(Number(v))} {...eixoY} />
                <Tooltip
                  cursor={{ fill: "var(--raised)" }}
                  content={
                    <ChartTooltip
                      formatar={formatCurrency}
                      formatarLabel={(rotulo) => {
                        const semana = semanas.find((s) => s.rotulo === rotulo);
                        return semana
                          ? `${formatDateShort(semana.inicio)} – ${formatDateShort(semana.fim)}`
                          : rotulo;
                      }}
                    />
                  }
                />
                <Bar
                  dataKey="entradas"
                  name="Entradas"
                  fill="var(--series-1)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={24}
                />
                <Bar
                  dataKey="saidas"
                  name="Saídas"
                  fill="var(--series-2)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={24}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <Panel
          titulo="Próximos compromissos"
          descricao="Ordenados por data — vencidos aparecem primeiro."
          padding={false}
        >
          <TableWrap>
            <table className="w-full">
              <thead>
                <tr className="border-b border-line">
                  <Th>Data</Th>
                  <Th>Descrição</Th>
                  <Th align="right">Valor</Th>
                </tr>
              </thead>
              <tbody>
                {proximosMovimentos.map((m) => (
                  <tr key={m.id} className="border-b border-line last:border-0">
                    <Td className="tabular whitespace-nowrap">{formatDateShort(m.data)}</Td>
                    <Td>
                      <p className="font-medium text-ink">{m.descricao}</p>
                      <p
                        className={`text-[11px] ${m.atrasado ? "text-crit-ink" : "text-ink-3"}`}
                      >
                        {m.detalhe}
                      </p>
                    </Td>
                    <Td
                      className={`tabular text-right font-medium ${
                        m.entrada ? "text-good-ink" : "text-ink"
                      }`}
                    >
                      {m.entrada ? "+" : "−"}
                      {formatCurrency(m.valor)}
                    </Td>
                  </tr>
                ))}
                {proximosMovimentos.length === 0 && (
                  <tr>
                    <Td colSpan={3} className="py-8 text-center text-ink-3">
                      Nenhum compromisso em aberto no horizonte selecionado.
                    </Td>
                  </tr>
                )}
              </tbody>
            </table>
          </TableWrap>
        </Panel>
      </div>
    </div>
  );
}
