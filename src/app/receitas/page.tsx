"use client";

import { useMemo, useState } from "react";
import {
  CalendarPlus,
  CheckCircle2,
  Download,
  MessageCircle,
  Pencil,
  Plus,
  ReceiptText,
  Search,
  Trash2,
} from "lucide-react";
import { useBase, useData } from "@/lib/data-context";
import { usePeriodo } from "@/lib/periodo-context";
import KpiCard from "@/components/KpiCard";
import StatusBadge from "@/components/StatusBadge";
import ModalCobranca from "@/components/ModalCobranca";
import {
  Button,
  EmptyState,
  Field,
  Input,
  Modal,
  Panel,
  Paginacao,
  Select,
  TableWrap,
  Td,
  Th,
  usePaginacao,
} from "@/components/ui";
import { estaAtrasado, valorLiquido } from "@/lib/finance";
import { dentroDoPeriodo } from "@/lib/periodo";
import { addDays, formatCurrency, formatDate, todayISO } from "@/lib/format";
import {
  Atendimento,
  FORMAS_PAGAMENTO,
  LABELS_RECORRENCIA,
  LABELS_STATUS,
  Recorrencia,
  StatusPagamento,
} from "@/lib/types";
import { baixarCSV, numeroCSV } from "@/lib/csv";
import {
  atendimentoParaEvento,
  baixarICS,
  eventosRelevantes,
  linkGoogleAgenda,
} from "@/lib/agenda";

type FiltroStatus = StatusPagamento | "todos" | "em-aberto";

const formularioVazio = () => ({
  clienteId: "",
  servicoId: "",
  profissionalId: "",
  descricao: "",
  data: todayISO(),
  hora: "",
  vencimento: todayISO(),
  valor: "",
  desconto: "",
  status: "pendente" as StatusPagamento,
  formaPagamento: "",
  recorrencia: "unica" as Recorrencia,
  observacao: "",
});

export default function ReceitasPage() {
  const base = useBase();
  const { segmento, config, atendimentosCrud } = useData();
  const { periodo } = usePeriodo();
  const rotulos = segmento.labels;

  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>("todos");
  const [filtroCliente, setFiltroCliente] = useState("todos");
  const [filtroProfissional, setFiltroProfissional] = useState("todos");
  const [modalAberto, setModalAberto] = useState(false);
  const [cobrando, setCobrando] = useState<Atendimento | null>(null);
  const [editando, setEditando] = useState<Atendimento | null>(null);
  const [form, setForm] = useState(formularioVazio);

  const clientePorId = useMemo(
    () => new Map(base.clientes.map((c) => [c.id, c])),
    [base.clientes],
  );
  const servicoPorId = useMemo(
    () => new Map(base.servicos.map((s) => [s.id, s])),
    [base.servicos],
  );
  const profissionalPorId = useMemo(
    () => new Map(base.profissionais.map((p) => [p.id, p])),
    [base.profissionais],
  );

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return base.atendimentos
      .filter((a) => dentroDoPeriodo(a.data, periodo))
      .filter((a) => {
        if (filtroStatus === "em-aberto")
          return a.status === "pendente" || a.status === "atrasado";
        if (filtroStatus !== "todos") return a.status === filtroStatus;
        return true;
      })
      .filter((a) => filtroCliente === "todos" || a.clienteId === filtroCliente)
      .filter(
        (a) =>
          filtroProfissional === "todos" ||
          a.profissionalId === filtroProfissional,
      )
      .filter((a) => {
        if (!termo) return true;
        const cliente = clientePorId.get(a.clienteId)?.nome ?? "";
        const servico = a.servicoId
          ? (servicoPorId.get(a.servicoId)?.nome ?? "")
          : "";
        return `${cliente} ${servico} ${a.descricao ?? ""}`
          .toLowerCase()
          .includes(termo);
      })
      .sort((a, b) => b.data.localeCompare(a.data));
  }, [
    base.atendimentos,
    periodo,
    filtroStatus,
    filtroCliente,
    filtroProfissional,
    busca,
    clientePorId,
    servicoPorId,
  ]);

  const totais = useMemo(() => {
    const faturado = filtrados.reduce(
      (s, a) => (a.status === "cancelado" ? s : s + valorLiquido(a)),
      0,
    );
    const recebido = filtrados.reduce(
      (s, a) => (a.status === "pago" ? s + valorLiquido(a) : s),
      0,
    );
    const aberto = filtrados.reduce(
      (s, a) =>
        a.status === "pendente" || a.status === "atrasado"
          ? s + valorLiquido(a)
          : s,
      0,
    );
    const atrasado = filtrados.reduce(
      (s, a) =>
        estaAtrasado(a) && a.status !== "cancelado" ? s + valorLiquido(a) : s,
      0,
    );
    return { faturado, recebido, aberto, atrasado };
  }, [filtrados]);

  const paginacao = usePaginacao(filtrados, 25);

  function abrirNovo() {
    setEditando(null);
    setForm({
      ...formularioVazio(),
      clienteId: base.clientes[0]?.id ?? "",
      servicoId: base.servicos[0]?.id ?? "",
      profissionalId: base.profissionais[0]?.id ?? "",
      valor: String(base.servicos[0]?.valorPadrao ?? ""),
    });
    setModalAberto(true);
  }

  function abrirEdicao(a: Atendimento) {
    setEditando(a);
    setForm({
      clienteId: a.clienteId,
      servicoId: a.servicoId ?? "",
      profissionalId: a.profissionalId ?? "",
      descricao: a.descricao ?? "",
      data: a.data,
      hora: a.hora ?? "",
      vencimento: a.vencimento,
      valor: String(a.valor),
      desconto: a.desconto ? String(a.desconto) : "",
      status: a.status,
      formaPagamento: a.formaPagamento ?? "",
      recorrencia: a.recorrencia,
      observacao: a.observacao ?? "",
    });
    setModalAberto(true);
  }

  function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!form.clienteId || !form.valor) return;

    const dados: Omit<Atendimento, "id"> = {
      clienteId: form.clienteId,
      servicoId: form.servicoId || undefined,
      profissionalId: form.profissionalId || undefined,
      descricao: form.descricao.trim() || undefined,
      data: form.data,
      hora: form.hora || undefined,
      vencimento: form.vencimento || form.data,
      valor: Number(form.valor),
      desconto: Number(form.desconto || 0),
      status: form.status,
      formaPagamento: form.formaPagamento || undefined,
      pagoEm:
        form.status === "pago" ? (editando?.pagoEm ?? todayISO()) : undefined,
      recorrencia: form.recorrencia,
      observacao: form.observacao.trim() || undefined,
    };

    if (editando) atendimentosCrud.update(editando.id, dados);
    else atendimentosCrud.add(dados);

    setModalAberto(false);
    setEditando(null);
  }

  function marcarComoPago(a: Atendimento) {
    atendimentosCrud.update(a.id, {
      status: "pago",
      pagoEm: todayISO(),
      formaPagamento: a.formaPagamento ?? "Pix",
    });
  }

  /** Monta o evento de agenda a partir do lançamento e do vocabulário atual. */
  function eventoDe(a: Atendimento) {
    return atendimentoParaEvento(a, {
      cliente: clientePorId.get(a.clienteId),
      servico: a.servicoId ? servicoPorId.get(a.servicoId) : undefined,
      profissional: a.profissionalId ? profissionalPorId.get(a.profissionalId) : undefined,
      rotuloAtendimento: rotulos.atendimento,
    });
  }

  function exportarAgenda() {
    // Só o que ainda vai acontecer: importar meses de histórico polui a agenda.
    const eventos = eventosRelevantes(filtrados.map(eventoDe), todayISO());
    baixarICS(`agenda-base-${todayISO()}`, eventos);
  }

  function exportar() {
    baixarCSV(
      `${rotulos.receitaOperacional.toLowerCase().replace(/\s+/g, "-")}-${periodo.inicio}-${periodo.fim}`,
      [
        rotulos.cliente,
        rotulos.servico,
        rotulos.profissional,
        "Data",
        "Vencimento",
        "Valor",
        "Desconto",
        "Líquido",
        "Status",
        "Forma de pagamento",
      ],
      filtrados.map((a) => [
        clientePorId.get(a.clienteId)?.nome ?? "—",
        a.servicoId
          ? (servicoPorId.get(a.servicoId)?.nome ?? "—")
          : (a.descricao ?? "—"),
        a.profissionalId
          ? (profissionalPorId.get(a.profissionalId)?.nome ?? "—")
          : "—",
        formatDate(a.data),
        formatDate(a.vencimento),
        numeroCSV(a.valor),
        numeroCSV(a.desconto),
        numeroCSV(valorLiquido(a)),
        LABELS_STATUS[a.status],
        a.formaPagamento ?? "—",
      ]),
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-ink">
            {rotulos.receitaOperacional}
          </h1>
          <p className="mt-0.5 text-sm text-ink-3">
            Registro do que foi prestado e a situação de cada recebimento.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            icon={Download}
            onClick={exportar}
            disabled={filtrados.length === 0}
          >
            Exportar CSV
          </Button>
          <Button
            icon={CalendarPlus}
            onClick={exportarAgenda}
            disabled={filtrados.length === 0}
            title="Baixa um .ics com o que ainda vai acontecer, para importar no Google, Apple ou Outlook"
          >
            Exportar agenda
          </Button>
          <Button variante="primary" icon={Plus} onClick={abrirNovo}>
            Novo lançamento
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <KpiCard label="Faturado" value={formatCurrency(totais.faturado)} />
        <KpiCard label="Recebido" value={formatCurrency(totais.recebido)} />
        <KpiCard label="Em aberto" value={formatCurrency(totais.aberto)} />
        <KpiCard
          label="Vencido"
          value={formatCurrency(totais.atrasado)}
          altaEBoa={false}
          hint={totais.atrasado > 0 ? "priorize a cobrança" : "tudo em dia"}
        />
      </div>

      <Panel padding={false}>
        <div className="flex flex-wrap items-center gap-2 border-b border-line p-3">
          <div className="relative min-w-[200px] flex-1">
            <Search
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3"
              aria-hidden
            />
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder={`Buscar por ${rotulos.cliente.toLowerCase()} ou ${rotulos.servico.toLowerCase()}…`}
              aria-label="Buscar"
              className="pl-9"
            />
          </div>
          <div className="w-full sm:w-[150px]">
            <Select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value as FiltroStatus)}
              aria-label="Filtrar por status"
            >
              <option value="todos">Todos os status</option>
              <option value="em-aberto">Em aberto</option>
              <option value="pago">Pago</option>
              <option value="pendente">Pendente</option>
              <option value="atrasado">Atrasado</option>
              <option value="cancelado">Cancelado</option>
            </Select>
          </div>
          <div className="w-full sm:w-[170px]">
            <Select
              value={filtroCliente}
              onChange={(e) => setFiltroCliente(e.target.value)}
              aria-label={`Filtrar por ${rotulos.cliente.toLowerCase()}`}
            >
              <option value="todos">
                Todos os {rotulos.clientes.toLowerCase()}
              </option>
              {base.clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </Select>
          </div>
          <div className="w-full sm:w-[170px]">
            <Select
              value={filtroProfissional}
              onChange={(e) => setFiltroProfissional(e.target.value)}
              aria-label={`Filtrar por ${rotulos.profissional.toLowerCase()}`}
            >
              <option value="todos">Toda a equipe</option>
              {base.profissionais.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {filtrados.length === 0 ? (
          <EmptyState
            icon={ReceiptText}
            titulo="Nenhum lançamento encontrado"
            descricao="Ajuste os filtros ou o período no topo da tela, ou registre um novo lançamento."
            acao={
              <Button variante="primary" icon={Plus} onClick={abrirNovo}>
                Novo lançamento
              </Button>
            }
          />
        ) : (
          <TableWrap>
            <table className="w-full min-w-[880px]">
              <thead>
                <tr className="border-b border-line">
                  <Th>{rotulos.cliente}</Th>
                  <Th>{rotulos.servico}</Th>
                  <Th>{rotulos.profissional}</Th>
                  <Th>Data</Th>
                  <Th>Vencimento</Th>
                  <Th align="right">Líquido</Th>
                  <Th>Status</Th>
                  <Th align="right">Ações</Th>
                </tr>
              </thead>
              <tbody>
                {paginacao.visiveis.map((a) => {
                  const vencido = estaAtrasado(a) && a.status !== "cancelado";
                  return (
                    <tr
                      key={a.id}
                      className="border-b border-line last:border-0 hover:bg-raised"
                    >
                      <Td className="font-medium text-ink">
                        {clientePorId.get(a.clienteId)?.nome ?? "—"}
                      </Td>
                      <Td>
                        {a.servicoId
                          ? (servicoPorId.get(a.servicoId)?.nome ?? "—")
                          : (a.descricao ?? "—")}
                        {a.recorrencia !== "unica" && (
                          <span className="ml-1.5 rounded bg-neutral-soft px-1.5 py-0.5 text-[10px] font-medium text-ink-3">
                            {LABELS_RECORRENCIA[a.recorrencia]}
                          </span>
                        )}
                      </Td>
                      <Td>
                        {a.profissionalId
                          ? (profissionalPorId.get(a.profissionalId)?.nome ??
                            "—")
                          : "—"}
                      </Td>
                      <Td className="tabular whitespace-nowrap">
                        {formatDate(a.data)}
                      </Td>
                      <Td
                        className={`tabular whitespace-nowrap ${vencido ? "font-medium text-crit-ink" : ""}`}
                      >
                        {formatDate(a.vencimento)}
                      </Td>
                      <Td className="tabular text-right font-medium text-ink">
                        {formatCurrency(valorLiquido(a))}
                        {a.desconto > 0 && (
                          <span className="ml-1 text-[11px] font-normal text-ink-3">
                            −{formatCurrency(a.desconto)}
                          </span>
                        )}
                      </Td>
                      <Td>
                        <StatusBadge
                          status={
                            vencido && a.status === "pendente"
                              ? "atrasado"
                              : a.status
                          }
                        />
                      </Td>
                      <Td>
                        <div className="flex items-center justify-end gap-0.5">
                          {a.status !== "pago" && a.status !== "cancelado" && (
                            <button
                              onClick={() => setCobrando(a)}
                              title="Cobrar"
                              aria-label={`Cobrar ${clientePorId.get(a.clienteId)?.nome ?? ""}`}
                              className="rounded-md p-1.5 text-ink-3 hover:bg-brand-soft hover:text-brand"
                            >
                              <MessageCircle size={16} />
                            </button>
                          )}
                          {a.status !== "pago" && a.status !== "cancelado" && (
                            <button
                              onClick={() => marcarComoPago(a)}
                              title="Marcar como recebido"
                              aria-label={`Marcar como recebido o lançamento de ${clientePorId.get(a.clienteId)?.nome ?? ""}`}
                              className="rounded-md p-1.5 text-ink-3 hover:bg-good-soft hover:text-good-ink"
                            >
                              <CheckCircle2 size={16} />
                            </button>
                          )}
                          <a
                            href={linkGoogleAgenda(eventoDe(a))}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Adicionar ao Google Agenda"
                            aria-label={`Adicionar ao Google Agenda o lançamento de ${clientePorId.get(a.clienteId)?.nome ?? ""}`}
                            className="inline-flex rounded-md p-1.5 text-ink-3 hover:bg-brand-soft hover:text-brand"
                          >
                            <CalendarPlus size={16} />
                          </a>
                          <button
                            onClick={() => abrirEdicao(a)}
                            title="Editar"
                            aria-label="Editar lançamento"
                            className="rounded-md p-1.5 text-ink-3 hover:bg-raised hover:text-ink"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={() => atendimentosCrud.remove(a.id)}
                            title="Excluir"
                            aria-label="Excluir lançamento"
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
              <tfoot>
                <tr className="border-t border-line bg-raised">
                  <Td className="font-medium text-ink">
                    {filtrados.length} lançamento(s)
                  </Td>
                  <Td />
                  <Td />
                  <Td />
                  <Td className="text-right text-xs uppercase tracking-wide text-ink-3">
                    Total
                  </Td>
                  <Td className="tabular text-right font-semibold text-ink">
                    {formatCurrency(totais.faturado)}
                  </Td>
                  <Td />
                  <Td />
                </tr>
              </tfoot>
            </table>
          </TableWrap>
        )}
        <Paginacao {...paginacao} rotulo="lançamentos" />
      </Panel>

      <Modal
        aberto={modalAberto}
        onFechar={() => setModalAberto(false)}
        titulo={
          editando
            ? "Editar lançamento"
            : `Novo ${rotulos.atendimento.toLowerCase()}`
        }
        descricao="Data define a competência; vencimento define o fluxo de caixa."
      >
        <form onSubmit={salvar} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label={rotulos.cliente}>
              <Select
                value={form.clienteId}
                onChange={(e) =>
                  setForm({ ...form, clienteId: e.target.value })
                }
                required
              >
                <option value="">Selecione…</option>
                {base.clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label={rotulos.servico}>
              <Select
                value={form.servicoId}
                onChange={(e) => {
                  const servico = base.servicos.find(
                    (s) => s.id === e.target.value,
                  );
                  setForm({
                    ...form,
                    servicoId: e.target.value,
                    valor: servico ? String(servico.valorPadrao) : form.valor,
                  });
                }}
              >
                <option value="">Sem catálogo (avulso)</option>
                {base.servicos.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nome} — {formatCurrency(s.valorPadrao)}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label={rotulos.profissional}>
              <Select
                value={form.profissionalId}
                onChange={(e) =>
                  setForm({ ...form, profissionalId: e.target.value })
                }
              >
                <option value="">Não atribuído</option>
                {base.profissionais.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome} — {p.papel}
                  </option>
                ))}
              </Select>
            </Field>

            <Field
              label="Descrição"
              hint="Opcional — use quando não houver serviço no catálogo."
            >
              <Input
                value={form.descricao}
                onChange={(e) =>
                  setForm({ ...form, descricao: e.target.value })
                }
                placeholder="Ex: atendimento fora do catálogo"
              />
            </Field>

            <Field label="Hora" hint="Opcional. Sem hora, o evento na agenda vira dia inteiro.">
              <Input
                type="time"
                value={form.hora}
                onChange={(e) => setForm({ ...form, hora: e.target.value })}
              />
            </Field>

            <Field label="Data do serviço">
              <Input
                type="date"
                value={form.data}
                onChange={(e) =>
                  setForm({
                    ...form,
                    data: e.target.value,
                    vencimento:
                      form.vencimento < e.target.value
                        ? e.target.value
                        : form.vencimento,
                  })
                }
                required
              />
            </Field>

            <Field label="Vencimento">
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={form.vencimento}
                  min={form.data}
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
                    <option value="0">À vista</option>
                    <option value="7">7 dias</option>
                    <option value="15">15 dias</option>
                    <option value="30">30 dias</option>
                  </Select>
                </div>
              </div>
            </Field>

            <Field label="Valor bruto">
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

            <Field label="Desconto">
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.desconto}
                onChange={(e) => setForm({ ...form, desconto: e.target.value })}
                placeholder="0,00"
              />
            </Field>

            <Field label="Status">
              <Select
                value={form.status}
                onChange={(e) =>
                  setForm({
                    ...form,
                    status: e.target.value as StatusPagamento,
                  })
                }
              >
                {(Object.keys(LABELS_STATUS) as StatusPagamento[]).map((s) => (
                  <option key={s} value={s}>
                    {LABELS_STATUS[s]}
                  </option>
                ))}
              </Select>
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

            <Field
              label="Recorrência"
              hint="Recorrentes entram na projeção de caixa dos próximos meses."
            >
              <Select
                value={form.recorrencia}
                onChange={(e) =>
                  setForm({
                    ...form,
                    recorrencia: e.target.value as Recorrencia,
                  })
                }
              >
                {(Object.keys(LABELS_RECORRENCIA) as Recorrencia[]).map((r) => (
                  <option key={r} value={r}>
                    {LABELS_RECORRENCIA[r]}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <div className="rounded-lg bg-raised px-3 py-2.5 text-sm text-ink-2">
            Valor líquido:{" "}
            <strong className="tabular text-ink">
              {formatCurrency(
                Math.max(
                  0,
                  Number(form.valor || 0) - Number(form.desconto || 0),
                ),
              )}
            </strong>
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

      {cobrando && (
        <ModalCobranca
          aberto
          onFechar={() => setCobrando(null)}
          config={config}
          cliente={clientePorId.get(cobrando.clienteId)}
          valor={valorLiquido(cobrando)}
          vencimento={cobrando.vencimento}
          referencia={base.servicos.find((s) => s.id === cobrando.servicoId)?.nome}
          identificador={cobrando.id}
        />
      )}
    </div>
  );
}
