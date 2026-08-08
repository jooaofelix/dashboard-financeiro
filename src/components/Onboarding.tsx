"use client";

import { useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  Target,
  TrendingUp,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useData } from "@/lib/data-context";
import {
  custoDiretoMedioPercent,
  getSegmento,
  pontoEquilibrioEstimado,
  SEGMENTOS,
  ticketMedioSegmento,
} from "@/lib/segments";
import {
  crescimentoMensalPercent,
  esforcoDoMes,
  HORIZONTES,
  incrementoMensal,
  PlanoCrescimento,
  trajetoria,
} from "@/lib/plano";
import { formatCurrency, formatMonthKey, formatNumber, formatPercent, monthKey, todayISO } from "@/lib/format";
import { BaseMark, BaseWordmark } from "./BaseLogo";
import CampoParticulas from "./CampoParticulas";

/**
 * Configuração inicial do workspace, logo depois de criar a conta.
 *
 * São quatro perguntas, na ordem em que um dono de negócio as responde:
 *
 * 1. **que negócio é o seu** — molda vocabulário, catálogo e categorias;
 * 2. **quanto custa mantê-lo de pé** — daqui sai o ponto de equilíbrio, que é a
 *    primeira coisa que uma empresa precisa saber sobre si mesma;
 * 3. **onde você quer chegar, e até quando** — vira uma rampa de marcos mensais,
 *    não um número solto no fim do ano;
 * 4. **confirmação**.
 *
 * Cada etapa mostra na hora o que a resposta produz. Perguntar o orçamento sem
 * devolver nada em troca seria burocracia; devolvendo o ponto de equilíbrio e o
 * esforço mensal, o cadastro vira a primeira análise do negócio.
 */

type Etapa = "negocio" | "operacao" | "meta" | "revisao";

const ETAPAS: { id: Etapa; titulo: string }[] = [
  { id: "negocio", titulo: "Seu negócio" },
  { id: "operacao", titulo: "Sua operação hoje" },
  { id: "meta", titulo: "Onde quer chegar" },
  { id: "revisao", titulo: "Tudo pronto" },
];

/** Campo numérico controlado como texto: `0` some ao focar, vazio vale zero. */
function useDinheiro(inicial: number) {
  const [texto, setTexto] = useState(String(inicial));
  const valor = Number(texto.replace(/\./g, "").replace(",", ".")) || 0;
  return { texto, setTexto, valor };
}

export default function Onboarding() {
  const { usuario } = useAuth();
  const { concluirOnboarding, ocupado } = useData();

  const [etapa, setEtapa] = useState<Etapa>("negocio");
  const [segmentoId, setSegmentoId] = useState(SEGMENTOS[0].id);
  const [empresa, setEmpresa] = useState("");
  const [comExemplo, setComExemplo] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const segmento = getSegmento(segmentoId);

  const faturamento = useDinheiro(0);
  const custoFixo = useDinheiro(SEGMENTOS[0].tetoDespesaMensal);
  const caixa = useDinheiro(0);
  const [aliquota, setAliquota] = useState(String(SEGMENTOS[0].aliquotaImpostos));
  const meta = useDinheiro(SEGMENTOS[0].metaReceitaMensal);
  const [horizonte, setHorizonte] = useState<number>(12);

  // Os presets do segmento só reescrevem o que o usuário ainda não digitou —
  // trocar de segmento na etapa 1 não pode apagar um valor informado à mão.
  const [personalizados, setPersonalizados] = useState<Set<string>>(new Set());
  const marcar = (campo: string) => setPersonalizados((s) => new Set(s).add(campo));

  function escolherSegmento(id: string) {
    setSegmentoId(id);
    const s = getSegmento(id);
    if (!personalizados.has("custoFixo")) custoFixo.setTexto(String(s.tetoDespesaMensal));
    if (!personalizados.has("aliquota")) setAliquota(String(s.aliquotaImpostos));
    if (!personalizados.has("meta")) meta.setTexto(String(s.metaReceitaMensal));
  }

  const ticketMedio = ticketMedioSegmento(segmento);
  const equilibrio = pontoEquilibrioEstimado(
    custoFixo.valor,
    Number(aliquota) || 0,
    custoDiretoMedioPercent(segmento)
  );

  const plano = useMemo<PlanoCrescimento>(
    () => ({
      faturamentoBase: faturamento.valor,
      metaReceitaMensal: meta.valor,
      horizonteMeses: horizonte,
      inicio: monthKey(todayISO()),
    }),
    [faturamento.valor, meta.valor, horizonte]
  );

  const marcos = useMemo(
    () => (meta.valor > 0 ? trajetoria(plano) : []),
    [plano, meta.valor]
  );
  const passo = incrementoMensal(plano);
  const percentComposto = crescimentoMensalPercent(plano);
  const esforcoMeta = esforcoDoMes(meta.valor, ticketMedio);

  function avancar() {
    setErro(null);
    if (etapa === "negocio") {
      if (!empresa.trim()) {
        setErro("Dê um nome ao seu negócio — ele aparece no menu e nos relatórios.");
        return;
      }
      setEtapa("operacao");
    } else if (etapa === "operacao") {
      setEtapa("meta");
    } else if (etapa === "meta") {
      if (meta.valor <= 0) {
        setErro("Informe a meta de faturamento mensal que você quer alcançar.");
        return;
      }
      setEtapa("revisao");
    }
  }

  function voltar() {
    setErro(null);
    const i = ETAPAS.findIndex((e) => e.id === etapa);
    if (i > 0) setEtapa(ETAPAS[i - 1].id);
  }

  async function concluir() {
    setErro(null);
    setEnviando(true);
    try {
      await concluirOnboarding({
        segmentoId,
        empresa,
        comExemplo,
        parametros: {
          metaReceitaMensal: meta.valor,
          tetoDespesaMensal: custoFixo.valor,
          aliquotaImpostos: Number(aliquota) || 0,
          saldoInicialCaixa: caixa.valor,
          faturamentoBase: faturamento.valor,
          metaHorizonteMeses: horizonte,
          planoInicio: plano.inicio,
        },
      });
    } catch {
      setErro("Não foi possível criar o workspace. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  }

  const ocupadoAgora = enviando || ocupado;
  const primeiroNome = usuario?.nome?.split(" ")[0];
  const indiceEtapa = ETAPAS.findIndex((e) => e.id === etapa);

  return (
    <main className="relative min-h-screen overflow-hidden bg-entrada px-5 py-12">
      <CampoParticulas />

      <div className="relative z-10 mx-auto flex w-full max-w-[720px] flex-col items-center">
        <div className="flex h-[72px] w-[72px] items-center justify-center rounded-[20px] bg-surface shadow-[0_14px_34px_-12px_rgb(11_127_224/0.45)]">
          <BaseMark size={38} />
        </div>

        <BaseWordmark tamanho="md" className="mt-5 text-marca-tipo" />

        <PassosDoTopo atual={indiceEtapa} />

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (etapa === "revisao") concluir();
            else avancar();
          }}
          noValidate
          className="mt-8 flex w-full flex-col gap-7"
        >
          {etapa === "negocio" && (
            <>
              <Cabecalho
                titulo={primeiroNome ? `Boas-vindas, ${primeiroNome}!` : "Boas-vindas!"}
                texto="Escolha o tipo do seu negócio: a BASE ajusta o vocabulário, o catálogo de serviços e as categorias financeiras ao seu dia a dia."
              />

              <fieldset>
                <legend className="mb-3 text-sm font-semibold text-ink">
                  Qual é o seu negócio?
                </legend>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {SEGMENTOS.map((s) => {
                    const ativo = s.id === segmentoId;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => escolherSegmento(s.id)}
                        aria-pressed={ativo}
                        className={`flex flex-col gap-1.5 rounded-2xl border p-4 text-left transition-colors ${
                          ativo
                            ? "border-brand bg-brand-soft"
                            : "border-line bg-surface hover:border-line-strong"
                        }`}
                      >
                        <span className="flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold text-ink">{s.nome}</span>
                          {ativo && (
                            <Check size={16} strokeWidth={2.5} className="shrink-0 text-brand" />
                          )}
                        </span>
                        <span className="text-xs leading-relaxed text-ink-3">
                          {s.labels.cliente} · {s.labels.atendimento} · {s.labels.servico}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-semibold text-ink">Nome do seu negócio</span>
                <input
                  value={empresa}
                  onChange={(e) => setEmpresa(e.target.value)}
                  placeholder="Ex: Clínica Núcleo Saúde"
                  aria-label="Nome do seu negócio"
                  className="campo-entrada"
                />
              </label>
            </>
          )}

          {etapa === "operacao" && (
            <>
              <Cabecalho
                titulo="Como está o negócio hoje?"
                texto="Esses quatro números são a régua de tudo: o painel compara cada mês contra eles. Estimativas servem — dá para ajustar depois em Configurações."
              />

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <CampoValor
                  rotulo="Faturamento médio por mês"
                  ajuda="Quanto o negócio fatura hoje, em média. Está começando agora? Deixe zero."
                  prefixo="R$"
                  valor={faturamento.texto}
                  onChange={(v) => {
                    faturamento.setTexto(v);
                    marcar("faturamento");
                  }}
                />
                <CampoValor
                  rotulo="Custo fixo por mês"
                  ajuda="O que sai todo mês independentemente do movimento: aluguel, folha, softwares, contador."
                  prefixo="R$"
                  valor={custoFixo.texto}
                  onChange={(v) => {
                    custoFixo.setTexto(v);
                    marcar("custoFixo");
                  }}
                />
                <CampoValor
                  rotulo="Saldo em caixa hoje"
                  ajuda="O que já existe em conta antes do primeiro lançamento. Alimenta o runway."
                  prefixo="R$"
                  valor={caixa.texto}
                  onChange={(v) => {
                    caixa.setTexto(v);
                    marcar("caixa");
                  }}
                />
                <CampoValor
                  rotulo="Impostos sobre o faturamento"
                  ajuda="Alíquota efetiva: Simples, presumido, ISS. Na dúvida, deixe o padrão do segmento."
                  sufixo="%"
                  valor={aliquota}
                  onChange={(v) => {
                    setAliquota(v);
                    marcar("aliquota");
                  }}
                />
              </div>

              {equilibrio > 0 && (
                <Resultado
                  icone={Target}
                  titulo={`Seu ponto de equilíbrio é ${formatCurrency(equilibrio)} por mês`}
                >
                  É quanto você precisa faturar só para empatar — cobrindo{" "}
                  {formatCurrency(custoFixo.valor)} de custo fixo, {formatPercent(Number(aliquota) || 0, 0)} de
                  impostos e o custo direto dos serviços.{" "}
                  {faturamento.valor > 0 &&
                    (faturamento.valor >= equilibrio
                      ? `Com ${formatCurrency(faturamento.valor)} de faturamento, você já opera acima dele.`
                      : `Com ${formatCurrency(faturamento.valor)} de faturamento, faltam ${formatCurrency(
                          equilibrio - faturamento.valor
                        )} por mês para chegar lá.`)}
                </Resultado>
              )}
            </>
          )}

          {etapa === "meta" && (
            <>
              <Cabecalho
                titulo="Onde você quer chegar?"
                texto="Uma meta com prazo vira um plano: a BASE quebra a diferença em marcos mensais e acompanha se cada mês entregou o que precisava."
              />

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <CampoValor
                  rotulo="Meta de faturamento por mês"
                  ajuda="O patamar que você quer alcançar e manter."
                  prefixo="R$"
                  valor={meta.texto}
                  onChange={(v) => {
                    meta.setTexto(v);
                    marcar("meta");
                  }}
                />
                <fieldset>
                  <legend className="text-sm font-semibold text-ink">Em quanto tempo</legend>
                  <div className="mt-2 flex gap-2">
                    {HORIZONTES.map((h) => (
                      <button
                        key={h}
                        type="button"
                        onClick={() => setHorizonte(h)}
                        aria-pressed={horizonte === h}
                        className={`flex-1 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors ${
                          horizonte === h
                            ? "border-brand bg-brand-soft text-brand"
                            : "border-line bg-surface text-ink-2 hover:border-line-strong"
                        }`}
                      >
                        {h} meses
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-ink-3">
                    Prazos curtos exigem saltos grandes. Doze meses é o horizonte
                    em que dá para corrigir a rota sem refazer o plano.
                  </p>
                </fieldset>
              </div>

              {meta.valor > 0 && (
                <>
                  <Resultado
                    icone={TrendingUp}
                    titulo={
                      passo > 0
                        ? `Some ${formatCurrency(passo)} de faturamento a cada mês`
                        : passo < 0
                          ? `Uma redução de ${formatCurrency(Math.abs(passo))} por mês`
                          : "Sua meta é manter o patamar atual"
                    }
                  >
                    {passo !== 0 && (
                      <>
                        É o que leva de {formatCurrency(faturamento.valor)} a{" "}
                        {formatCurrency(meta.valor)} em {horizonte} meses
                        {percentComposto !== null &&
                          ` — equivalente a ${formatPercent(percentComposto, 1)} ao mês`}
                        .{" "}
                      </>
                    )}
                    {esforcoMeta && (
                      <>
                        No ticket médio de {formatCurrency(ticketMedio)} do seu
                        catálogo, o mês da meta pede{" "}
                        <strong className="font-semibold text-ink">
                          {formatNumber(esforcoMeta.atendimentos)}{" "}
                          {segmento.labels.atendimentos.toLowerCase()}
                        </strong>{" "}
                        — cerca de {formatNumber(esforcoMeta.porSemana)} por semana.
                      </>
                    )}
                  </Resultado>

                  {equilibrio > 0 && meta.valor < equilibrio && (
                    <p className="flex items-start gap-2 rounded-2xl bg-warn-soft px-4 py-3 text-sm text-warn-ink">
                      <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden />
                      <span>
                        Essa meta fica abaixo do seu ponto de equilíbrio (
                        {formatCurrency(equilibrio)}). Alcançá-la ainda deixaria o
                        negócio no prejuízo — vale rever a meta ou o custo fixo.
                      </span>
                    </p>
                  )}

                  <Trajetoria marcos={marcos} />
                </>
              )}
            </>
          )}

          {etapa === "revisao" && (
            <>
              <Cabecalho
                titulo="Tudo pronto"
                texto="Confira o que a BASE vai usar como referência. Tudo isso continua editável em Configurações."
              />

              <dl className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2">
                <Resumo termo="Negócio" valor={empresa.trim()} detalhe={segmento.nome} />
                <Resumo
                  termo="Faturamento hoje"
                  valor={formatCurrency(faturamento.valor)}
                  detalhe="ponto de partida do plano"
                />
                <Resumo
                  termo="Custo fixo"
                  valor={`${formatCurrency(custoFixo.valor)}/mês`}
                  detalhe={`equilíbrio em ${formatCurrency(equilibrio)}`}
                />
                <Resumo
                  termo="Impostos"
                  valor={formatPercent(Number(aliquota) || 0, 1)}
                  detalhe="sobre o faturamento"
                />
                <Resumo
                  termo="Meta"
                  valor={`${formatCurrency(meta.valor)}/mês`}
                  detalhe={`em ${horizonte} meses`}
                />
                <Resumo
                  termo="Saldo inicial"
                  valor={formatCurrency(caixa.valor)}
                  detalhe="caixa antes do primeiro lançamento"
                />
              </dl>

              <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-line bg-surface p-4">
                <input
                  type="checkbox"
                  checked={comExemplo}
                  onChange={(e) => setComExemplo(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-line-strong accent-[var(--brand)]"
                />
                <span>
                  <span className="block text-sm font-medium text-ink">
                    Começar com dados de exemplo
                  </span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-ink-3">
                    Doze meses de operação fictícia para você explorar os relatórios
                    antes de lançar o que é seu. O histórico é inventado e tem
                    escala própria — seus números acima continuam valendo como
                    parâmetro, e o plano começa neste mês. Dá para apagar tudo
                    depois em Configurações › Dados.
                  </span>
                </span>
              </label>
            </>
          )}

          {erro && (
            <p
              role="alert"
              className="flex items-start gap-2 rounded-2xl bg-crit-soft px-4 py-3 text-sm text-crit-ink"
            >
              <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden />
              {erro}
            </p>
          )}

          <div className="flex flex-col-reverse gap-3 sm:flex-row">
            {indiceEtapa > 0 && (
              <button
                type="button"
                onClick={voltar}
                disabled={ocupadoAgora}
                className="botao-entrada-secundario sm:w-auto sm:px-6"
              >
                <ArrowLeft size={17} aria-hidden />
                Voltar
              </button>
            )}
            <button type="submit" disabled={ocupadoAgora} className="botao-entrada">
              {ocupadoAgora ? (
                <>
                  <Loader2 size={18} className="animate-spin" aria-hidden />
                  Preparando seu workspace…
                </>
              ) : etapa === "revisao" ? (
                "Criar meu workspace"
              ) : (
                <>
                  Continuar
                  <ArrowRight size={17} aria-hidden />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

/* -------------------------------------------------------------------------- */

function PassosDoTopo({ atual }: { atual: number }) {
  return (
    <ol className="mt-7 flex w-full items-center gap-2" aria-label="Etapas da configuração">
      {ETAPAS.map((e, i) => {
        const feita = i < atual;
        const ativa = i === atual;
        return (
          <li key={e.id} className="flex min-w-0 flex-1 flex-col gap-1.5">
            <span
              className={`h-1 rounded-full transition-colors ${
                feita || ativa ? "bg-brand" : "bg-line"
              }`}
            />
            <span
              className={`truncate text-[11px] ${
                ativa ? "font-semibold text-brand" : "text-ink-3"
              }`}
              aria-current={ativa ? "step" : undefined}
            >
              {e.titulo}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function Cabecalho({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div>
      <h1 className="text-center text-2xl font-semibold text-ink">{titulo}</h1>
      <p className="mx-auto mt-2 max-w-[480px] text-center text-[15px] leading-relaxed text-ink-2">
        {texto}
      </p>
    </div>
  );
}

function CampoValor({
  rotulo,
  ajuda,
  prefixo,
  sufixo,
  valor,
  onChange,
}: {
  rotulo: string;
  ajuda: string;
  prefixo?: string;
  sufixo?: string;
  valor: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-sm font-semibold text-ink">{rotulo}</span>
      <span className="relative block">
        {prefixo && (
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-ink-3">
            {prefixo}
          </span>
        )}
        <input
          type="text"
          inputMode="decimal"
          value={valor}
          onChange={(e) => onChange(e.target.value.replace(/[^\d.,]/g, ""))}
          onFocus={(e) => e.target.value === "0" && onChange("")}
          onBlur={(e) => e.target.value === "" && onChange("0")}
          aria-label={rotulo}
          className="campo-entrada tabular"
          /* `.campo-entrada` define `padding-inline` fora de qualquer layer, e
             CSS sem layer vence utilitário do Tailwind — daí o estilo inline,
             que é o único jeito de abrir espaço para o "R$" sem duplicar a
             regra do campo. */
          style={{
            paddingLeft: prefixo ? "2.75rem" : undefined,
            paddingRight: sufixo ? "2.5rem" : undefined,
          }}
        />
        {sufixo && (
          <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-ink-3">
            {sufixo}
          </span>
        )}
      </span>
      <span className="text-xs leading-relaxed text-ink-3">{ajuda}</span>
    </label>
  );
}

function Resultado({
  icone: Icone,
  titulo,
  children,
}: {
  icone: typeof Target;
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <div
      role="status"
      className="flex items-start gap-3 rounded-2xl border border-brand/25 bg-brand-soft px-4 py-3.5"
    >
      <Icone size={18} className="mt-0.5 shrink-0 text-brand" aria-hidden />
      <div className="min-w-0">
        <p className="text-sm font-semibold text-ink">{titulo}</p>
        <p className="mt-1 text-[13px] leading-relaxed text-ink-2">{children}</p>
      </div>
    </div>
  );
}

/**
 * A rampa mês a mês. Uma barra por marco basta: o que importa aqui é ver que a
 * meta é uma escada, não um degrau único no fim do prazo.
 */
function Trajetoria({ marcos }: { marcos: { chave: string; numero: number; alvo: number }[] }) {
  if (marcos.length === 0) return null;
  const maior = Math.max(...marcos.map((m) => m.alvo), 1);

  return (
    <section aria-label="Marcos mensais do plano" className="rounded-2xl border border-line bg-surface p-4">
      <h2 className="text-sm font-semibold text-ink">Seus marcos mensais</h2>
      <p className="mt-0.5 text-xs leading-relaxed text-ink-3">
        O painel vai comparar cada mês fechado com o alvo da sua rampa.
      </p>

      <ol className="mt-3.5 flex items-end gap-1" aria-hidden>
        {marcos.map((m) => (
          <li
            key={m.chave}
            className="min-w-0 flex-1 rounded-t bg-brand/70"
            style={{ height: `${Math.max(6, (m.alvo / maior) * 56)}px` }}
          />
        ))}
      </ol>

      <table className="mt-3 w-full text-[13px]">
        <caption className="sr-only">Faturamento alvo de cada mês do plano</caption>
        <thead>
          <tr className="text-left text-ink-3">
            <th scope="col" className="pb-1 font-medium">Mês</th>
            <th scope="col" className="pb-1 text-right font-medium">Alvo</th>
          </tr>
        </thead>
        <tbody>
          {[marcos[0], marcos[Math.floor(marcos.length / 2)], marcos[marcos.length - 1]]
            .filter((m, i, lista) => lista.indexOf(m) === i)
            .map((m) => (
              <tr key={m.chave} className="border-t border-line">
                <td className="py-1.5 text-ink-2">
                  {formatMonthKey(m.chave)}
                  <span className="text-ink-3"> · mês {m.numero}</span>
                </td>
                <td className="py-1.5 text-right font-semibold tabular text-ink">
                  {formatCurrency(m.alvo)}
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    </section>
  );
}

function Resumo({
  termo,
  valor,
  detalhe,
}: {
  termo: string;
  valor: string;
  detalhe: string;
}) {
  return (
    <div className="bg-surface px-4 py-3">
      <dt className="text-xs text-ink-3">{termo}</dt>
      <dd className="mt-0.5 text-sm font-semibold text-ink">{valor}</dd>
      <dd className="text-xs text-ink-3">{detalhe}</dd>
    </div>
  );
}
