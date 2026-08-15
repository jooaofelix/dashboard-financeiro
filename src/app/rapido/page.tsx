"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  CircleDollarSign,
  Clock,
  MessageCircle,
  RotateCcw,
  Wallet,
} from "lucide-react";
import { useBase, useData } from "@/lib/data-context";
import { estaEmAberto, valorLiquido } from "@/lib/finance";
import { formatCompact, formatCurrency, formatDateShort, todayISO } from "@/lib/format";
import ModalCobranca from "@/components/ModalCobranca";
import { Atendimento } from "@/lib/types";

/**
 * Lançamento rápido — a tela para quem está de pé, no celular, entre um
 * atendimento e outro.
 *
 * O resto do sistema é feito para *entender* o negócio; esta tela é feita para
 * *alimentar* o sistema em segundos e sair. Por isso ela quebra de propósito
 * três regras das outras telas:
 *
 * - **não tem filtro de período** — o que se lança aqui é sempre hoje;
 * - **não tem campo opcional** — vencimento, desconto, forma de pagamento,
 *   profissional e observação ficam com o padrão e podem ser ajustados depois
 *   na tela completa, num momento em que se está sentado;
 * - **cliente novo nasce aqui mesmo**, digitando o nome. Obrigar a cadastrar o
 *   cliente antes de cobrar é o tipo de burocracia que faz o lançamento não
 *   acontecer — e um lançamento que não acontece some do faturamento.
 *
 * Alvos de toque grandes (56px), teclado numérico no valor e o botão principal
 * ao alcance do polegar.
 */

type Aba = "receita" | "despesa" | "receber";

const ALTURA_TOQUE = "h-14";

export default function RapidoPage() {
  const base = useBase();
  const { segmento, config, atendimentosCrud, clientesCrud, transacoesCrud } = useData();
  const rotulos = segmento.labels;
  const hoje = todayISO();

  const [aba, setAba] = useState<Aba>("receita");
  const [cobrando, setCobrando] = useState<Atendimento | null>(null);
  const [confirmacao, setConfirmacao] = useState<string | null>(null);

  function confirmar(mensagem: string) {
    setConfirmacao(mensagem);
    window.setTimeout(() => setConfirmacao((atual) => (atual === mensagem ? null : atual)), 4000);
  }

  const emAberto = useMemo(
    () =>
      base.atendimentos
        .filter(estaEmAberto)
        .sort((a, b) => a.vencimento.localeCompare(b.vencimento)),
    [base.atendimentos]
  );

  const entrouHoje = useMemo(
    () =>
      base.atendimentos
        .filter((a) => a.pagoEm === hoje)
        .reduce((total, a) => total + valorLiquido(a), 0),
    [base.atendimentos, hoje]
  );

  const lancadosHoje = useMemo(
    () => base.atendimentos.filter((a) => a.data === hoje).length,
    [base.atendimentos, hoje]
  );

  const vencido = useMemo(
    () =>
      emAberto
        .filter((a) => a.vencimento < hoje)
        .reduce((total, a) => total + valorLiquido(a), 0),
    [emAberto, hoje]
  );

  return (
    <div className="mx-auto flex w-full max-w-[560px] flex-col gap-4">
      <header>
        <h1 className="text-xl font-semibold text-ink">Lançamento rápido</h1>
        <p className="mt-0.5 text-sm text-ink-3">
          O essencial em poucos toques.
        </p>
      </header>

      <section aria-label="Resumo de hoje" className="grid grid-cols-3 gap-2">
        <Resumo icone={Wallet} rotulo="Entrou hoje" valor={formatCompact(entrouHoje)} />
        <Resumo
          icone={CircleDollarSign}
          rotulo="Lançados"
          valor={String(lancadosHoje)}
        />
        <Resumo
          icone={Clock}
          rotulo="Vencido"
          valor={formatCompact(vencido)}
          alerta={vencido > 0}
        />
      </section>

      {confirmacao && (
        <p
          role="status"
          className="flex items-center gap-2 rounded-xl bg-good-soft px-4 py-3 text-sm font-medium text-good-ink"
        >
          <CheckCircle2 size={17} className="shrink-0" aria-hidden />
          {confirmacao}
        </p>
      )}

      <div role="tablist" aria-label="O que você quer fazer" className="grid grid-cols-3 gap-2">
        {(
          [
            ["receita", `Novo ${rotulos.atendimento.toLowerCase()}`],
            ["despesa", "Nova despesa"],
            ["receber", `Receber${emAberto.length > 0 ? ` (${emAberto.length})` : ""}`],
          ] as [Aba, string][]
        ).map(([id, label]) => (
          <button
            key={id}
            role="tab"
            aria-selected={aba === id}
            onClick={() => setAba(id)}
            className={`${ALTURA_TOQUE} rounded-xl border px-2 text-[13px] font-semibold leading-tight transition-colors ${
              aba === id
                ? "border-brand bg-brand-soft text-brand"
                : "border-line bg-surface text-ink-2"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {aba === "receita" && (
        <FormularioReceita
          base={base}
          rotulos={rotulos}
          hoje={hoje}
          onCriarCliente={(nome) =>
            clientesCrud.add({ nome, tipo: "pf", desde: hoje, ativo: true })
          }
          onSalvar={(dados, mensagem) => {
            atendimentosCrud.add(dados);
            confirmar(mensagem);
          }}
        />
      )}

      {aba === "despesa" && (
        <FormularioDespesa
          categorias={segmento.categoriasDespesa}
          centroPadrao={segmento.centrosCusto[0] ?? ""}
          hoje={hoje}
          onSalvar={(dados, mensagem) => {
            transacoesCrud.add(dados);
            confirmar(mensagem);
          }}
        />
      )}

      {aba === "receber" && (
        <ListaAReceber
          itens={emAberto}
          base={base}
          hoje={hoje}
          rotuloCliente={rotulos.cliente}
          onCobrar={setCobrando}
          onReceber={(a) => {
            atendimentosCrud.update(a.id, { status: "pago", pagoEm: hoje });
            confirmar(`${formatCurrency(valorLiquido(a))} recebido.`);
          }}
        />
      )}

      {cobrando && (
        <ModalCobranca
          aberto
          onFechar={() => setCobrando(null)}
          config={config}
          cliente={base.clientes.find((c) => c.id === cobrando.clienteId)}
          valor={valorLiquido(cobrando)}
          vencimento={cobrando.vencimento}
          referencia={base.servicos.find((s) => s.id === cobrando.servicoId)?.nome}
          identificador={cobrando.id}
        />
      )}

      <Link
        href="/receitas"
        className="flex min-h-11 items-center justify-center gap-1.5 text-sm font-medium text-brand"
      >
        Abrir a tela completa
        <ArrowRight size={15} aria-hidden />
      </Link>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function Resumo({
  icone: Icone,
  rotulo,
  valor,
  alerta = false,
}: {
  icone: typeof Wallet;
  rotulo: string;
  valor: string;
  alerta?: boolean;
}) {
  return (
    <div className="rounded-xl border border-line bg-surface px-2.5 py-2">
      <p className="flex items-center gap-1 text-[11px] text-ink-3">
        <Icone size={12} className="shrink-0" aria-hidden />
        <span className="truncate">{rotulo}</span>
      </p>
      <p
        className={`mt-0.5 truncate text-[15px] font-semibold tabular ${
          alerta ? "text-crit-ink" : "text-ink"
        }`}
      >
        {valor}
      </p>
    </div>
  );
}

/** Fileira de opções que rola na horizontal — não empurra a largura da página. */
function Chips<T extends { id: string; nome: string }>({
  itens,
  selecionado,
  onEscolher,
}: {
  itens: T[];
  selecionado: string;
  onEscolher: (item: T) => void;
}) {
  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-1">
      <div className="flex w-max gap-2">
        {itens.map((item) => {
          const ativo = item.id === selecionado;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onEscolher(item)}
              aria-pressed={ativo}
              className={`h-11 shrink-0 rounded-xl border px-3.5 text-sm font-medium transition-colors ${
                ativo
                  ? "border-brand bg-brand-soft text-brand"
                  : "border-line bg-surface text-ink-2"
              }`}
            >
              {item.nome}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CampoValor({
  valor,
  onChange,
  rotulo,
}: {
  valor: string;
  onChange: (v: string) => void;
  rotulo: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-ink-2">{rotulo}</span>
      <span className="relative block">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-base text-ink-3">
          R$
        </span>
        <input
          // `decimal` abre o teclado numérico no celular sem recusar a vírgula.
          inputMode="decimal"
          value={valor}
          onChange={(e) => onChange(e.target.value.replace(/[^\d.,]/g, ""))}
          placeholder="0,00"
          aria-label={rotulo}
          className={`${ALTURA_TOQUE} w-full rounded-xl border border-line bg-surface pl-12 pr-4 text-xl font-semibold tabular text-ink placeholder:font-normal placeholder:text-ink-3 focus:border-brand focus:outline-none`}
        />
      </span>
    </label>
  );
}

function BotoesSalvar({
  primario,
  secundario,
  onPrimario,
  onSecundario,
  desabilitado,
}: {
  primario: string;
  secundario: string;
  onPrimario: () => void;
  onSecundario: () => void;
  desabilitado: boolean;
}) {
  /**
   * Ancorado no rodapé: num iPhone SE o conteúdo do formulário não cabe inteiro
   * na tela, e a ação principal caía abaixo da dobra — um lançamento que exige
   * rolar para salvar não é rápido. `sticky` (e não `fixed`) mantém o botão no
   * fluxo, então ele não cobre nada quando a página é curta e não briga com o
   * teclado virtual.
   */
  return (
    <div className="sticky bottom-0 -mx-4 grid grid-cols-[1.25fr_1fr] gap-2 border-t border-line bg-page px-4 py-3">
      <button
        type="button"
        onClick={onPrimario}
        disabled={desabilitado}
        className={`${ALTURA_TOQUE} flex items-center justify-center gap-1.5 rounded-xl bg-brand px-3 text-[15px] font-semibold text-brand-ink transition-opacity disabled:opacity-40`}
      >
        <Check size={17} className="shrink-0" aria-hidden />
        {primario}
      </button>
      <button
        type="button"
        onClick={onSecundario}
        disabled={desabilitado}
        className={`${ALTURA_TOQUE} rounded-xl border border-line bg-surface px-3 text-[14px] font-semibold leading-tight text-ink-2 transition-opacity disabled:opacity-40`}
      >
        {secundario}
      </button>
    </div>
  );
}

/** Converte "1.234,56" (ou "1234.56") em número. Vazio vale zero. */
function paraNumero(texto: string): number {
  return Number(texto.replace(/\./g, "").replace(",", ".")) || 0;
}

/* -------------------------------------------------------------------------- */

function FormularioReceita({
  base,
  rotulos,
  hoje,
  onSalvar,
  onCriarCliente,
}: {
  base: ReturnType<typeof useBase>;
  rotulos: { cliente: string; servico: string; atendimento: string };
  hoje: string;
  onSalvar: (dados: Omit<Atendimento, "id">, mensagem: string) => void;
  onCriarCliente: (nome: string) => string;
}) {
  const servicos = useMemo(() => base.servicos.filter((s) => s.ativo), [base.servicos]);

  /**
   * Só os clientes recentes viram atalho. Uma carteira de 400 nomes em chips
   * seria mais lenta de percorrer do que digitar — para o resto existe o campo
   * de busca logo abaixo.
   */
  const recentes = useMemo(() => {
    const ultimoAtendimento = new Map<string, string>();
    for (const a of base.atendimentos) {
      const anterior = ultimoAtendimento.get(a.clienteId);
      if (!anterior || a.data > anterior) ultimoAtendimento.set(a.clienteId, a.data);
    }
    return base.clientes
      .filter((c) => c.ativo)
      .sort(
        (a, b) => (ultimoAtendimento.get(b.id) ?? "").localeCompare(ultimoAtendimento.get(a.id) ?? "")
      )
      .slice(0, 8);
  }, [base.clientes, base.atendimentos]);

  /**
   * O último lançamento. Ordenar só por data não basta: num dia movimentado
   * dezenas dividem a mesma data, e o desempate certo é a ordem de inserção —
   * quem entrou por último na base é o mais recente.
   */
  const ultimo = useMemo(() => {
    let escolhido: Atendimento | undefined;
    for (const a of base.atendimentos) {
      if (!escolhido || a.data >= escolhido.data) escolhido = a;
    }
    return escolhido;
  }, [base.atendimentos]);

  const [servicoId, setServicoId] = useState(servicos[0]?.id ?? "");
  const [clienteId, setClienteId] = useState("");
  const [nomeNovo, setNomeNovo] = useState("");
  const [valor, setValor] = useState(String(servicos[0]?.valorPadrao ?? ""));

  const clienteDefinido = clienteId !== "" || nomeNovo.trim() !== "";
  const podeSalvar = clienteDefinido && paraNumero(valor) > 0;

  function salvar(pago: boolean) {
    if (!podeSalvar) return;
    const id = clienteId || onCriarCliente(nomeNovo.trim());
    const servico = servicos.find((s) => s.id === servicoId);
    onSalvar(
      {
        clienteId: id,
        servicoId: servicoId || undefined,
        data: hoje,
        vencimento: hoje,
        valor: paraNumero(valor),
        desconto: 0,
        status: pago ? "pago" : "pendente",
        pagoEm: pago ? hoje : undefined,
        recorrencia: "unica",
      },
      pago
        ? `${formatCurrency(paraNumero(valor))} recebido${servico ? ` — ${servico.nome}` : ""}.`
        : `Lançado a receber${servico ? ` — ${servico.nome}` : ""}.`
    );
    setNomeNovo("");
    setClienteId("");
  }

  function repetirUltimo() {
    if (!ultimo) return;
    setClienteId(ultimo.clienteId);
    setNomeNovo("");
    if (ultimo.servicoId) setServicoId(ultimo.servicoId);
    setValor(String(ultimo.valor));
  }

  const nomeCliente = base.clientes.find((c) => c.id === clienteId)?.nome;

  return (
    <div className="flex flex-col gap-3.5">
      {servicos.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs font-medium text-ink-2">{rotulos.servico}</p>
          <Chips
            itens={servicos}
            selecionado={servicoId}
            onEscolher={(s) => {
              setServicoId(s.id);
              // Escolher o serviço já preenche o preço de tabela: na maioria
              // dos lançamentos ninguém precisa digitar valor nenhum.
              setValor(String(s.valorPadrao));
            }}
          />
        </div>
      )}

      <CampoValor valor={valor} onChange={setValor} rotulo="Valor" />

      <div>
        <p className="mb-1.5 text-xs font-medium text-ink-2">{rotulos.cliente}</p>
        {recentes.length > 0 && (
          <Chips
            itens={recentes}
            selecionado={clienteId}
            onEscolher={(c) => {
              setClienteId(c.id);
              setNomeNovo("");
            }}
          />
        )}
        <input
          value={clienteId ? (nomeCliente ?? "") : nomeNovo}
          onChange={(e) => {
            setNomeNovo(e.target.value);
            setClienteId("");
          }}
          placeholder={`Ou digite o nome — ${rotulos.cliente.toLowerCase()} novo é criado na hora`}
          aria-label={`Nome do ${rotulos.cliente.toLowerCase()}`}
          className={`${ALTURA_TOQUE} mt-2 w-full rounded-xl border border-line bg-surface px-4 text-[15px] text-ink placeholder:text-ink-3 focus:border-brand focus:outline-none`}
        />
      </div>

      {ultimo && (
        <button
          type="button"
          onClick={repetirUltimo}
          className="flex min-h-11 items-center justify-center gap-1.5 text-sm font-medium text-ink-2"
        >
          <RotateCcw size={15} aria-hidden />
          Repetir o último lançamento
        </button>
      )}

      <BotoesSalvar
        primario="Recebi agora"
        secundario="A receber"
        onPrimario={() => salvar(true)}
        onSecundario={() => salvar(false)}
        desabilitado={!podeSalvar}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function FormularioDespesa({
  categorias,
  centroPadrao,
  hoje,
  onSalvar,
}: {
  categorias: string[];
  centroPadrao: string;
  hoje: string;
  onSalvar: (
    dados: Parameters<ReturnType<typeof useData>["transacoesCrud"]["add"]>[0],
    mensagem: string
  ) => void;
}) {
  const [categoria, setCategoria] = useState(categorias[0] ?? "Geral");
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [pessoal, setPessoal] = useState(false);

  const podeSalvar = paraNumero(valor) > 0;

  function salvar(pago: boolean) {
    if (!podeSalvar) return;
    onSalvar(
      {
        tipo: "despesa",
        // Sem descrição, a categoria já identifica o lançamento — melhor uma
        // despesa registrada com nome genérico do que uma não registrada.
        descricao: descricao.trim() || categoria,
        categoria,
        centroCusto: centroPadrao || undefined,
        natureza: "variavel",
        pessoal,
        valor: paraNumero(valor),
        data: hoje,
        vencimento: hoje,
        pago,
        pagoEm: pago ? hoje : undefined,
        recorrente: false,
      },
      pago
        ? `${formatCurrency(paraNumero(valor))} ${pessoal ? "de gasto pessoal registrado" : "pago"} — ${
            pessoal ? "sai do resultado da operação" : categoria
          }.`
        : `Lançado a pagar — ${pessoal ? "gasto pessoal" : categoria}.`
    );
    setDescricao("");
    setValor("");
  }

  return (
    <div className="flex flex-col gap-3.5">
      <div>
        <p className="mb-1.5 text-xs font-medium text-ink-2">Categoria</p>
        <Chips
          itens={categorias.map((c) => ({ id: c, nome: c }))}
          selecionado={categoria}
          onEscolher={(c) => setCategoria(c.id)}
        />
      </div>

      <CampoValor valor={valor} onChange={setValor} rotulo="Valor" />

      {/* Um toque para dizer "isso não é da empresa" — a pergunta precisa
          caber no mesmo gesto do lançamento, senão ninguém responde. */}
      <button
        type="button"
        onClick={() => setPessoal((v) => !v)}
        aria-pressed={pessoal}
        className={`flex min-h-11 items-center gap-2.5 rounded-xl border px-3.5 text-left text-sm font-medium transition-colors ${
          pessoal
            ? "border-warn bg-warn-soft text-warn-ink"
            : "border-line bg-surface text-ink-2"
        }`}
      >
        <span
          aria-hidden
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
            pessoal ? "border-warn-ink bg-warn-ink text-white" : "border-line-strong"
          }`}
        >
          {pessoal && <Check size={13} strokeWidth={3} />}
        </span>
        Gasto pessoal, não da empresa
      </button>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-ink-2">Descrição (opcional)</span>
        <input
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          placeholder={categoria}
          aria-label="Descrição da despesa"
          className={`${ALTURA_TOQUE} w-full rounded-xl border border-line bg-surface px-4 text-[15px] text-ink placeholder:text-ink-3 focus:border-brand focus:outline-none`}
        />
      </label>

      <BotoesSalvar
        primario="Paguei agora"
        secundario="A pagar"
        onPrimario={() => salvar(true)}
        onSecundario={() => salvar(false)}
        desabilitado={!podeSalvar}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function ListaAReceber({
  itens,
  base,
  hoje,
  rotuloCliente,
  onReceber,
  onCobrar,
}: {
  itens: Atendimento[];
  base: ReturnType<typeof useBase>;
  hoje: string;
  rotuloCliente: string;
  onReceber: (a: Atendimento) => void;
  onCobrar: (a: Atendimento) => void;
}) {
  const nomePorId = useMemo(
    () => new Map(base.clientes.map((c) => [c.id, c.nome])),
    [base.clientes]
  );

  if (itens.length === 0) {
    return (
      <p className="rounded-xl border border-line bg-surface px-4 py-8 text-center text-sm text-ink-3">
        Nada em aberto. Todos os recebimentos estão em dia.
      </p>
    );
  }

  // Os vinte mais antigos: rolar cem linhas no celular não é "acesso rápido".
  return (
    <ul aria-label="Recebimentos em aberto" className="flex flex-col gap-2">
      {itens.slice(0, 20).map((a) => {
        const atrasado = a.vencimento < hoje;
        return (
          <li
            key={a.id}
            className="flex items-center gap-3 rounded-xl border border-line bg-surface p-3"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink">
                {nomePorId.get(a.clienteId) ?? rotuloCliente}
              </p>
              <p className={`text-xs ${atrasado ? "text-crit-ink" : "text-ink-3"}`}>
                {formatCurrency(valorLiquido(a))} ·{" "}
                {atrasado ? "venceu" : "vence"} {formatDateShort(a.vencimento)}
              </p>
            </div>
            {/* Cobrar e dar baixa são gestos diferentes e ambos de um toque:
                um manda a mensagem, o outro encerra a pendência. */}
            <button
              type="button"
              onClick={() => onCobrar(a)}
              aria-label={`Cobrar ${nomePorId.get(a.clienteId) ?? rotuloCliente}`}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-line bg-surface text-ink-2"
            >
              <MessageCircle size={18} aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => onReceber(a)}
              className="h-11 shrink-0 rounded-xl bg-brand px-4 text-sm font-semibold text-brand-ink"
            >
              Recebi
            </button>
          </li>
        );
      })}
    </ul>
  );
}
