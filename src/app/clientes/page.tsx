"use client";

import { useMemo, useState } from "react";
import {
  Building2,
  Download,
  Pencil,
  Plus,
  Search,
  Trash2,
  User,
  Users,
} from "lucide-react";
import { useBase, useData } from "@/lib/data-context";
import { usePeriodo } from "@/lib/periodo-context";
import KpiCard from "@/components/KpiCard";
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
import { rankingClientes } from "@/lib/finance";
import { formatCurrency, formatDate, formatNumber, todayISO } from "@/lib/format";
import { Cliente, TipoPessoa } from "@/lib/types";
import { baixarCSV, numeroCSV } from "@/lib/csv";

type Ordenacao = "faturado" | "aberto" | "nome";

const formularioVazio = (): Omit<Cliente, "id"> => ({
  nome: "",
  tipo: "pf",
  documento: "",
  email: "",
  telefone: "",
  origem: "",
  desde: todayISO(),
  ativo: true,
  observacao: "",
});

export default function ClientesPage() {
  const base = useBase();
  const { segmento, clientesCrud } = useData();
  const { periodo } = usePeriodo();
  const rotulos = segmento.labels;

  const [busca, setBusca] = useState("");
  const [ordenacao, setOrdenacao] = useState<Ordenacao>("faturado");
  const [somenteDevedores, setSomenteDevedores] = useState(false);
  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState<Cliente | null>(null);
  const [form, setForm] = useState<Omit<Cliente, "id">>(formularioVazio);

  const ranking = useMemo(() => rankingClientes(base, periodo), [base, periodo]);

  const linhas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const filtrado = ranking
      .filter((l) => !termo || l.cliente.nome.toLowerCase().includes(termo))
      .filter((l) => !somenteDevedores || l.emAberto > 0);

    return [...filtrado].sort((a, b) => {
      if (ordenacao === "nome") return a.cliente.nome.localeCompare(b.cliente.nome, "pt-BR");
      if (ordenacao === "aberto") return b.emAberto - a.emAberto;
      return b.faturado - a.faturado;
    });
  }, [ranking, busca, somenteDevedores, ordenacao]);

  const totais = useMemo(() => {
    const ativos = ranking.filter((l) => l.atendimentos > 0).length;
    const faturado = ranking.reduce((s, l) => s + l.faturado, 0);
    const emAberto = ranking.reduce((s, l) => s + l.emAberto, 0);
    const devedores = ranking.filter((l) => l.atrasado > 0).length;
    // Concentração: quanto os três maiores representam do faturamento do período.
    const top3 = [...ranking].sort((a, b) => b.faturado - a.faturado).slice(0, 3);
    const concentracao =
      faturado > 0 ? (top3.reduce((s, l) => s + l.faturado, 0) / faturado) * 100 : 0;
    return { ativos, faturado, emAberto, devedores, concentracao };
  }, [ranking]);

  const paginacao = usePaginacao(linhas, 25);

  function abrirNovo() {
    setEditando(null);
    setForm({
      ...formularioVazio(),
      tipo: segmento.clientesPessoaJuridica ? "pj" : "pf",
      origem: segmento.origensCliente[0] ?? "",
    });
    setModalAberto(true);
  }

  function abrirEdicao(cliente: Cliente) {
    setEditando(cliente);
    setForm({
      nome: cliente.nome,
      tipo: cliente.tipo,
      documento: cliente.documento ?? "",
      email: cliente.email ?? "",
      telefone: cliente.telefone ?? "",
      origem: cliente.origem ?? "",
      desde: cliente.desde,
      ativo: cliente.ativo,
      observacao: cliente.observacao ?? "",
    });
    setModalAberto(true);
  }

  function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nome.trim()) return;
    const dados: Omit<Cliente, "id"> = {
      ...form,
      nome: form.nome.trim(),
      documento: form.documento?.trim() || undefined,
      email: form.email?.trim() || undefined,
      telefone: form.telefone?.trim() || undefined,
      origem: form.origem?.trim() || undefined,
      observacao: form.observacao?.trim() || undefined,
    };
    if (editando) clientesCrud.update(editando.id, dados);
    else clientesCrud.add(dados);
    setModalAberto(false);
    setEditando(null);
  }

  function remover(cliente: Cliente) {
    const vinculados = base.atendimentos.filter((a) => a.clienteId === cliente.id).length;
    if (vinculados > 0) {
      // Apagar apagaria também o histórico financeiro; inativar preserva o passado.
      clientesCrud.update(cliente.id, { ativo: false });
      return;
    }
    clientesCrud.remove(cliente.id);
  }

  function exportar() {
    baixarCSV(
      `${rotulos.clientes.toLowerCase()}-${periodo.inicio}-${periodo.fim}`,
      [
        rotulos.cliente,
        "Tipo",
        "Documento",
        "E-mail",
        "Telefone",
        "Origem",
        `${rotulos.atendimentos} no período`,
        "Faturado no período",
        "Ticket médio",
        "Em aberto",
        "Vencido",
        "Último atendimento",
        "Situação",
      ],
      linhas.map((l) => [
        l.cliente.nome,
        l.cliente.tipo === "pj" ? "Pessoa jurídica" : "Pessoa física",
        l.cliente.documento ?? "",
        l.cliente.email ?? "",
        l.cliente.telefone ?? "",
        l.cliente.origem ?? "",
        l.atendimentos,
        numeroCSV(l.faturado),
        numeroCSV(l.ticketMedio),
        numeroCSV(l.emAberto),
        numeroCSV(l.atrasado),
        l.ultimoAtendimento ? formatDate(l.ultimoAtendimento) : "",
        l.cliente.ativo ? "Ativo" : "Inativo",
      ])
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-ink">{rotulos.clientes}</h1>
          <p className="mt-0.5 text-sm text-ink-3">
            Carteira com histórico financeiro, ticket médio e valores em aberto.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button icon={Download} onClick={exportar} disabled={linhas.length === 0}>
            Exportar
          </Button>
          <Button variante="primary" icon={Plus} onClick={abrirNovo}>
            Novo {rotulos.cliente.toLowerCase()}
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <KpiCard
          label={`${rotulos.clientes} ativos`}
          value={formatNumber(totais.ativos)}
          hint={`${formatNumber(base.clientes.length)} na carteira`}
        />
        <KpiCard label="Faturado no período" value={formatCurrency(totais.faturado)} />
        <KpiCard
          label="Em aberto"
          value={formatCurrency(totais.emAberto)}
          hint={`${formatNumber(totais.devedores)} com atraso`}
          altaEBoa={false}
        />
        <KpiCard
          label="Concentração top 3"
          value={`${totais.concentracao.toFixed(0)}%`}
          hint="do faturamento do período"
          altaEBoa={false}
        />
      </div>

      <Panel padding={false}>
        <div className="flex flex-wrap items-center gap-3 border-b border-line p-3">
          <div className="relative min-w-[220px] flex-1">
            <Search
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3"
              aria-hidden
            />
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder={`Buscar ${rotulos.cliente.toLowerCase()}…`}
              aria-label="Buscar"
              className="pl-9"
            />
          </div>
          <Segmented
            ariaLabel="Ordenar por"
            valor={ordenacao}
            onChange={setOrdenacao}
            opcoes={[
              { id: "faturado", label: "Faturamento" },
              { id: "aberto", label: "Em aberto" },
              { id: "nome", label: "A–Z" },
            ]}
          />
          <Checkbox
            label="Só com valores em aberto"
            checked={somenteDevedores}
            onChange={(e) => setSomenteDevedores(e.target.checked)}
          />
        </div>

        {linhas.length === 0 ? (
          <EmptyState
            icon={Users}
            titulo={`Nenhum ${rotulos.cliente.toLowerCase()} encontrado`}
            descricao="Ajuste a busca ou cadastre o primeiro registro da carteira."
            acao={
              <Button variante="primary" icon={Plus} onClick={abrirNovo}>
                Novo {rotulos.cliente.toLowerCase()}
              </Button>
            }
          />
        ) : (
          <TableWrap>
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="border-b border-line">
                  <Th>{rotulos.cliente}</Th>
                  <Th>Contato</Th>
                  <Th>Origem</Th>
                  <Th align="right">{rotulos.atendimentos}</Th>
                  <Th align="right">Faturado</Th>
                  <Th align="right">Ticket médio</Th>
                  <Th align="right">Em aberto</Th>
                  <Th>Último</Th>
                  <Th align="right">Ações</Th>
                </tr>
              </thead>
              <tbody>
                {paginacao.visiveis.map((l) => {
                  const Icone = l.cliente.tipo === "pj" ? Building2 : User;
                  return (
                    <tr
                      key={l.cliente.id}
                      className="border-b border-line last:border-0 hover:bg-raised"
                    >
                      <Td>
                        <div className="flex items-center gap-2">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-neutral-soft text-ink-3">
                            <Icone size={14} aria-hidden />
                          </span>
                          <div className="min-w-0">
                            <p className="truncate font-medium text-ink">{l.cliente.nome}</p>
                            <p className="truncate text-[11px] text-ink-3">
                              {l.cliente.documento || (l.cliente.tipo === "pj" ? "CNPJ —" : "CPF —")}
                              {!l.cliente.ativo && " · inativo"}
                            </p>
                          </div>
                        </div>
                      </Td>
                      <Td>
                        <p className="truncate">{l.cliente.email || "—"}</p>
                        <p className="truncate text-[11px] text-ink-3">
                          {l.cliente.telefone || ""}
                        </p>
                      </Td>
                      <Td>{l.cliente.origem || "—"}</Td>
                      <Td className="tabular text-right">{formatNumber(l.atendimentos)}</Td>
                      <Td className="tabular text-right font-medium text-ink">
                        {formatCurrency(l.faturado)}
                      </Td>
                      <Td className="tabular text-right">{formatCurrency(l.ticketMedio)}</Td>
                      <Td className="tabular text-right">
                        <span className={l.atrasado > 0 ? "font-medium text-crit-ink" : ""}>
                          {formatCurrency(l.emAberto)}
                        </span>
                        {/* Só detalha quando parte do saldo ainda está a vencer —
                            repetir o mesmo número duas vezes não informa nada. */}
                        {l.atrasado > 0 && (
                          <p className="text-[11px] text-crit-ink">
                            {l.atrasado === l.emAberto
                              ? "tudo vencido"
                              : `${formatCurrency(l.atrasado)} vencido`}
                          </p>
                        )}
                      </Td>
                      <Td className="tabular whitespace-nowrap">
                        {l.ultimoAtendimento ? formatDate(l.ultimoAtendimento) : "—"}
                      </Td>
                      <Td>
                        <div className="flex items-center justify-end gap-0.5">
                          <button
                            onClick={() => abrirEdicao(l.cliente)}
                            aria-label={`Editar ${l.cliente.nome}`}
                            className="rounded-md p-1.5 text-ink-3 hover:bg-raised hover:text-ink"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={() => remover(l.cliente)}
                            aria-label={`Remover ${l.cliente.nome}`}
                            title="Remove; se houver histórico, apenas inativa"
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
        <Paginacao {...paginacao} rotulo="registros" />
      </Panel>

      <Modal
        aberto={modalAberto}
        onFechar={() => setModalAberto(false)}
        titulo={editando ? `Editar ${rotulos.cliente.toLowerCase()}` : `Novo ${rotulos.cliente.toLowerCase()}`}
        largura="max-w-xl"
      >
        <form onSubmit={salvar} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Nome" className="sm:col-span-2">
              <Input
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                placeholder={segmento.clientesPessoaJuridica ? "Razão social" : "Nome completo"}
                required
              />
            </Field>
            <Field label="Tipo">
              <Select
                value={form.tipo}
                onChange={(e) => setForm({ ...form, tipo: e.target.value as TipoPessoa })}
              >
                <option value="pf">Pessoa física</option>
                <option value="pj">Pessoa jurídica</option>
              </Select>
            </Field>
            <Field label={form.tipo === "pj" ? "CNPJ" : "CPF"}>
              <Input
                value={form.documento}
                onChange={(e) => setForm({ ...form, documento: e.target.value })}
                placeholder={form.tipo === "pj" ? "00.000.000/0001-00" : "000.000.000-00"}
              />
            </Field>
            <Field label="E-mail">
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="contato@exemplo.com.br"
              />
            </Field>
            <Field label="Telefone">
              <Input
                value={form.telefone}
                onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                placeholder="(00) 00000-0000"
              />
            </Field>
            <Field label="Origem" hint="De onde veio — ajuda a medir o retorno da captação.">
              <Select
                value={form.origem}
                onChange={(e) => setForm({ ...form, origem: e.target.value })}
              >
                <option value="">Não informado</option>
                {segmento.origensCliente.map((origem) => (
                  <option key={origem} value={origem}>
                    {origem}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={`${rotulos.cliente} desde`}>
              <Input
                type="date"
                value={form.desde}
                onChange={(e) => setForm({ ...form, desde: e.target.value })}
              />
            </Field>
          </div>

          <Checkbox
            label="Cliente ativo"
            checked={form.ativo}
            onChange={(e) => setForm({ ...form, ativo: e.target.checked })}
          />

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
