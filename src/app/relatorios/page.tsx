"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Download, FileBarChart } from "lucide-react";
import { useBase, useData } from "@/lib/data-context";
import { usePeriodo } from "@/lib/periodo-context";
import KpiCard from "@/components/KpiCard";
import { Button, Panel, Segmented, TableWrap, Td, Th } from "@/components/ui";
import {
  ChartCard,
  ChartTooltip,
  SemDados,
  eixoX,
  eixoY,
  gradeProps,
} from "@/components/charts";
import {
  calcularComissoes,
  calcularResumo,
  montarDRE,
  rankingServicos,
  receitaPorFormaPagamento,
  variacao,
} from "@/lib/finance";
import {
  formatCompact,
  formatCurrency,
  formatNumber,
  formatPercent,
} from "@/lib/format";
import { baixarCSV, numeroCSV } from "@/lib/csv";

type Relatorio = "dre" | "servicos" | "comissoes" | "recebimentos";

export default function RelatoriosPage() {
  const base = useBase();
  const { config, segmento } = useData();
  const { periodo, anterior } = usePeriodo();
  const rotulos = segmento.labels;

  const [relatorio, setRelatorio] = useState<Relatorio>("dre");

  const resumo = useMemo(() => calcularResumo(base, config, periodo), [base, config, periodo]);
  const resumoAnterior = useMemo(
    () => calcularResumo(base, config, anterior),
    [base, config, anterior]
  );
  const dre = useMemo(() => montarDRE(base, config, periodo), [base, config, periodo]);
  const servicos = useMemo(() => rankingServicos(base, periodo), [base, periodo]);
  const comissoes = useMemo(() => calcularComissoes(base, periodo), [base, periodo]);
  const recebimentos = useMemo(
    () => receitaPorFormaPagamento(base, periodo),
    [base, periodo]
  );

  function exportar() {
    const sufixo = `${periodo.inicio}-${periodo.fim}`;
    if (relatorio === "dre") {
      baixarCSV(
        `dre-${sufixo}`,
        ["Linha", "Valor", "% da receita bruta"],
        dre.map((l) => [l.rotulo.trim(), numeroCSV(l.valor), numeroCSV(l.percentual, 1)])
      );
      return;
    }
    if (relatorio === "servicos") {
      baixarCSV(
        `${rotulos.servicos.toLowerCase().replace(/\s+/g, "-")}-${sufixo}`,
        [rotulos.servico, "Categoria", "Quantidade", "Faturado", "Custo direto", "Margem", "Margem %"],
        servicos.map((l) => [
          l.servico.nome,
          l.servico.categoria,
          l.quantidade,
          numeroCSV(l.faturado),
          numeroCSV(l.custoTotal),
          numeroCSV(l.margem),
          numeroCSV(l.margemPercent, 1),
        ])
      );
      return;
    }
    if (relatorio === "comissoes") {
      baixarCSV(
        `comissoes-${sufixo}`,
        [rotulos.profissional, "Papel", rotulos.atendimentos, "Produção", "% comissão", "Comissão total", "Comissão sobre recebido"],
        comissoes.map((l) => [
          l.profissional.nome,
          l.profissional.papel,
          l.atendimentos,
          numeroCSV(l.producao),
          numeroCSV(l.profissional.comissaoPercent, 1),
          numeroCSV(l.comissao),
          numeroCSV(l.comissaoSobreRecebido),
        ])
      );
      return;
    }
    baixarCSV(
      `recebimentos-por-forma-${sufixo}`,
      ["Forma de pagamento", "Total recebido"],
      recebimentos.map((r) => [r.forma, numeroCSV(r.total)])
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-ink">Relatórios gerenciais</h1>
          <p className="mt-0.5 text-sm text-ink-3">
            {periodo.label} · alíquota de impostos configurada em{" "}
            {formatPercent(config.aliquotaImpostos, 1)}.
          </p>
        </div>
        <Button icon={Download} onClick={exportar}>
          Exportar CSV
        </Button>
      </header>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <KpiCard
          label="Receita bruta"
          value={formatCurrency(resumo.receitaTotal)}
          delta={variacao(resumo.receitaTotal, resumoAnterior.receitaTotal)}
        />
        <KpiCard
          label="Margem de contribuição"
          value={formatPercent(resumo.margemContribuicaoPercent, 1)}
          hint={formatCurrency(resumo.margemContribuicao)}
          delta={variacao(
            resumo.margemContribuicaoPercent,
            resumoAnterior.margemContribuicaoPercent
          )}
        />
        <KpiCard
          label="Resultado líquido"
          value={formatCurrency(resumo.lucroLiquido)}
          hint={`margem ${formatPercent(resumo.margemLiquidaPercent, 1)}`}
          delta={variacao(resumo.lucroLiquido, resumoAnterior.lucroLiquido)}
        />
        <KpiCard
          label="Ponto de equilíbrio"
          value={formatCurrency(resumo.pontoEquilibrio)}
          hint="faturamento que zera o resultado"
          altaEBoa={false}
        />
      </div>

      {/* Quatro abas não cabem em 390px: rolam dentro da própria faixa em vez de
          alargar a página inteira. */}
      <div className="-mx-4 overflow-x-auto px-4 lg:mx-0 lg:px-0">
        <Segmented
          ariaLabel="Escolher relatório"
          valor={relatorio}
          onChange={setRelatorio}
          opcoes={[
            { id: "dre", label: "DRE gerencial" },
            { id: "servicos", label: rotulos.servicos },
            { id: "comissoes", label: "Comissões" },
            { id: "recebimentos", label: "Recebimentos" },
          ]}
        />
      </div>

      {relatorio === "dre" && <RelatorioDRE linhas={dre} />}
      {relatorio === "servicos" && (
        <RelatorioServicos servicos={servicos} rotuloServico={rotulos.servico} />
      )}
      {relatorio === "comissoes" && (
        <RelatorioComissoes
          comissoes={comissoes}
          rotuloProfissional={rotulos.profissional}
          rotuloAtendimentos={rotulos.atendimentos}
        />
      )}
      {relatorio === "recebimentos" && <RelatorioRecebimentos dados={recebimentos} />}
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function RelatorioDRE({ linhas }: { linhas: ReturnType<typeof montarDRE> }) {
  return (
    <Panel
      titulo="Demonstrativo de resultado (gerencial)"
      descricao="Regime de competência. A margem de contribuição mostra quanto sobra de cada real para pagar a estrutura fixa."
      padding={false}
    >
      <TableWrap>
        <table className="w-full min-w-[520px]">
          <thead>
            <tr className="border-b border-line">
              <Th>Linha</Th>
              <Th align="right">Valor</Th>
              <Th align="right">% da receita</Th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((linha, i) => {
              const isTotal = linha.tipo === "total";
              const isDetalhe = linha.tipo === "detalhe";
              return (
                <tr
                  key={`${linha.rotulo}-${i}`}
                  className={`border-b border-line last:border-0 ${
                    linha.destaque ? "bg-raised" : ""
                  }`}
                >
                  <Td
                    className={`whitespace-pre ${
                      isTotal ? "font-semibold text-ink" : isDetalhe ? "text-ink-3" : ""
                    }`}
                  >
                    {linha.rotulo}
                  </Td>
                  <Td
                    className={`tabular text-right ${
                      isTotal ? "font-semibold text-ink" : isDetalhe ? "text-ink-3" : ""
                    } ${linha.valor < 0 && !isDetalhe ? "text-crit-ink" : ""}`}
                  >
                    {formatCurrency(linha.valor)}
                  </Td>
                  <Td className={`tabular text-right ${isDetalhe ? "text-ink-3" : ""}`}>
                    {formatPercent(linha.percentual, 1)}
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </TableWrap>
    </Panel>
  );
}

function RelatorioServicos({
  servicos,
  rotuloServico,
}: {
  servicos: ReturnType<typeof rankingServicos>;
  rotuloServico: string;
}) {
  if (servicos.length === 0) {
    return (
      <Panel>
        <div className="py-10 text-center text-sm text-ink-3">
          <FileBarChart size={20} className="mx-auto mb-2" aria-hidden />
          Nenhum serviço faturado no período selecionado.
        </div>
      </Panel>
    );
  }

  const dados = servicos.map((l) => ({
    nome: l.servico.nome,
    margem: l.margem,
    margemPercent: l.margemPercent,
  }));

  return (
    <div className="flex flex-col gap-4">
      <ChartCard
        titulo={`Margem por ${rotuloServico.toLowerCase()}`}
        descricao="Faturamento menos o custo direto de execução. Serviço que fatura muito nem sempre é o que mais dá lucro."
        altura={Math.max(240, dados.length * 42)}
        tabela={{
          cabecalho: [rotuloServico, "Margem", "Margem %"],
          numericas: [1, 2],
          linhas: dados.map((d) => [
            d.nome,
            formatCurrency(d.margem),
            formatPercent(d.margemPercent, 1),
          ]),
        }}
      >
        {dados.length === 0 ? (
          <SemDados />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={dados}
              layout="vertical"
              margin={{ top: 4, right: 16, bottom: 4, left: 4 }}
            >
              <CartesianGrid {...gradeProps} horizontal={false} vertical />
              <XAxis type="number" tickFormatter={(v) => formatCompact(Number(v))} {...eixoX} />
              <YAxis type="category" dataKey="nome" {...eixoY} width={160} />
              <Tooltip
                cursor={{ fill: "var(--raised)" }}
                content={<ChartTooltip formatar={formatCurrency} />}
              />
              <Bar dataKey="margem" name="Margem" radius={[0, 4, 4, 0]} maxBarSize={22}>
                {dados.map((d) => (
                  <Cell
                    key={d.nome}
                    fill={d.margem >= 0 ? "var(--series-1)" : "var(--series-2)"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      <Panel titulo={`Detalhamento por ${rotuloServico.toLowerCase()}`} padding={false}>
        <TableWrap>
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="border-b border-line">
                <Th>{rotuloServico}</Th>
                <Th>Categoria</Th>
                <Th align="right">Qtd.</Th>
                <Th align="right">Faturado</Th>
                <Th align="right">Custo direto</Th>
                <Th align="right">Margem</Th>
                <Th align="right">Margem %</Th>
              </tr>
            </thead>
            <tbody>
              {servicos.map((l) => (
                <tr key={l.servico.id} className="border-b border-line last:border-0">
                  <Td className="font-medium text-ink">{l.servico.nome}</Td>
                  <Td>{l.servico.categoria}</Td>
                  <Td className="tabular text-right">{formatNumber(l.quantidade)}</Td>
                  <Td className="tabular text-right">{formatCurrency(l.faturado)}</Td>
                  <Td className="tabular text-right">{formatCurrency(l.custoTotal)}</Td>
                  <Td className="tabular text-right font-medium text-ink">
                    {formatCurrency(l.margem)}
                  </Td>
                  <Td
                    className={`tabular text-right ${
                      l.margemPercent < 40 ? "text-warn-ink" : "text-ink-2"
                    }`}
                  >
                    {formatPercent(l.margemPercent, 1)}
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      </Panel>
    </div>
  );
}

function RelatorioComissoes({
  comissoes,
  rotuloProfissional,
  rotuloAtendimentos,
}: {
  comissoes: ReturnType<typeof calcularComissoes>;
  rotuloProfissional: string;
  rotuloAtendimentos: string;
}) {
  const totalComissao = comissoes.reduce((s, l) => s + l.comissao, 0);
  const totalProducao = comissoes.reduce((s, l) => s + l.producao, 0);

  return (
    <Panel
      titulo="Comissões da equipe"
      descricao="Calculadas sobre o valor líquido produzido. A coluna 'sobre recebido' é a base segura para pagar — considera só o que já entrou."
      padding={false}
    >
      {comissoes.length === 0 ? (
        <div className="py-10 text-center text-sm text-ink-3">
          Nenhuma produção atribuída à equipe no período.
        </div>
      ) : (
        <TableWrap>
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="border-b border-line">
                <Th>{rotuloProfissional}</Th>
                <Th>Papel</Th>
                <Th align="right">{rotuloAtendimentos}</Th>
                <Th align="right">Produção</Th>
                <Th align="right">%</Th>
                <Th align="right">Comissão</Th>
                <Th align="right">Sobre recebido</Th>
              </tr>
            </thead>
            <tbody>
              {comissoes.map((l) => (
                <tr key={l.profissional.id} className="border-b border-line last:border-0">
                  <Td className="font-medium text-ink">{l.profissional.nome}</Td>
                  <Td>{l.profissional.papel}</Td>
                  <Td className="tabular text-right">{formatNumber(l.atendimentos)}</Td>
                  <Td className="tabular text-right">{formatCurrency(l.producao)}</Td>
                  <Td className="tabular text-right">
                    {formatPercent(l.profissional.comissaoPercent, 0)}
                  </Td>
                  <Td className="tabular text-right font-medium text-ink">
                    {formatCurrency(l.comissao)}
                  </Td>
                  <Td className="tabular text-right text-good-ink">
                    {formatCurrency(l.comissaoSobreRecebido)}
                  </Td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-line bg-raised">
                <Td className="font-semibold text-ink">Total</Td>
                <Td />
                <Td />
                <Td className="tabular text-right font-semibold text-ink">
                  {formatCurrency(totalProducao)}
                </Td>
                <Td />
                <Td className="tabular text-right font-semibold text-ink">
                  {formatCurrency(totalComissao)}
                </Td>
                <Td className="tabular text-right font-semibold text-good-ink">
                  {formatCurrency(comissoes.reduce((s, l) => s + l.comissaoSobreRecebido, 0))}
                </Td>
              </tr>
            </tfoot>
          </table>
        </TableWrap>
      )}
    </Panel>
  );
}

function RelatorioRecebimentos({
  dados,
}: {
  dados: { forma: string; total: number }[];
}) {
  const total = dados.reduce((s, d) => s + d.total, 0);

  return (
    <ChartCard
      titulo="Recebimentos por forma de pagamento"
      descricao="Ajuda a estimar taxas de maquininha e prazos de compensação."
      altura={Math.max(240, dados.length * 46)}
      tabela={{
        cabecalho: ["Forma", "Total", "% do total"],
        numericas: [1, 2],
        linhas: dados.map((d) => [
          d.forma,
          formatCurrency(d.total),
          formatPercent(total > 0 ? (d.total / total) * 100 : 0),
        ]),
      }}
    >
      {dados.length === 0 ? (
        <SemDados />
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={dados} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 4 }}>
            <CartesianGrid {...gradeProps} horizontal={false} vertical />
            <XAxis type="number" tickFormatter={(v) => formatCompact(Number(v))} {...eixoX} />
            <YAxis type="category" dataKey="forma" {...eixoY} width={140} />
            <Tooltip
              cursor={{ fill: "var(--raised)" }}
              content={<ChartTooltip formatar={formatCurrency} />}
            />
            <Bar
              dataKey="total"
              name="Recebido"
              fill="var(--series-1)"
              radius={[0, 4, 4, 0]}
              maxBarSize={22}
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}
