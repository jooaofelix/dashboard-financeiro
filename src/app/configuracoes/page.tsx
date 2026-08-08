"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarCheck,
  CalendarPlus,
  Check,
  CheckCircle2,
  Cloud,
  HardDrive,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { useBase, useData } from "@/lib/data-context";
import {
  Button,
  Checkbox,
  Field,
  Input,
  Modal,
  Panel,
  Select,
  TableWrap,
  Td,
  Th,
} from "@/components/ui";
import { SEGMENTOS } from "@/lib/segments";
import {
  formatCurrency,
  formatMonthKey,
  formatNumber,
  formatPercent,
  monthKey,
  todayISO,
} from "@/lib/format";
import {
  crescimentoMensalPercent,
  incrementoMensal,
  PlanoCrescimento,
  planoValido,
  trajetoria,
} from "@/lib/plano";
import { Configuracao, Profissional, Servico } from "@/lib/types";
import { useAuth } from "@/lib/auth-context";
import { usePeriodo } from "@/lib/periodo-context";
import {
  atendimentoParaEvento,
  baixarICS,
  eventosRelevantes,
  sincronizarEventos,
  TokenExpirado,
} from "@/lib/agenda";
import { dentroDoPeriodo } from "@/lib/periodo";

export default function ConfiguracoesPage() {
  const base = useBase();
  const {
    config,
    segmento,
    salvarConfig,
    servicosCrud,
    profissionaisCrud,
    recarregarDemo,
    limparTudo,
    usandoFirebase,
    ocupado,
  } = useData();
  const rotulos = segmento.labels;

  const [confirmacao, setConfirmacao] = useState<null | {
    titulo: string;
    descricao: string;
    rotuloAcao: string;
    acao: () => Promise<void> | void;
  }>(null);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-xl font-semibold text-ink">Configurações</h1>
        <p className="mt-0.5 text-sm text-ink-3">
          O segmento define o vocabulário e os presets; os parâmetros financeiros alimentam
          metas, impostos e alertas.
        </p>
      </header>

      <SeletorSegmento
        segmentoAtual={config.segmentoId}
        onEscolher={(id) => salvarConfig({ segmentoId: id })}
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Panel
          titulo="Identificação"
          descricao="Aparece no menu lateral e nos relatórios exportados."
        >
          <div className="flex flex-col gap-3">
            <Field label="Nome da empresa">
              <Input
                value={config.empresa}
                onChange={(e) => salvarConfig({ empresa: e.target.value })}
                placeholder="Nome fantasia"
              />
            </Field>
            <div className="flex flex-col gap-3 rounded-lg bg-raised px-3 py-3">
              <div>
                <p className="mb-1 text-xs font-medium text-ink-2">Vocabulário ativo</p>
                <p className="text-xs leading-relaxed text-ink-3">
                  {rotulos.cliente} · {rotulos.atendimento} · {rotulos.servico} ·{" "}
                  {rotulos.profissional}
                </p>
              </div>
              <div>
                <p className="mb-1.5 text-xs font-medium text-ink-2">
                  Categorias de despesa sugeridas
                </p>
                <Chips itens={segmento.categoriasDespesa} />
              </div>
              <div>
                <p className="mb-1.5 text-xs font-medium text-ink-2">Centros de custo</p>
                <Chips itens={segmento.centrosCusto} />
              </div>
            </div>
          </div>
        </Panel>

        <Panel
          titulo="Parâmetros financeiros"
          descricao="Usados no cálculo de impostos, metas, ponto de equilíbrio e alertas."
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field
              label="Alíquota efetiva de impostos (%)"
              hint="Simples, presumido, ISS — o percentual que sai do faturamento."
            >
              <Input
                type="number"
                min="0"
                max="60"
                step="0.1"
                value={config.aliquotaImpostos}
                onChange={(e) => salvarConfig({ aliquotaImpostos: Number(e.target.value) })}
              />
            </Field>
            <Field label="Meta de faturamento mensal">
              <Input
                type="number"
                min="0"
                step="100"
                value={config.metaReceitaMensal}
                onChange={(e) => salvarConfig({ metaReceitaMensal: Number(e.target.value) })}
              />
            </Field>
            <Field label="Teto de despesa mensal">
              <Input
                type="number"
                min="0"
                step="100"
                value={config.tetoDespesaMensal}
                onChange={(e) => salvarConfig({ tetoDespesaMensal: Number(e.target.value) })}
              />
            </Field>
            <Field label="Saldo inicial de caixa" hint="O que já existia antes do primeiro lançamento.">
              <Input
                type="number"
                step="100"
                value={config.saldoInicialCaixa}
                onChange={(e) => salvarConfig({ saldoInicialCaixa: Number(e.target.value) })}
              />
            </Field>
            <Field label="Reserva mínima de caixa" hint="Dispara o alerta no fluxo projetado.">
              <Input
                type="number"
                min="0"
                step="100"
                value={config.reservaMinimaCaixa}
                onChange={(e) => salvarConfig({ reservaMinimaCaixa: Number(e.target.value) })}
              />
            </Field>
            <Field label="Alertar vencimentos com (dias)">
              <Input
                type="number"
                min="1"
                max="60"
                value={config.diasAlertaVencimento}
                onChange={(e) => salvarConfig({ diasAlertaVencimento: Number(e.target.value) })}
              />
            </Field>
          </div>
        </Panel>
      </div>

      <PlanoDeCrescimento config={config} salvarConfig={salvarConfig} />

      <CatalogoServicos
        servicos={base.servicos}
        rotuloServico={rotulos.servico}
        rotuloServicos={rotulos.servicos}
        crud={servicosCrud}
      />

      <Equipe
        profissionais={base.profissionais}
        rotuloProfissional={rotulos.profissional}
        rotuloProfissionais={rotulos.profissionais}
        papeis={segmento.papeis}
        crud={profissionaisCrud}
      />

      <PainelAgenda />

      <Panel
        titulo="Dados"
        descricao={
          usandoFirebase
            ? "Este workspace grava no Firestore — as ações abaixo afetam todos os dispositivos conectados."
            : "Este workspace grava no navegador. Limpar os dados do site apaga tudo."
        }
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-2.5 rounded-lg bg-raised px-3 py-3 text-xs text-ink-2">
            {usandoFirebase ? (
              <Cloud size={15} className="mt-px shrink-0 text-ink-3" aria-hidden />
            ) : (
              <HardDrive size={15} className="mt-px shrink-0 text-ink-3" aria-hidden />
            )}
            <div>
              <p className="font-medium text-ink">
                {usandoFirebase ? "Firebase (Firestore)" : "Armazenamento local"}
              </p>
              <p className="mt-0.5 text-ink-3">
                {formatNumber(base.clientes.length)} {rotulos.clientes.toLowerCase()} ·{" "}
                {formatNumber(base.atendimentos.length)} lançamentos ·{" "}
                {formatNumber(base.transacoes.length)} contas ·{" "}
                {formatNumber(base.servicos.length)} {rotulos.servicos.toLowerCase()}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              icon={RefreshCw}
              disabled={ocupado}
              onClick={() =>
                setConfirmacao({
                  titulo: "Recarregar dados de exemplo",
                  descricao: `Isso apaga tudo que está cadastrado e gera 12 meses de operação fictícia para o segmento "${segmento.nome}". Use para explorar o sistema ou trocar de segmento com dados coerentes.`,
                  rotuloAcao: "Recarregar exemplo",
                  acao: () => recarregarDemo(config.segmentoId),
                })
              }
            >
              Recarregar dados de exemplo
            </Button>
            <Button
              variante="danger"
              icon={Trash2}
              disabled={ocupado}
              onClick={() =>
                setConfirmacao({
                  titulo: "Começar do zero",
                  descricao:
                    "Remove todos os lançamentos, contas, clientes, serviços e equipe. As configurações são mantidas. Não há como desfazer.",
                  rotuloAcao: "Apagar tudo",
                  acao: limparTudo,
                })
              }
            >
              Começar do zero
            </Button>
          </div>
        </div>
      </Panel>

      <Modal
        aberto={confirmacao !== null}
        onFechar={() => setConfirmacao(null)}
        titulo={confirmacao?.titulo ?? ""}
        largura="max-w-md"
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-2.5 rounded-lg bg-crit-soft px-3 py-3 text-sm text-crit-ink">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden />
            <p>{confirmacao?.descricao}</p>
          </div>
          <div className="flex justify-end gap-2">
            <Button onClick={() => setConfirmacao(null)}>Cancelar</Button>
            <Button
              variante="danger"
              onClick={async () => {
                const acao = confirmacao?.acao;
                setConfirmacao(null);
                await acao?.();
              }}
            >
              {confirmacao?.rotuloAcao}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

/**
 * Ligação com o Google Agenda.
 *
 * O arquivo `.ics` funciona para todo mundo, sempre. A sincronização direta
 * exige o consentimento do Google e vale enquanto o token durar (cerca de uma
 * hora) — sem servidor não há como renová-lo em segundo plano, então ela é uma
 * ação explícita, e a tela diz isso em vez de fingir que é automática.
 */
function PainelAgenda() {
  const base = useBase();
  const { segmento } = useData();
  const { conectarAgenda, googleDisponivel } = useAuth();
  const { periodo } = usePeriodo();

  const [token, setToken] = useState<string | null>(null);
  const [ocupadoAgenda, setOcupadoAgenda] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const eventos = useMemo(() => {
    const clientePorId = new Map(base.clientes.map((c) => [c.id, c]));
    const servicoPorId = new Map(base.servicos.map((s) => [s.id, s]));
    const profissionalPorId = new Map(base.profissionais.map((p) => [p.id, p]));
    const daJanela = base.atendimentos.filter(
      (a) => a.status !== "cancelado" && dentroDoPeriodo(a.data, periodo)
    );
    return eventosRelevantes(
      daJanela.map((a) =>
        atendimentoParaEvento(a, {
          cliente: clientePorId.get(a.clienteId),
          servico: a.servicoId ? servicoPorId.get(a.servicoId) : undefined,
          profissional: a.profissionalId ? profissionalPorId.get(a.profissionalId) : undefined,
          rotuloAtendimento: segmento.labels.atendimento,
        })
      ),
      todayISO()
    );
  }, [base, periodo, segmento.labels.atendimento]);

  async function conectar() {
    setErro(null);
    setAviso(null);
    setOcupadoAgenda(true);
    try {
      setToken(await conectarAgenda());
      setAviso("Google Agenda conectado.");
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não foi possível conectar.");
    } finally {
      setOcupadoAgenda(false);
    }
  }

  async function sincronizar() {
    if (!token) return;
    setErro(null);
    setAviso(null);
    setOcupadoAgenda(true);
    try {
      const { criados, falhas } = await sincronizarEventos(eventos, token);
      setAviso(
        `${criados} evento(s) criado(s) na sua agenda` +
          (falhas > 0 ? ` · ${falhas} falharam` : "") +
          "."
      );
    } catch (falha) {
      if (falha instanceof TokenExpirado) setToken(null);
      setErro(falha instanceof Error ? falha.message : "Não foi possível sincronizar.");
    } finally {
      setOcupadoAgenda(false);
    }
  }

  return (
    <Panel
      titulo="Google Agenda"
      descricao={`Leve os ${segmento.labels.atendimentos.toLowerCase()} do período para a sua agenda.`}
    >
      <div className="flex flex-col gap-4">
        <div className="rounded-lg bg-raised px-3 py-3 text-xs leading-relaxed text-ink-2">
          {eventos.length > 0 ? (
            <>
              <strong className="text-ink">{formatNumber(eventos.length)}</strong> evento(s)
              de hoje em diante dentro do período selecionado.
            </>
          ) : (
            "Nenhum evento futuro no período selecionado — ajuste o filtro de período no topo."
          )}
        </div>

        {erro && (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-lg bg-crit-soft px-3 py-2.5 text-sm text-crit-ink"
          >
            <AlertTriangle size={15} className="mt-0.5 shrink-0" aria-hidden />
            {erro}
          </p>
        )}
        {aviso && (
          <p
            role="status"
            className="flex items-start gap-2 rounded-lg bg-good-soft px-3 py-2.5 text-sm text-good-ink"
          >
            <CheckCircle2 size={15} className="mt-0.5 shrink-0" aria-hidden />
            {aviso}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <Button
            icon={CalendarPlus}
            onClick={() => baixarICS(`agenda-base-${todayISO()}`, eventos)}
            disabled={eventos.length === 0}
          >
            Baixar .ics
          </Button>

          {googleDisponivel &&
            (token ? (
              <Button
                variante="primary"
                icon={ocupadoAgenda ? Loader2 : CalendarCheck}
                onClick={sincronizar}
                disabled={ocupadoAgenda || eventos.length === 0}
              >
                {ocupadoAgenda ? "Enviando…" : "Enviar para o Google Agenda"}
              </Button>
            ) : (
              <Button icon={CalendarCheck} onClick={conectar} disabled={ocupadoAgenda}>
                {ocupadoAgenda ? "Conectando…" : "Conectar Google Agenda"}
              </Button>
            ))}
        </div>

        <p className="text-xs leading-relaxed text-ink-3">
          O arquivo <strong>.ics</strong> importa em Google, Apple e Outlook e não
          depende de conta nenhuma.
          {googleDisponivel
            ? " A conexão direta pede permissão para criar eventos (não lê sua agenda) e vale por cerca de uma hora — depois disso basta conectar de novo."
            : " A conexão direta com o Google exige o Firebase configurado."}
        </p>
      </div>
    </Panel>
  );
}

function Chips({ itens }: { itens: string[] }) {
  return (
    <ul className="flex flex-wrap gap-1.5">
      {itens.map((item) => (
        <li
          key={item}
          className="rounded-md border border-line bg-surface px-2 py-0.5 text-[11px] text-ink-2"
        >
          {item}
        </li>
      ))}
    </ul>
  );
}

function SeletorSegmento({
  segmentoAtual,
  onEscolher,
}: {
  segmentoAtual: string;
  onEscolher: (id: string) => void;
}) {
  return (
    <Panel
      titulo="Segmento do negócio"
      descricao="Muda o vocabulário da interface e os presets de serviços, categorias e centros de custo. Os dados já lançados continuam intactos."
    >
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {SEGMENTOS.map((s) => {
          const ativo = s.id === segmentoAtual;
          return (
            <button
              key={s.id}
              onClick={() => onEscolher(s.id)}
              aria-pressed={ativo}
              className={`flex flex-col gap-1.5 rounded-xl border p-3.5 text-left transition-colors ${
                ativo
                  ? "border-brand bg-brand-soft"
                  : "border-line hover:border-line-strong hover:bg-raised"
              }`}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-ink">{s.nome}</span>
                {ativo && <Check size={16} strokeWidth={2.5} className="shrink-0 text-brand" />}
              </span>
              <span className="text-xs leading-relaxed text-ink-3">{s.descricao}</span>
              <span className="mt-1 text-[11px] text-ink-3">
                {s.labels.cliente} · {s.labels.atendimento} · {s.labels.servico}
              </span>
            </button>
          );
        })}
      </div>
    </Panel>
  );
}

function CatalogoServicos({
  servicos,
  rotuloServico,
  rotuloServicos,
  crud,
}: {
  servicos: Servico[];
  rotuloServico: string;
  rotuloServicos: string;
  crud: { add: (s: Omit<Servico, "id">) => void; update: (id: string, s: Partial<Servico>) => void; remove: (id: string) => void };
}) {
  const [aberto, setAberto] = useState(false);
  const [editando, setEditando] = useState<Servico | null>(null);
  const [form, setForm] = useState<Omit<Servico, "id">>({
    nome: "",
    categoria: "",
    valorPadrao: 0,
    custoDireto: 0,
    duracaoMin: 0,
    ativo: true,
  });

  const ordenados = useMemo(
    () => [...servicos].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")),
    [servicos]
  );

  function abrirNovo() {
    setEditando(null);
    setForm({ nome: "", categoria: "", valorPadrao: 0, custoDireto: 0, duracaoMin: 0, ativo: true });
    setAberto(true);
  }

  function abrirEdicao(s: Servico) {
    setEditando(s);
    setForm({ ...s });
    setAberto(true);
  }

  function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nome.trim()) return;
    const dados = {
      ...form,
      nome: form.nome.trim(),
      categoria: form.categoria.trim() || "Geral",
    };
    if (editando) crud.update(editando.id, dados);
    else crud.add(dados);
    setAberto(false);
  }

  return (
    <Panel
      titulo={rotuloServicos}
      descricao="Valor padrão preenche o formulário de lançamento; custo direto entra na margem por serviço."
      padding={false}
      acoes={
        <Button icon={Plus} onClick={abrirNovo}>
          Adicionar
        </Button>
      }
    >
      <TableWrap>
        <table className="w-full min-w-[640px]">
          <thead>
            <tr className="border-b border-line">
              <Th>{rotuloServico}</Th>
              <Th>Categoria</Th>
              <Th align="right">Valor padrão</Th>
              <Th align="right">Custo direto</Th>
              <Th align="right">Margem</Th>
              <Th align="right">Duração</Th>
              <Th align="right">Ações</Th>
            </tr>
          </thead>
          <tbody>
            {ordenados.map((s) => {
              const margem =
                s.valorPadrao > 0 ? ((s.valorPadrao - s.custoDireto) / s.valorPadrao) * 100 : 0;
              return (
                <tr key={s.id} className="border-b border-line last:border-0">
                  <Td className="font-medium text-ink">
                    {s.nome}
                    {!s.ativo && (
                      <span className="ml-1.5 text-[11px] font-normal text-ink-3">(inativo)</span>
                    )}
                  </Td>
                  <Td>{s.categoria}</Td>
                  <Td className="tabular text-right">{formatCurrency(s.valorPadrao)}</Td>
                  <Td className="tabular text-right">{formatCurrency(s.custoDireto)}</Td>
                  <Td className="tabular text-right">{formatPercent(margem, 0)}</Td>
                  <Td className="tabular text-right">
                    {s.duracaoMin > 0 ? `${s.duracaoMin} min` : "—"}
                  </Td>
                  <Td>
                    <div className="flex items-center justify-end gap-0.5">
                      <button
                        onClick={() => abrirEdicao(s)}
                        aria-label={`Editar ${s.nome}`}
                        className="rounded-md p-1.5 text-ink-3 hover:bg-raised hover:text-ink"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => crud.remove(s.id)}
                        aria-label={`Remover ${s.nome}`}
                        className="rounded-md p-1.5 text-ink-3 hover:bg-crit-soft hover:text-crit-ink"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </Td>
                </tr>
              );
            })}
            {ordenados.length === 0 && (
              <tr>
                <Td colSpan={7} className="py-8 text-center text-ink-3">
                  Nenhum item cadastrado.
                </Td>
              </tr>
            )}
          </tbody>
        </table>
      </TableWrap>

      <Modal
        aberto={aberto}
        onFechar={() => setAberto(false)}
        titulo={editando ? `Editar ${rotuloServico.toLowerCase()}` : `Novo ${rotuloServico.toLowerCase()}`}
        largura="max-w-lg"
      >
        <form onSubmit={salvar} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Nome" className="sm:col-span-2">
              <Input
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                required
              />
            </Field>
            <Field label="Categoria">
              <Input
                value={form.categoria}
                onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                placeholder="Ex: Consultas, Projetos"
              />
            </Field>
            <Field label="Duração (min)">
              <Input
                type="number"
                min="0"
                step="5"
                value={form.duracaoMin}
                onChange={(e) => setForm({ ...form, duracaoMin: Number(e.target.value) })}
              />
            </Field>
            <Field label="Valor padrão">
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.valorPadrao}
                onChange={(e) => setForm({ ...form, valorPadrao: Number(e.target.value) })}
                required
              />
            </Field>
            <Field label="Custo direto" hint="Material, laboratório, taxa — o que só existe quando o serviço acontece.">
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.custoDireto}
                onChange={(e) => setForm({ ...form, custoDireto: Number(e.target.value) })}
              />
            </Field>
          </div>
          <Checkbox
            label="Disponível para novos lançamentos"
            checked={form.ativo}
            onChange={(e) => setForm({ ...form, ativo: e.target.checked })}
          />
          <div className="flex justify-end gap-2 border-t border-line pt-4">
            <Button type="button" onClick={() => setAberto(false)}>
              Cancelar
            </Button>
            <Button type="submit" variante="primary">
              {editando ? "Salvar" : "Adicionar"}
            </Button>
          </div>
        </form>
      </Modal>
    </Panel>
  );
}

function Equipe({
  profissionais,
  rotuloProfissional,
  rotuloProfissionais,
  papeis,
  crud,
}: {
  profissionais: Profissional[];
  rotuloProfissional: string;
  rotuloProfissionais: string;
  papeis: string[];
  crud: {
    add: (p: Omit<Profissional, "id">) => void;
    update: (id: string, p: Partial<Profissional>) => void;
    remove: (id: string) => void;
  };
}) {
  const [aberto, setAberto] = useState(false);
  const [editando, setEditando] = useState<Profissional | null>(null);
  const [form, setForm] = useState<Omit<Profissional, "id">>({
    nome: "",
    papel: papeis[0] ?? "",
    comissaoPercent: 0,
    ativo: true,
  });

  function abrirNovo() {
    setEditando(null);
    setForm({ nome: "", papel: papeis[0] ?? "", comissaoPercent: 0, ativo: true });
    setAberto(true);
  }

  function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nome.trim()) return;
    const dados = { ...form, nome: form.nome.trim() };
    if (editando) crud.update(editando.id, dados);
    else crud.add(dados);
    setAberto(false);
  }

  return (
    <Panel
      titulo={rotuloProfissionais}
      descricao="O percentual de comissão alimenta o relatório de repasses."
      padding={false}
      acoes={
        <Button icon={Plus} onClick={abrirNovo}>
          Adicionar
        </Button>
      }
    >
      <TableWrap>
        <table className="w-full min-w-[520px]">
          <thead>
            <tr className="border-b border-line">
              <Th>{rotuloProfissional}</Th>
              <Th>Papel</Th>
              <Th align="right">Comissão</Th>
              <Th align="right">Ações</Th>
            </tr>
          </thead>
          <tbody>
            {profissionais.map((p) => (
              <tr key={p.id} className="border-b border-line last:border-0">
                <Td className="font-medium text-ink">
                  {p.nome}
                  {!p.ativo && (
                    <span className="ml-1.5 text-[11px] font-normal text-ink-3">(inativo)</span>
                  )}
                </Td>
                <Td>{p.papel}</Td>
                <Td className="tabular text-right">{formatPercent(p.comissaoPercent, 0)}</Td>
                <Td>
                  <div className="flex items-center justify-end gap-0.5">
                    <button
                      onClick={() => {
                        setEditando(p);
                        setForm({ ...p });
                        setAberto(true);
                      }}
                      aria-label={`Editar ${p.nome}`}
                      className="rounded-md p-1.5 text-ink-3 hover:bg-raised hover:text-ink"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => crud.remove(p.id)}
                      aria-label={`Remover ${p.nome}`}
                      className="rounded-md p-1.5 text-ink-3 hover:bg-crit-soft hover:text-crit-ink"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </Td>
              </tr>
            ))}
            {profissionais.length === 0 && (
              <tr>
                <Td colSpan={4} className="py-8 text-center text-ink-3">
                  Nenhum registro na equipe.
                </Td>
              </tr>
            )}
          </tbody>
        </table>
      </TableWrap>

      <Modal
        aberto={aberto}
        onFechar={() => setAberto(false)}
        titulo={editando ? "Editar registro" : `Novo ${rotuloProfissional.toLowerCase()}`}
        largura="max-w-md"
      >
        <form onSubmit={salvar} className="flex flex-col gap-4">
          <Field label="Nome">
            <Input
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              required
            />
          </Field>
          <Field label="Papel">
            <Select
              value={form.papel}
              onChange={(e) => setForm({ ...form, papel: e.target.value })}
            >
              {[...new Set([...papeis, form.papel].filter(Boolean))].map((papel) => (
                <option key={papel} value={papel}>
                  {papel}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Comissão (%)">
            <Input
              type="number"
              min="0"
              max="100"
              step="0.5"
              value={form.comissaoPercent}
              onChange={(e) => setForm({ ...form, comissaoPercent: Number(e.target.value) })}
            />
          </Field>
          <Checkbox
            label="Ativo"
            checked={form.ativo}
            onChange={(e) => setForm({ ...form, ativo: e.target.checked })}
          />
          <div className="flex justify-end gap-2 border-t border-line pt-4">
            <Button type="button" onClick={() => setAberto(false)}>
              Cancelar
            </Button>
            <Button type="submit" variante="primary">
              {editando ? "Salvar" : "Adicionar"}
            </Button>
          </div>
        </form>
      </Modal>
    </Panel>
  );
}

/* -------------------------------------------------------------------------- */

/**
 * O plano traçado nas boas-vindas, editável depois.
 *
 * Mexer no ponto de partida ou no prazo redesenha a rampa inteira, então a
 * prévia mostra na hora o que cada alteração custa por mês — e o botão de
 * recomeçar existe porque, seis meses depois, "de onde eu saí" já não é o mesmo
 * lugar: replanejar a partir de hoje é mais honesto que arrastar uma base velha.
 */
function PlanoDeCrescimento({
  config,
  salvarConfig,
}: {
  config: Configuracao;
  salvarConfig: (patch: Partial<Configuracao>) => void;
}) {
  const mesAtual = monthKey(todayISO());
  const inicio = config.planoInicio ?? mesAtual;
  const horizonte = config.metaHorizonteMeses ?? 0;

  const plano: PlanoCrescimento = {
    faturamentoBase: config.faturamentoBase ?? 0,
    metaReceitaMensal: config.metaReceitaMensal,
    horizonteMeses: horizonte,
    inicio,
  };
  const ativo = planoValido(plano);
  const passo = ativo ? incrementoMensal(plano) : 0;
  const percent = ativo ? crescimentoMensalPercent(plano) : null;
  const marcos = ativo ? trajetoria(plano) : [];
  const fim = marcos[marcos.length - 1];

  return (
    <Panel
      titulo="Plano de crescimento"
      descricao="A rampa que leva do faturamento de partida até a meta mensal, marco a marco."
      acoes={
        ativo ? (
          <Button
            onClick={() =>
              salvarConfig({ planoInicio: mesAtual, faturamentoBase: config.faturamentoBase ?? 0 })
            }
          >
            <RefreshCw size={15} aria-hidden />
            Recomeçar deste mês
          </Button>
        ) : undefined
      }
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Field
          label="Faturamento de partida"
          hint="O patamar de onde a rampa começa a contar."
        >
          <Input
            type="number"
            min="0"
            step="100"
            value={config.faturamentoBase ?? 0}
            onChange={(e) => salvarConfig({ faturamentoBase: Number(e.target.value) })}
          />
        </Field>
        <Field label="Meta de faturamento mensal" hint="A mesma meta dos parâmetros financeiros.">
          <Input
            type="number"
            min="0"
            step="100"
            value={config.metaReceitaMensal}
            onChange={(e) => salvarConfig({ metaReceitaMensal: Number(e.target.value) })}
          />
        </Field>
        <Field label="Prazo (meses)" hint="Zero desliga o plano e mantém só a meta mensal.">
          <Input
            type="number"
            min="0"
            max="60"
            value={horizonte}
            onChange={(e) =>
              salvarConfig({
                metaHorizonteMeses: Number(e.target.value),
                // Um plano sem mês de partida não tem rampa; ao ligar o prazo,
                // a partida é este mês.
                planoInicio: config.planoInicio ?? mesAtual,
              })
            }
          />
        </Field>
      </div>

      {ativo ? (
        <p className="mt-4 rounded-xl border border-line bg-raised px-4 py-3 text-sm leading-relaxed text-ink-2">
          Partindo de <strong className="font-semibold text-ink">{formatCurrency(plano.faturamentoBase)}</strong> em{" "}
          {formatMonthKey(inicio)}, são{" "}
          <strong className="font-semibold text-ink">
            {passo >= 0 ? "+" : "−"}
            {formatCurrency(Math.abs(passo))}
          </strong>{" "}
          por mês
          {percent !== null && ` (${formatPercent(percent, 1)} ao mês)`} até{" "}
          <strong className="font-semibold text-ink">{formatCurrency(plano.metaReceitaMensal)}</strong> em{" "}
          {formatMonthKey(fim.chave)}.
        </p>
      ) : (
        <p className="mt-4 rounded-xl border border-line bg-raised px-4 py-3 text-sm leading-relaxed text-ink-2">
          Sem prazo definido, a meta mensal continua valendo no medidor do painel —
          mas não há trajetória para acompanhar. Informe um prazo para criar a rampa.
        </p>
      )}
    </Panel>
  );
}
