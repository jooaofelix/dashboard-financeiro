"use client";

import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  QrCode,
  Split,
  Target,
  Wallet,
  Zap,
} from "lucide-react";
import { BaseMark, BaseWordmark } from "@/components/BaseLogo";
import ThemeToggle from "@/components/ThemeToggle";

/**
 * Apresentação pública: o que o sistema faz, com telas reais.
 *
 * Fica **fora da sessão** de propósito — é a página que se manda para alguém
 * decidir se vale criar conta. Por isso não usa dado nenhum do contexto do app:
 * são imagens estáticas, geradas a partir da base de demonstração.
 *
 * As telas são fotografias do produto rodando, não ilustrações. Vender uma
 * interface que não existe é a forma mais rápida de perder o cliente no
 * primeiro login.
 */

const SEGMENTOS = [
  "Clínica & Saúde",
  "Advocacia & Jurídico",
  "Consultoria & Agência",
  "Estética & Bem-estar",
  "Educação & Cursos",
  "Serviços em geral",
];

interface Secao {
  id: string;
  icone: typeof Zap;
  titulo: string;
  texto: string;
  pontos: string[];
  imagem: string;
  alt: string;
  largura: number;
  altura: number;
  /** Telas de celular ficam menores e centralizadas. */
  celular?: boolean;
}

const SECOES: Secao[] = [
  {
    id: "lancar",
    icone: Zap,
    titulo: "Lançar leva segundos, não uma sessão de escritório",
    texto:
      "A tela do celular existe para quem está de pé, entre um atendimento e outro. Escolher o serviço já preenche o preço, o cliente novo nasce ali mesmo digitando o nome, e dois botões grandes separam o que você recebeu do que ainda vai receber.",
    pontos: [
      "Cliente novo criado na hora, sem cadastro prévio",
      "Repetir o último lançamento em um toque",
      "Baixa de recebimento em um toque",
    ],
    imagem: "/apresentacao/rapido.png",
    alt: "Tela de lançamento rápido no celular, com serviços, valor e botões de receber",
    largura: 780,
    altura: 1600,
    celular: true,
  },
  {
    id: "cobrar",
    icone: QrCode,
    titulo: "Cobrar com Pix e lembrete pronto",
    texto:
      "Cada cobrança gera o Pix copia e cola e o QR no padrão do Banco Central, montados no seu próprio navegador a partir da sua chave. A mensagem sai escrita — valor, vencimento e código — e o WhatsApp abre preenchido. Quem aperta enviar é você.",
    pontos: [
      "Sem integração bancária e sem senha de banco",
      "O tom muda sozinho: lembrete antes, cobrança depois do vencimento",
      "Funciona com CPF, CNPJ, e-mail, telefone ou chave aleatória",
    ],
    imagem: "/apresentacao/cobranca.png",
    alt: "Painel de cobrança com QR code do Pix, código copia e cola e mensagem pronta",
    largura: 780,
    altura: 1600,
    celular: true,
  },
  {
    id: "separar",
    icone: Split,
    titulo: "O dinheiro da empresa separado do seu",
    texto:
      "Seis em cada dez donos de negócio pagam conta pessoal pela conta da empresa. Aqui isso não precisa ser escondido: marque a saída como pessoal e ela deixa de contaminar o resultado — mas continua no caixa, como retirada, onde ela realmente está.",
    pontos: [
      "Não entra em margem, resultado nem ponto de equilíbrio",
      "Aparece na DRE como retirada, depois do resultado",
      "O painel avisa quando a mistura passa de 20% do mês",
    ],
    imagem: "/apresentacao/contas.png",
    alt: "Tela de contas a pagar e receber, com vencimentos, categorias e situação",
    largura: 2100,
    altura: 1350,
  },
  {
    id: "enxergar",
    icone: Wallet,
    titulo: "Um painel que responde perguntas, não só mostra números",
    texto:
      "Quanto entrou, quanto falta entrar, quanto sobra de cada real e quantos meses de folga o caixa tem. Os alertas vêm primeiro e são clicáveis: quem está atrasado, o que vence esta semana, se o mês virou no vermelho.",
    pontos: [
      "Competência e caixa medidos separadamente",
      "Ponto de equilíbrio e margem de contribuição calculados",
      "Comparação automática com o período anterior",
    ],
    imagem: "/apresentacao/painel.png",
    alt: "Painel com alertas, indicadores de faturamento, recebido, despesas e resultado",
    largura: 2100,
    altura: 1350,
  },
  {
    id: "planejar",
    icone: Target,
    titulo: "Uma meta com prazo vira um plano mensal",
    texto:
      "Você diz onde quer chegar e em quanto tempo. O sistema quebra a diferença em marcos mês a mês, traduz cada marco em quantos atendimentos aquilo custa, e a cada mês fechado diz se você ainda chega — ou quanto passou a faltar por mês.",
    pontos: [
      "Alvo do mês, e quanto falta em dinheiro e em atendimentos",
      "Projeção do ritmo observado até o fim do prazo",
      "Exportável em CSV, mês a mês",
    ],
    imagem: "/apresentacao/plano.png",
    alt: "Cartão do plano de crescimento com a rampa mensal e o realizado",
    largura: 2100,
    altura: 700,
  },
  {
    id: "prever",
    icone: CalendarClock,
    titulo: "Saber hoje como o caixa termina o mês",
    texto:
      "O fluxo projetado soma os vencimentos em aberto e os lançamentos recorrentes para desenhar o saldo dia a dia em 30, 60 e 90 dias — e avisa antes de o caixa cruzar a sua reserva mínima.",
    pontos: [
      "Projeção a partir do que já está lançado, sem chute",
      "Alerta antes do caixa furar a reserva",
      "Resumo por semana, para o que exige decisão agora",
    ],
    imagem: "/apresentacao/fluxo.png",
    alt: "Gráfico de fluxo de caixa projetado com saldo dia a dia e linha de reserva mínima",
    largura: 2100,
    altura: 1350,
  },
  {
    id: "relatorios",
    icone: CheckCircle2,
    titulo: "Relatórios que o contador entende",
    texto:
      "DRE gerencial, margem por serviço, comissões da equipe, recebimentos por forma de pagamento e o plano de crescimento. Todos com o período que você escolher e todos exportáveis em CSV.",
    pontos: [
      "DRE com margem de contribuição e ponto de equilíbrio",
      "Margem real por serviço, já com o custo direto",
      "Exportação em CSV em qualquer relatório",
    ],
    imagem: "/apresentacao/relatorios.png",
    alt: "Tela de relatórios com DRE gerencial detalhada por categoria",
    largura: 2100,
    altura: 1350,
  },
];

export default function ComoFuncionaPage() {
  return (
    <main className="min-h-screen bg-page">
      <header className="sticky top-0 z-30 border-b border-line bg-surface/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1080px] items-center gap-3 px-5 py-3">
          <BaseMark size={26} className="shrink-0 text-brand" />
          <BaseWordmark tamanho="sm" className="text-marca-tipo" />
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <Link
              href="/entrar"
              className="inline-flex h-10 items-center rounded-xl bg-brand px-4 text-sm font-semibold text-brand-ink"
            >
              Entrar
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1080px] px-5">
        {/* Abertura */}
        <section className="flex flex-col items-center py-14 text-center sm:py-20">
          <p className="rounded-full bg-brand-soft px-3.5 py-1.5 text-xs font-semibold text-brand">
            Controle financeiro para quem presta serviço
          </p>
          <h1 className="mt-5 max-w-[16ch] text-3xl font-semibold leading-tight text-ink sm:text-5xl">
            Toda decisão começa na base.
          </h1>
          <p className="mt-5 max-w-[54ch] text-base leading-relaxed text-ink-2 sm:text-lg">
            A BASE mostra quanto o seu negócio realmente ganha, quanto falta
            entrar e para onde o dinheiro está indo — sem planilha, sem
            contador do lado e sem misturar o caixa da empresa com o seu.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/entrar"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-brand px-6 text-[15px] font-semibold text-brand-ink"
            >
              Testar agora, de graça
              <ArrowRight size={17} aria-hidden />
            </Link>
            <a
              href="#lancar"
              className="inline-flex h-12 items-center justify-center rounded-xl border border-line bg-surface px-6 text-[15px] font-semibold text-ink-2"
            >
              Ver as telas
            </a>
          </div>

          <p className="mt-4 text-xs text-ink-3">
            Dá para entrar como convidado e explorar com dados de exemplo — sem
            cartão, sem cadastro.
          </p>
        </section>

        {/* A dor, com o número que a mede */}
        <section className="rounded-2xl border border-line bg-surface p-6 sm:p-10">
          <div className="grid gap-6 sm:grid-cols-[auto_1fr] sm:gap-10">
            <p className="text-4xl font-semibold leading-none text-brand sm:text-6xl">61%</p>
            <div>
              <p className="text-[15px] leading-relaxed text-ink-2">
                dos empreendedores brasileiros pagam contas da empresa pela conta
                pessoal, segundo levantamento do Sebrae — e seis em cada dez
                relatam controle financeiro precário.
              </p>
              <p className="mt-3 text-[15px] leading-relaxed text-ink-2">
                O problema quase nunca é falta de disciplina. É que registrar dá
                trabalho demais para o retorno que dá. A BASE foi construída ao
                contrário: <strong className="font-semibold text-ink">lançar
                custa segundos</strong> e cada número lançado vira, na mesma
                hora, uma resposta sobre o negócio.
              </p>
            </div>
          </div>
        </section>

        {/* Seções com foto */}
        {SECOES.map((secao, i) => (
          <SecaoIlustrada
            key={secao.id}
            secao={secao}
            invertida={i % 2 === 1}
            prioritaria={i === 0}
          />
        ))}

        {/* Um sistema, vários negócios */}
        <section className="rounded-2xl border border-line bg-surface p-6 sm:p-10">
          <h2 className="text-xl font-semibold text-ink sm:text-2xl">
            O mesmo sistema, com o vocabulário do seu negócio
          </h2>
          <p className="mt-3 max-w-[62ch] text-[15px] leading-relaxed text-ink-2">
            Ao criar a conta você escolhe o tipo de negócio, e a BASE troca os
            nomes das telas, o catálogo de serviços, as categorias de despesa e
            os centros de custo. Uma clínica vê <em>pacientes</em> e{" "}
            <em>atendimentos</em>; um escritório vê <em>clientes</em> e{" "}
            <em>honorários</em>. A conta é a mesma; a linguagem é a sua.
          </p>
          <ul className="mt-5 flex flex-wrap gap-2">
            {SEGMENTOS.map((s) => (
              <li
                key={s}
                className="rounded-lg border border-line bg-raised px-3 py-1.5 text-[13px] font-medium text-ink-2"
              >
                {s}
              </li>
            ))}
          </ul>
        </section>

        {/* O que a BASE não faz — dito antes de o cliente descobrir sozinho */}
        <section className="mt-6 rounded-2xl border border-line bg-surface p-6 sm:p-10">
          <h2 className="text-xl font-semibold text-ink sm:text-2xl">
            O que a BASE não faz
          </h2>
          <p className="mt-3 max-w-[62ch] text-[15px] leading-relaxed text-ink-2">
            Prefiro dizer agora a você descobrir depois de migrar tudo:
          </p>
          <ul className="mt-4 flex flex-col gap-2.5 text-[15px] leading-relaxed text-ink-2">
            <li>
              <strong className="font-semibold text-ink">Não conversa com o seu banco.</strong>{" "}
              O Pix é gerado aqui, mas a baixa do recebimento é você quem dá.
            </li>
            <li>
              <strong className="font-semibold text-ink">Não emite nota fiscal.</strong>{" "}
              O controle é gerencial; a emissão continua onde já está.
            </li>
            <li>
              <strong className="font-semibold text-ink">Não dispara cobrança sozinha.</strong>{" "}
              A mensagem sai pronta, mas quem envia é você — cobrar o cliente
              errado sem ninguém ver seria pior do que não cobrar.
            </li>
          </ul>
        </section>

        {/* Fechamento */}
        <section className="flex flex-col items-center py-14 text-center sm:py-20">
          <div className="flex h-[72px] w-[72px] items-center justify-center rounded-[20px] bg-surface shadow-[0_14px_34px_-12px_rgb(11_127_224/0.45)]">
            <BaseMark size={38} />
          </div>
          <h2 className="mt-6 max-w-[20ch] text-2xl font-semibold leading-tight text-ink sm:text-3xl">
            Comece com dados de exemplo e veja o seu negócio na tela
          </h2>
          <p className="mt-4 max-w-[52ch] text-[15px] leading-relaxed text-ink-2">
            Criar a conta leva menos de um minuto. Se quiser só olhar, entre como
            convidado: o workspace é seu, descartável e não pede cartão nenhum.
          </p>
          <Link
            href="/entrar"
            className="mt-8 inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-brand px-7 text-[15px] font-semibold text-brand-ink"
          >
            Criar minha conta
            <ArrowRight size={17} aria-hidden />
          </Link>
        </section>
      </div>

      <footer className="border-t border-line py-8">
        <p className="text-center text-xs text-ink-3">
          BASE · painel de gestão financeira para empresas de serviços
        </p>
      </footer>
    </main>
  );
}

/* -------------------------------------------------------------------------- */

function SecaoIlustrada({
  secao,
  invertida,
  prioritaria,
}: {
  secao: Secao;
  invertida: boolean;
  /** A primeira foto carrega adiantada; as outras só ao chegar perto. */
  prioritaria: boolean;
}) {
  const { icone: Icone } = secao;
  return (
    <section id={secao.id} className="scroll-mt-20 py-10 sm:py-16">
      <div
        className={`grid items-center gap-8 lg:grid-cols-2 lg:gap-14 ${
          invertida ? "lg:[&>figure]:order-first" : ""
        }`}
      >
        <div>
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-brand">
            <Icone size={20} aria-hidden />
          </span>
          <h2 className="mt-4 text-xl font-semibold leading-snug text-ink sm:text-2xl">
            {secao.titulo}
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-ink-2">{secao.texto}</p>
          <ul className="mt-5 flex flex-col gap-2.5">
            {secao.pontos.map((ponto) => (
              <li key={ponto} className="flex items-start gap-2.5 text-[15px] text-ink-2">
                <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-brand" aria-hidden />
                {ponto}
              </li>
            ))}
          </ul>
        </div>

        {/* A moldura ancora a foto e disfarça o recorte da captura. */}
        <figure
          className={`overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_20px_50px_-24px_rgb(0_0_0/0.35)] ${
            secao.celular ? "mx-auto w-full max-w-[300px]" : ""
          }`}
        >
          <Image
            src={secao.imagem}
            alt={secao.alt}
            width={secao.largura}
            height={secao.altura}
            className="h-auto w-full"
            priority={prioritaria}
            unoptimized
          />
        </figure>
      </div>
    </section>
  );
}
