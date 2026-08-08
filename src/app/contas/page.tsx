"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  CheckCircle2,
  CreditCard,
  Download,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Trash2,
} from "lucide-react";
import { useBase, useData } from "@/lib/data-context";
import { usePeriodo } from "@/lib/periodo-context";
import KpiCard from "@/components/KpiCard";
import StatusBadge from "@/components/StatusBadge";
import {
  Button,
  Checkbox,
  EmptyState,
  Field,
  Input,
  Modal,
  Panel,
  Paginacao,
  Segmented,
  Select,
  TableWrap,
  Td,
  Th,
  usePaginacao,
} from "@/components/ui";
import {
  ChartCard,
  ChartTooltip,
  SemDados,
  eixoX,
  eixoY,
  gradeProps,
} from "@/components/charts";
import { agruparDespesasPorCentroCusto } from "@/lib/finance";
import { dentroDoPeriodo } from "@/lib/periodo";
import {
  addDays,
  diffDays,
  formatCompact,
  formatCurrency,
  formatDate,
  formatNumber,
  todayISO,
} from "@/lib/format";
import {
  FORMAS_PAGAMENTO,
  NaturezaCusto,
  TipoTransacao,
  Transacao,
} from "@/lib/types";
import { baixarCSV, numeroCSV } from "@/lib/csv";

type Aba = "pagar" | "receber" | "todas";
type FiltroSituacao = "todas" | "aberto" | "vencido" | "pago";

const formularioVazio = () => ({
  tipo: "despesa" as TipoTransacao,
  descricao: "",
  categoria: "",
  centroCusto: "",
  contraparte: "",
  natureza: "variavel" as NaturezaCusto,
  valor: "",
  data: todayISO(),
  vencimento: todayISO(),
  pago: false,
  recorrente: false,
  formaPagamento: "",
});

export default function ContasPage() {
  const base = useBase();
  const { segmento, transacoesCrud } = useData();
  const { periodo } = usePeriodo();
  const hoje = todayISO();

  const [aba, setAba] = useState<Aba>("pagar");
  const [situacao, setSituacao] = useState<FiltroSituacao>("todas");
  const [busca, setBusca] = useState("");
  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState<Transacao | null>(null);
  const [form, setForm] = useState(formularioVazio);

  const noPeriodo = useMemo(
    () =>
      base.transacoes.filter(
        // Contas em aberto vencidas continuam visíveis mesmo fora da janela:
        // esconder dívida vencida é a pior coisa que um financeiro pode fazer.
        (t) =>
          dentroDoPeriodo(t.data, periodo) || (!t.pago && t.vencimento < hoje),
      ),
    [base.transacoes, periodo, hoje],
  );

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return noPeriodo
      .filter((t) =>
        aba === "todas"
          ? true
          : aba === "pagar"
            ? t.tipo === "despesa"
            : t.tipo === "receita",
      )
      .filter((t) => {
        if (situacao === "aberto") return !t.pago;
        if (situacao === "pago") return t.pago;
        if (situacao === "vencido") return !t.pago && t.vencimento < hoje;
        return true;
      })
      .filter(
        (t) =>
          !termo ||
          `${t.descricao} ${t.categoria} ${t.centroCusto ?? ""} ${t.contraparte ?? ""}`
            .toLowerCase()
            .includes(termo),
      )
      .sort((a, b) => {
        if (a.pago !== b.pago) return a.pago ? 1 : -1;
        return a.vencimento.localeCompare(b.vencimento);
      });
  }, [noPeriodo, aba, situacao, busca, hoje]);

  const totais = useMemo(() => {
    const despesas = noPeriodo.filter((t) => t.tipo === "despesa");
    const aPagar = despesas
      .filter((t) => !t.pago)
      .reduce((s, t) => s + t.valor, 0);
    const vencido = despesas
      .filter((t) => !t.pago && t.vencimento < hoje)
      .reduce((s, t) => s + t.valor, 0);
    const pago = despesas
      .filter(
        (t) => t.pago && dentroDoPeriodo(t.pagoEm ?? t.vencimento, periodo),
      )
      .reduce((s, t) => s + t.valor, 0);
    const fixas = despesas
      .filter((t) => t.natureza === "fixo" && dentroDoPeriodo(t.data, periodo))
      .reduce((s, t) => s + t.valor, 0);
    const variaveis = despesas
      .filter((t) => t.natureza !== "fixo" && dentroDoPeriodo(t.data, periodo))
      .reduce((s, t) => s + t.valor, 0);
    return { aPagar, vencido, pago, fixas, variaveis };
  }, [noPeriodo, hoje, periodo]);

  const porCentroCusto = useMemo(
    () => agruparDespesasPorCentroCusto(base, periodo),
    [base, periodo],
  );

  const categorias = useMemo(() => {
    const doSegmento = segmento.categoriasDespesa;
    const usadas = new Set(base.transacoes.map((t) => t.categoria));
    return [...new Set([...doSegmento, ...usadas])].sort((a, b) =>
      a.localeCompare(b, "pt-BR"),
    );
  }, [segmento.categoriasDespesa, base.transacoes]);

  const paginacao = usePaginacao(filtradas, 25);

  function abrirNovo() {
    setEditando(null);
    setForm({
      ...formularioVazio(),
      tipo: aba === "receber" ? "receita" : "despesa",
      categoria: segmento.categoriasDespesa[0] ?? "",
      centroCusto: segmento.centrosCusto[0] ?? "",
    });
    setModalAberto(true);
  }

  function abrirEdicao(t: Transacao) {
    setEditando(t);
    setForm({
      tipo: t.tipo,
      descricao: t.descricao,
      categoria: t.categoria,
      centroCusto: t.centroCusto ?? "",
      contraparte: t.contraparte ?? "",
      natureza: t.natureza,
      valor: String(t.valor),
      data: t.data,
      vencimento: t.vencimento,
      pago: t.pago,
      recorrente: t.recorrente,
      formaPagamento: t.formaPagamento ?? "",
    });
    setModalAberto(true);
  }

  function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!form.descricao.trim() || !form.valor) return;
    const dados: Omit<Transacao, "id"> = {
      tipo: form.tipo,
      descricao: form.descricao.trim(),
      categoria: form.categoria.trim() || "Geral",
      centroCusto: form.centroCusto.trim() || undefined,
      contraparte: form.contraparte.trim() || undefined,
      natureza: form.natureza,
      valor: Number(form.valor),
      data: form.data,
      vencimento: form.vencimento || form.data,
      pago: form.pago,
      pagoEm: form.pago ? (editando?.pagoEm ?? form.vencimento) : undefined,
      recorrente: form.recorrente,
      formaPagamento: form.formaPagamento || undefined,
    };
    if (editando) transacoesCrud.update(editando.id, dados);
    else transacoesCrud.add(dados);
    setModalAberto(false);
    setEditando(null);
  }

  function alternarPago(t: Transacao) {
    transacoesCrud.update(t.id, {
      pago: !t.pago,
      pagoEm: !t.pago ? hoje : undefined,
    });
  }

  function exportar() {
    baixarCSV(
      `contas-${aba}-${periodo.inicio}-${periodo.fim}`,
      [
        "Tipo",
        "Descrição",
        "Categoria",
        "Centro de custo",
        "Fornecedor",
        "Natureza",
        "Competência",
        "Vencimento",
        "Valor",
        "Situação",
        "Pago em",
      ],
      filtradas.map((t) => [
        t.tipo === "despesa" ? "Despesa" : "Receita",
        t.descricao,
        t.categoria,
        t.centroCusto ?? "",
        t.contraparte ?? "",
        t.natureza === "fixo" ? "Fixo" : "Variável",
        formatDate(t.data),
        formatDate(t.vencimento),
        numeroCSV(t.valor),
        t.pago ? "Pago" : t.vencimento < hoje ? "Vencido" : "Em aberto",
        t.pagoEm ? formatDate(t.pagoEm) : "",
      ]),
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-ink">
            Contas a pagar e receber
          </h1>
          <p className="mt-0.5 text-sm text-ink-3">
            Compromissos com vencimento — a base do fluxo de caixa projetado.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            icon={Download}
            onClick={exportar}
            disabled={filtradas.length === 0}
          >
            Exportar
          </Button>
          <Button variante="primary" icon={Plus} onClick={abrirNovo}>
            Nova conta
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <KpiCard
          label="Em aberto a pagar"
          value={formatCurrency(totais.aPagar)}
          altaEBoa={false}
        />
        <KpiCard
          label="Vencido"
          value={formatCurrency(totais.vencido)}
          altaEBoa={false}
          hint={totais.vencido > 0 ? "regularize primeiro" : "nada em atraso"}
        />
        <KpiCard label="Pago no período" value={formatCurrency(totais.pago)} />
        <KpiCard
          label="Custo fixo do período"
          value={formatCurrency(totais.fixas)}
          hint={`${formatCurrency(totais.variaveis)} variável`}
          altaEBoa={false}
        />
      </div>

      <ChartCard
        titulo="Despesas por centro de custo"
        descricao="Onde a estrutura consome caixa no período."
        altura={240}
        tabela={{
          cabecalho: ["Centro de custo", "Total"],
          numericas: [1],
          linhas: porCentroCusto.map((c) => [
            c.centroCusto,
            formatCurrency(c.total),
          ]),
        }}
      >
        {porCentroCusto.length === 0 ? (
          <SemDados />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={porCentroCusto}
              margin={{ top: 8, right: 12, bottom: 4, left: 0 }}
            >
              <CartesianGrid {...gradeProps} />
              <XAxis dataKey="centroCusto" {...eixoX} />
              <YAxis
                tickFormatter={(v) => formatCompact(Number(v))}
                {...eixoY}
              />
              <Tooltip
                cursor={{ fill: "var(--raised)" }}
                content={<ChartTooltip formatar={formatCurrency} />}
              />
              <Bar
                dataKey="total"
                name="Despesas"
                fill="var(--series-2)"
                radius={[4, 4, 0, 0]}
                maxBarSize={24}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      <Panel padding={false}>
        <div className="flex flex-wrap items-center gap-3 border-b border-line p-3">
          <Segmented
            ariaLabel="Tipo de conta"
            valor={aba}
            onChange={setAba}
            opcoes={[
              { id: "pagar", label: "A pagar" },
              { id: "receber", label: "Outras receitas" },
              { id: "todas", label: "Todas" },
            ]}
          />
          <div className="relative min-w-[200px] flex-1">
            <Search
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3"
              aria-hidden
            />
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar descrição, categoria ou fornecedor…"
              aria-label="Buscar"
              className="pl-9"
            />
          </div>
          <div className="w-full sm:w-[170px]">
            <Select
              value={situacao}
              onChange={(e) => setSituacao(e.target.value as FiltroSituacao)}
              aria-label="Filtrar por situação"
            >
              <option value="todas">Todas as situações</option>
              <option value="aberto">Em aberto</option>
              <option value="vencido">Vencidas</option>
              <option value="pago">Pagas</option>
            </Select>
          </div>
        </div>

        {filtradas.length === 0 ? (
          <EmptyState
            icon={CreditCard}
            titulo="Nenhuma conta encontrada"
            descricao="Ajuste os filtros ou registre um novo compromisso."
            acao={
              <Button variante="primary" icon={Plus} onClick={abrirNovo}>
                Nova conta
              </Button>
            }
          />
        ) : (
          <TableWrap>
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="border-b border-line">
                  <Th>Descrição</Th>
                  <Th>Categoria</Th>
                  <Th>Centro de custo</Th>
                  <Th>Vencimento</Th>
                  <Th align="right">Valor</Th>
                  <Th>Situação</Th>
                  <Th align="right">Ações</Th>
                </tr>
              </thead>
              <tbody>
                {paginacao.visiveis.map((t) => {
                  const vencida = !t.pago && t.vencimento < hoje;
                  const diasAtraso = vencida ? diffDays(t.vencimento, hoje) : 0;
                  return (
                    <tr
                      key={t.id}
                      className="border-b border-line last:border-0 hover:bg-raised"
                    >
                      <Td>
                        <p className="font-medium text-ink">{t.descricao}</p>
                        <p className="text-[11px] text-ink-3">
                          {t.tipo === "despesa" ? "Despesa" : "Receita"}
                          {" · "}
                          {t.natureza === "fixo" ? "custo fixo" : "variável"}
                          {t.recorrente && " · recorrente"}
                          {t.contraparte && ` · ${t.contraparte}`}
                        </p>
                      </Td>
                      <Td>{t.categoria}</Td>
                      <Td>{t.centroCusto || "—"}</Td>
                      <Td className="tabular whitespace-nowrap">
                        <span
                          className={vencida ? "font-medium text-crit-ink" : ""}
                        >
                          {formatDate(t.vencimento)}
                        </span>
                        {vencida && (
                          <p className="text-[11px] text-crit-ink">
                            {formatNumber(diasAtraso)} dia(s) em atraso
                          </p>
                        )}
                      </Td>
                      <Td
                        className={`tabular text-right font-medium ${
                          t.tipo === "receita" ? "text-good-ink" : "text-ink"
                        }`}
                      >
                        {t.tipo === "receita" ? "+" : "−"}
                        {formatCurrency(t.valor)}
                      </Td>
                      <Td>
                        <StatusBadge
                          status={t.pago ? "pago" : vencida ? "atrasado" : "pendente"}
                        />
                      </Td>
                      <Td>
                        <div className="flex items-center justify-end gap-0.5">
                          <button
                            onClick={() => alternarPago(t)}
                            aria-label={
                              t.pago
                                ? "Marcar como em aberto"
                                : "Marcar como pago"
                            }
                            title={t.pago ? "Reabrir" : "Dar baixa"}
                            className={`rounded-md p-1.5 text-ink-3 ${
                              t.pago
                                ? "hover:bg-warn-soft hover:text-warn-ink"
                                : "hover:bg-good-soft hover:text-good-ink"
                            }`}
                          >
                            {t.pago ? (
                              <RotateCcw size={16} />
                            ) : (
                              <CheckCircle2 size={16} />
                            )}
                          </button>
                          <button
                            onClick={() => abrirEdicao(t)}
                            aria-label="Editar conta"
                            className="rounded-md p-1.5 text-ink-3 hover:bg-raised hover:text-ink"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={() => transacoesCrud.remove(t.id)}
                            aria-label="Excluir conta"
                            className="rounded-md p-1.5 text-ink-3 hover:bg-crit-soft hover:text-crit-ink"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </TableWrap>
        )}
        <Paginacao {...paginacao} rotulo="contas" />
      </Panel>

      <Modal
        aberto={modalAberto}
        onFechar={() => setModalAberto(false)}
        titulo={editando ? "Editar conta" : "Nova conta"}
        descricao="Competência é o mês do gasto; vencimento é quando o dinheiro sai."
      >
        <form onSubmit={salvar} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Descrição" className="sm:col-span-2">
              <Input
                value={form.descricao}
                onChange={(e) =>
                  setForm({ ...form, descricao: e.target.value })
                }
                placeholder="Ex: aluguel, folha, licença de software"
                required
              />
            </Field>
            <Field label="Tipo">
              <Select
                value={form.tipo}
                onChange={(e) =>
                  setForm({ ...form, tipo: e.target.value as TipoTransacao })
                }
              >
                <option value="despesa">Despesa (saída)</option>
                <option value="receita">Receita (entrada)</option>
              </Select>
            </Field>
            <Field
              label="Natureza"
              hint="Fixo não varia com o volume; variável acompanha a operação."
            >
              <Select
                value={form.natureza}
                onChange={(e) =>
                  setForm({
                    ...form,
                    natureza: e.target.value as NaturezaCusto,
                  })
                }
              >
                <option value="fixo">Custo fixo</option>
                <option value="variavel">Custo variável</option>
              </Select>
            </Field>
            <Field label="Categoria">
              <Select
                value={form.categoria}
                onChange={(e) =>
                  setForm({ ...form, categoria: e.target.value })
                }
              >
                {categorias.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Centro de custo">
              <Select
                value={form.centroCusto}
                onChange={(e) =>
                  setForm({ ...form, centroCusto: e.target.value })
                }
              >
                <option value="">Não alocado</option>
                {segmento.centrosCusto.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Fornecedor / contraparte">
              <Input
                value={form.contraparte}
                onChange={(e) =>
                  setForm({ ...form, contraparte: e.target.value })
                }
                placeholder="Opcional"
              />
            </Field>
            <Field label="Valor">
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.valor}
                onChange={(e) => setForm({ ...form, valor: e.target.value })}
                placeholder="0,00"
                required
              />
            </Field>
            <Field label="Competência">
              <Input
                type="date"
                value={form.data}
                onChange={(e) => setForm({ ...form, data: e.target.value })}
                required
              />
            </Field>
            <Field label="Vencimento">
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={form.vencimento}
                  onChange={(e) =>
                    setForm({ ...form, vencimento: e.target.value })
                  }
                  required
                />
                <div className="w-32 shrink-0">
                  <Select
                    aria-label="Prazo rápido"
                    value=""
                    onChange={(e) =>
                      e.target.value &&
                      setForm({
                        ...form,
                        vencimento: addDays(form.data, Number(e.target.value)),
                      })
                    }
                  >
                    <option value="">Prazo</option>
                    <option value="0">No dia</option>
                    <option value="15">15 dias</option>
                    <option value="30">30 dias</option>
                  </Select>
                </div>
              </div>
            </Field>
            <Field label="Forma de pagamento">
              <Select
                value={form.formaPagamento}
                onChange={(e) =>
                  setForm({ ...form, formaPagamento: e.target.value })
                }
              >
                <option value="">Não informado</option>
                {FORMAS_PAGAMENTO.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <div className="flex flex-wrap gap-5 rounded-lg bg-raised px-3 py-3">
            <Checkbox
              label="Já foi pago/recebido"
              checked={form.pago}
              onChange={(e) => setForm({ ...form, pago: e.target.checked })}
            />
            <Checkbox
              label="Repete todo mês"
              checked={form.recorrente}
              onChange={(e) =>
                setForm({ ...form, recorrente: e.target.checked })
              }
            />
          </div>

          <div className="flex justify-end gap-2 border-t border-line pt-4">
            <Button type="button" onClick={() => setModalAberto(false)}>
              Cancelar
            </Button>
            <Button type="submit" variante="primary">
              {editando ? "Salvar alterações" : "Adicionar"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
