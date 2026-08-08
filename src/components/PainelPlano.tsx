"use client";

import { useMemo } from "react";
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CalendarClock, CheckCircle2, Flag, Target, TrendingUp } from "lucide-react";
import { faturamentoPorMes } from "@/lib/finance";
import {
  alvoDoMes,
  avaliarPlano,
  esforcoDoMes,
  PlanoCrescimento,
  trajetoria,
} from "@/lib/plano";
import { BaseDados } from "@/lib/types";
import {
  addMonths,
  formatCompact,
  formatCurrency,
  formatMonthKey,
  formatNumber,
  formatPercent,
  monthKey,
  todayISO,
} from "@/lib/format";
import { ChartCard, ChartTooltip, Legenda, eixoX, eixoY, gradeProps } from "./charts";

/**
 * O plano de crescimento no painel: a rampa combinada ao que foi entregue.
 *
 * A pergunta que ele responde não é "quanto faturei", que os KPIs já dão, e sim
 * **"estou indo chegar?"** — comparando o mês corrente com o alvo da rampa e
 * projetando o ritmo observado até o fim do prazo. Enquanto o mês está em
 * curso, comparar o parcial com o alvo cheio acusaria atraso todo dia 3, então
 * o mês corrente aparece destacado e o veredito olha o último mês fechado.
 */
export default function PainelPlano({
  plano,
  base,
  ticketMedio,
  rotuloAtendimentos,
  hoje = todayISO(),
}: {
  plano: PlanoCrescimento;
  base: BaseDados;
  ticketMedio: number;
  rotuloAtendimentos: string;
  hoje?: string;
}) {
  const mesAtual = monthKey(hoje);

  const realizadoPorMes = useMemo(() => faturamentoPorMes(base), [base]);
  const marcos = useMemo(() => trajetoria(plano), [plano]);

  /**
   * Até seis meses anteriores à partida entram como contexto — sem alvo, porque
   * a rampa ainda não valia para eles. Quem traça o plano hoje veria um gráfico
   * de uma barra só; com o histórico ao lado, dá para ver de onde se está
   * saindo. Meses sem faturamento algum antes do primeiro movimento ficam de
   * fora: espaço vazio não é contexto.
   */
  const historico = useMemo(() => {
    const candidatos: string[] = [];
    for (let k = 6; k >= 1; k--) {
      candidatos.push(monthKey(addMonths(`${plano.inicio}-01`, -k)));
    }
    const primeiro = candidatos.findIndex((chave) => (realizadoPorMes.get(chave) ?? 0) > 0);
    if (primeiro === -1) return [];
    return candidatos.slice(primeiro).map((chave) => ({
      chave,
      alvo: null as number | null,
      realizado: realizadoPorMes.get(chave) ?? 0,
      emCurso: false,
    }));
  }, [plano.inicio, realizadoPorMes]);

  const dados = useMemo(
    () => [
      ...historico,
      ...marcos.map((m) => ({
        chave: m.chave,
        alvo: m.alvo as number | null,
        realizado: m.chave <= mesAtual ? (realizadoPorMes.get(m.chave) ?? 0) : null,
        emCurso: m.chave === mesAtual,
      })),
    ],
    [historico, marcos, realizadoPorMes, mesAtual]
  );

  /**
   * O veredito usa o último mês **fechado** dentro do plano. Um mês pela metade
   * sempre pareceria fracasso, e um alarme que dispara sozinho todo dia 1º
   * ensina o usuário a ignorá-lo.
   */
  const mesFechado = useMemo(() => {
    const anteriores = marcos.filter((m) => m.chave < mesAtual);
    return anteriores.length > 0 ? anteriores[anteriores.length - 1].chave : null;
  }, [marcos, mesAtual]);

  const diagnostico = useMemo(
    () => (mesFechado ? avaliarPlano(plano, realizadoPorMes, mesFechado) : null),
    [plano, realizadoPorMes, mesFechado]
  );

  const alvoDoMesAtual = alvoDoMes(plano, mesAtual);
  const realizadoMesAtual = realizadoPorMes.get(mesAtual) ?? 0;
  const esforco = esforcoDoMes(alvoDoMesAtual, ticketMedio);
  const faltaNoMes = Math.max(0, alvoDoMesAtual - realizadoMesAtual);
  const faltamAtendimentos =
    ticketMedio > 0 && faltaNoMes > 0 ? Math.ceil(faltaNoMes / ticketMedio) : 0;

  const fimDoPlano = marcos[marcos.length - 1];

  return (
    <ChartCard
      titulo="Plano de crescimento"
      descricao={`De ${formatCurrency(plano.faturamentoBase)} a ${formatCurrency(
        plano.metaReceitaMensal
      )} por mês até ${formatMonthKey(fimDoPlano.chave)}.`}
      altura={260}
      /* O veredito entra na faixa acima do gráfico, e não dentro dele: ali ele
         sobrevive à troca para a visão de tabela, que é justamente onde quem
         não lê o gráfico precisa dele. */
      legenda={
        <>
          <div className="grid grid-cols-1 gap-3 border-b border-line pb-4 sm:grid-cols-3">
            <Bloco
              icone={Target}
              rotulo={`Alvo de ${formatMonthKey(mesAtual)}`}
              valor={formatCurrency(alvoDoMesAtual)}
              detalhe={
                faltaNoMes > 0
                  ? `faltam ${formatCurrency(faltaNoMes)}${
                      faltamAtendimentos > 0
                        ? ` · ~${formatNumber(faltamAtendimentos)} ${rotuloAtendimentos.toLowerCase()}`
                        : ""
                    }`
                  : esforco
                    ? `alcançado · ~${formatNumber(esforco.atendimentos)} ${rotuloAtendimentos.toLowerCase()} no mês`
                    : "alcançado"
              }
              tom={faltaNoMes > 0 ? "neutro" : "bom"}
            />

            <Bloco
              icone={diagnostico?.noRitmo === false ? Flag : CheckCircle2}
              rotulo={
                mesFechado ? `Último mês fechado (${formatMonthKey(mesFechado)})` : "Último mês fechado"
              }
              valor={diagnostico ? formatCurrency(diagnostico.realizadoMes) : "—"}
              detalhe={
                diagnostico
                  ? diagnostico.noRitmo
                    ? `no ritmo · ${formatPercent(diagnostico.aderenciaPercent, 0)} do alvo`
                    : `${formatPercent(diagnostico.aderenciaPercent, 0)} do alvo · ${formatCurrency(
                        Math.abs(diagnostico.diferenca)
                      )} abaixo`
                  : "o plano começou neste mês"
              }
              tom={diagnostico ? (diagnostico.noRitmo ? "bom" : "atencao") : "neutro"}
            />

            <Bloco
              icone={diagnostico?.concluido ? CalendarClock : TrendingUp}
              rotulo={
                diagnostico?.concluido
                  ? "Prazo encerrado"
                  : `Projeção para ${formatMonthKey(fimDoPlano.chave)}`
              }
              valor={
                diagnostico && diagnostico.mesesDecorridos > 0
                  ? formatCurrency(diagnostico.projecaoFinal)
                  : "—"
              }
              detalhe={
                !diagnostico || diagnostico.mesesDecorridos === 0
                  ? "sem mês fechado ainda, não dá para projetar"
                  : diagnostico.concluido
                    ? diagnostico.chegaNaMeta
                      ? "meta alcançada no prazo"
                      : "prazo vencido sem alcançar a meta"
                    : diagnostico.chegaNaMeta
                      ? `mantendo o ritmo, chega à meta em ${formatNumber(
                          diagnostico.mesesRestantes
                        )} ${diagnostico.mesesRestantes === 1 ? "mês" : "meses"}`
                      : `no ritmo atual falta somar ${formatCurrency(
                          diagnostico.incrementoNecessario
                        )} por mês`
              }
              tom={
                !diagnostico || diagnostico.mesesDecorridos === 0
                  ? "neutro"
                  : diagnostico.chegaNaMeta
                    ? "bom"
                    : "atencao"
              }
            />
          </div>

          <Legenda
            className="pt-3"
            itens={[
              { cor: "var(--series-1)", label: "Faturado" },
              { cor: "var(--series-3)", label: "Alvo do mês", tracejado: true },
            ]}
          />
        </>
      }
      tabela={{
        cabecalho: ["Mês", "Alvo", "Faturado", "Diferença"],
        numericas: [1, 2, 3],
        linhas: dados.map((d) => [
          formatMonthKey(d.chave) +
            (d.emCurso ? " (em curso)" : d.alvo === null ? " (antes do plano)" : ""),
          d.alvo === null ? "—" : formatCurrency(d.alvo),
          d.realizado === null ? "—" : formatCurrency(d.realizado),
          d.alvo === null || d.realizado === null
            ? "—"
            : formatCurrency(d.realizado - d.alvo),
        ]),
      }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={dados} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
          <CartesianGrid {...gradeProps} />
          <XAxis dataKey="chave" tickFormatter={formatMonthKey} {...eixoX} />
          <YAxis tickFormatter={(v) => formatCompact(Number(v))} {...eixoY} />
          <Tooltip
            cursor={{ fill: "var(--raised)" }}
            content={<ChartTooltip formatar={formatCurrency} formatarLabel={formatMonthKey} />}
          />
          <ReferenceLine
            y={plano.metaReceitaMensal}
            stroke="var(--ink-3)"
            strokeDasharray="3 3"
            strokeWidth={1}
          />
          <Bar dataKey="realizado" name="Faturado" radius={[4, 4, 0, 0]} maxBarSize={26}>
            {dados.map((d) => (
              // O mês em curso é parcial: a barra vazada evita lê-lo como
              // fechado. Os meses anteriores ao plano ficam esmaecidos — são
              // contexto, não desempenho contra a rampa.
              <Cell
                key={d.chave}
                fill={
                  d.emCurso
                    ? "var(--brand-soft)"
                    : d.alvo === null
                      ? "var(--neutral-soft)"
                      : "var(--series-1)"
                }
                stroke={d.emCurso ? "var(--series-1)" : undefined}
                strokeWidth={d.emCurso ? 1.5 : 0}
                strokeDasharray={d.emCurso ? "3 2" : undefined}
              />
            ))}
          </Bar>
          <Line
            dataKey="alvo"
            name="Alvo do mês"
            type="monotone"
            stroke="var(--series-3)"
            strokeWidth={2}
            strokeDasharray="5 4"
            dot={false}
            activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--surface)" }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

function Bloco({
  icone: Icone,
  rotulo,
  valor,
  detalhe,
  tom,
}: {
  icone: typeof Target;
  rotulo: string;
  valor: string;
  detalhe: string;
  tom: "bom" | "atencao" | "neutro";
}) {
  // Status nunca é só cor: o ícone e o texto do detalhe dizem a mesma coisa.
  const cores = {
    bom: "text-good-ink",
    atencao: "text-warn-ink",
    neutro: "text-ink-3",
  } as const;

  return (
    <div className="min-w-0">
      <p className="flex items-center gap-1.5 text-xs text-ink-3">
        <Icone size={13} className={`shrink-0 ${cores[tom]}`} aria-hidden />
        <span className="truncate">{rotulo}</span>
      </p>
      <p className="mt-1 text-lg font-semibold tabular text-ink">{valor}</p>
      <p className={`mt-0.5 text-xs leading-relaxed ${cores[tom]}`}>{detalhe}</p>
    </div>
  );
}
