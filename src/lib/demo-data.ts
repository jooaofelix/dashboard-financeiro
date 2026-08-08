import {
  addDays,
  addMonths,
  diffDays,
  firstDayOfMonth,
  lastDayOfMonth,
  todayISO,
} from "./format";
import { getSegmento, Segmento } from "./segments";
import {
  Atendimento,
  BaseDados,
  Cliente,
  Configuracao,
  FORMAS_PAGAMENTO,
  Profissional,
  Servico,
  StatusPagamento,
  Transacao,
} from "./types";

/**
 * Base de demonstração determinística: com a mesma semente e o mesmo segmento
 * sai sempre o mesmo histórico, então gráficos e relatórios não "dançam" entre
 * recarregamentos. Doze meses de operação é o mínimo para o comparativo anual
 * e a sazonalidade fazerem sentido.
 */

const MESES_HISTORICO = 12;

function mulberry32(seed: number) {
  let a = seed;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const NOMES_PF = [
  "Ana Beatriz Souza",
  "Carlos Eduardo Lima",
  "Fernanda Ribeiro",
  "João Pedro Alves",
  "Marina Costa",
  "Rafael Monteiro",
  "Luciana Prado",
  "Bruno Tavares",
  "Camila Nogueira",
  "Diego Fontes",
  "Patrícia Amaral",
  "Rodrigo Bastos",
  "Helena Vieira",
  "Thiago Cardoso",
  "Juliana Moraes",
  "Gustavo Rezende",
  "Sofia Bernardes",
  "Marcelo Duarte",
  "Renata Siqueira",
  "Eduardo Pacheco",
  "Larissa Fontoura",
  "André Bittencourt",
  "Vanessa Queiroz",
  "Otávio Lacerda",
];

const NOMES_PJ = [
  "Aurora Tecnologia Ltda",
  "Grupo Vertice",
  "Construtora Meridiano",
  "Instituto Horizonte",
  "Nordeste Alimentos S/A",
  "Clínica Vida Plena",
  "Transportes Andrade",
  "Editora Farol",
  "Cooperativa Verde Campo",
  "Studio Norte Design",
  "Rede Bem Estar",
  "Prisma Engenharia",
  "Atlântico Logística",
  "Móveis Serrano",
  "Delta Participações",
  "Vale Azul Agro",
  "Óptica Central",
  "Metalúrgica Ipê",
  "Colégio Bandeirantes do Sul",
  "Sanchez & Filhos",
  "Riviera Hotelaria",
  "Bioclin Laboratórios",
  "Zenit Seguros",
  "Casa Verde Materiais",
];

const NOMES_EQUIPE = [
  "Dra. Helena Martins",
  "Dr. Paulo Ferreira",
  "Renata Aguiar",
  "Lucas Andrade",
  "Beatriz Carvalho",
];

function id(prefixo: string, indice: number) {
  return `${prefixo}-${String(indice + 1).padStart(3, "0")}`;
}

function gerarDocumento(random: () => number, pj: boolean) {
  const digito = () => Math.floor(random() * 10);
  if (pj) {
    return `${digito()}${digito()}.${digito()}${digito()}${digito()}.${digito()}${digito()}${digito()}/0001-${digito()}${digito()}`;
  }
  return `${digito()}${digito()}${digito()}.${digito()}${digito()}${digito()}.${digito()}${digito()}${digito()}-${digito()}${digito()}`;
}

function escolher<T>(random: () => number, lista: T[]): T {
  return lista[Math.floor(random() * lista.length)];
}

/** Sazonalidade suave + crescimento — um negócio real não é uma linha reta. */
function fatorDoMes(indice: number, total: number, random: () => number) {
  const crescimento = 0.78 + (indice / Math.max(1, total - 1)) * 0.38;
  const sazonal = 1 + Math.sin((indice / 12) * Math.PI * 2) * 0.08;
  const ruido = 0.93 + random() * 0.14;
  return crescimento * sazonal * ruido;
}

export function configuracaoPadrao(segmentoId: string): Configuracao {
  const segmento = getSegmento(segmentoId);
  return {
    segmentoId: segmento.id,
    empresa: nomeSugerido(segmento),
    aliquotaImpostos: segmento.aliquotaImpostos,
    metaReceitaMensal: segmento.metaReceitaMensal,
    tetoDespesaMensal: segmento.tetoDespesaMensal,
    saldoInicialCaixa: Math.round(segmento.tetoDespesaMensal * 0.9),
    reservaMinimaCaixa: Math.round(segmento.tetoDespesaMensal * 1.5),
    diasAlertaVencimento: 7,
  };
}

function nomeSugerido(segmento: Segmento) {
  const nomes: Record<string, string> = {
    clinica: "Clínica Núcleo Saúde",
    juridico: "Andrade & Vasconcelos Advogados",
    consultoria: "Meridiano Consultoria",
    estetica: "Studio Lumine",
    educacao: "Escola Horizonte",
    servicos: "Vector Serviços",
  };
  return nomes[segmento.id] ?? "Minha Empresa";
}

export function gerarBaseDemo(segmentoId: string, semente = 20260808): BaseDados {
  const segmento = getSegmento(segmentoId);
  const random = mulberry32(semente + segmento.id.length * 7919);
  const hoje = todayISO();

  const servicos: Servico[] = segmento.servicos.map((modelo, i) => ({
    id: id("srv", i),
    nome: modelo.nome,
    categoria: modelo.categoria,
    valorPadrao: modelo.valorPadrao,
    custoDireto: modelo.custoDireto,
    duracaoMin: modelo.duracaoMin,
    ativo: true,
  }));

  const profissionais: Profissional[] = segmento.papeis
    .slice(0, 4)
    .map((papel, i) => ({
      id: id("prof", i),
      nome: NOMES_EQUIPE[i % NOMES_EQUIPE.length],
      papel,
      comissaoPercent: [35, 30, 25, 15][i] ?? 20,
      ativo: true,
    }));

  const quantidadeClientes = Math.min(
    24,
    Math.max(10, Math.round(segmento.volumeMensal / 3) + 8)
  );
  const fontesNomes = segmento.clientesPessoaJuridica ? NOMES_PJ : NOMES_PF;

  const clientes: Cliente[] = Array.from({ length: quantidadeClientes }, (_, i) => {
    const pj = segmento.clientesPessoaJuridica ? true : random() > 0.85;
    const nome = fontesNomes[i % fontesNomes.length];
    // Chegadas espalhadas por todo o histórico e um pouco antes dele: parte da
    // carteira já existia no primeiro mês, e ainda assim há entradas recentes
    // para o indicador de novos clientes variar.
    const mesEntrada = -Math.floor(random() * (MESES_HISTORICO + 8));
    const desde = addDays(
      firstDayOfMonth(addMonths(hoje, mesEntrada)),
      Math.floor(random() * 27)
    );
    return {
      id: id("cli", i),
      nome,
      tipo: pj ? "pj" : "pf",
      documento: gerarDocumento(random, pj),
      email: `contato${i + 1}@exemplo.com.br`,
      telefone: `(11) 9${Math.floor(random() * 9000 + 1000)}-${Math.floor(random() * 9000 + 1000)}`,
      origem: escolher(random, segmento.origensCliente),
      desde: desde > hoje ? hoje : desde,
      ativo: random() > 0.12,
    };
  });

  const atendimentos: Atendimento[] = [];
  const transacoes: Transacao[] = [];
  let contadorAtendimento = 0;
  let contadorTransacao = 0;

  for (let m = 0; m < MESES_HISTORICO; m++) {
    const referencia = firstDayOfMonth(addMonths(hoje, -(MESES_HISTORICO - 1 - m)));
    const ultimoDia = lastDayOfMonth(referencia);
    const diasNoMes = Number(ultimoDia.slice(8, 10));
    const mesCorrente = referencia.slice(0, 7) === hoje.slice(0, 7);
    const fator = fatorDoMes(m, MESES_HISTORICO, random);

    const volume = Math.max(3, Math.round(segmento.volumeMensal * fator));
    const disponiveis = clientes.filter((c) => c.desde <= ultimoDia);

    for (let i = 0; disponiveis.length > 0 && i < volume; i++) {
      const dia = Math.min(diasNoMes, Math.floor(random() * diasNoMes) + 1);
      const data = `${referencia.slice(0, 7)}-${String(dia).padStart(2, "0")}`;
      if (data > hoje) continue;

      const cliente = escolher(random, disponiveis);
      const servico = escolher(random, servicos);
      const profissional = escolher(random, profissionais);
      const recorrente = servico.categoria === "Recorrente" || servico.nome.includes("Mensal");

      const prazo = recorrente ? 10 : escolher(random, [0, 0, 0, 7, 15, 30]);
      const vencimento = addDays(data, prazo);
      const valor = Math.round(servico.valorPadrao * (0.92 + random() * 0.22));
      const desconto = random() > 0.86 ? Math.round(valor * (0.05 + random() * 0.1)) : 0;

      let status: StatusPagamento;
      const sorte = random();
      if (mesCorrente) {
        if (vencimento > hoje) status = sorte > 0.35 ? "pago" : "pendente";
        else status = sorte > 0.22 ? "pago" : sorte > 0.08 ? "atrasado" : "pendente";
      } else {
        // Inadimplência antiga vai sendo resolvida (ou baixada): quanto mais
        // velho o mês, menor a chance de continuar em aberto até hoje.
        const mesesAtras = MESES_HISTORICO - 1 - m;
        const limiteAtraso = mesesAtras > 4 ? 0.985 : 0.945;
        if (sorte > limiteAtraso) status = "atrasado";
        else if (sorte > limiteAtraso - 0.015) status = "cancelado";
        else status = "pago";
      }

      // A maioria paga em dia, mas uma parte paga bem depois do vencimento — é
      // isso que cria um saldo de recebíveis "em trânsito" em qualquer data do
      // passado, e não só no mês corrente.
      const diasAteReceber =
        random() > 0.78
          ? 6 + Math.floor(random() * 32)
          : Math.floor(random() * 5) - 2;
      const pagoEm =
        status === "pago"
          ? addDays(vencimento, Math.max(-prazo, diasAteReceber))
          : undefined;

      atendimentos.push({
        id: id("atd", contadorAtendimento++),
        clienteId: cliente.id,
        servicoId: servico.id,
        profissionalId: profissional.id,
        data,
        vencimento,
        valor,
        desconto,
        status,
        formaPagamento:
          status === "pago" ? escolher(random, [...FORMAS_PAGAMENTO]) : undefined,
        pagoEm: pagoEm && pagoEm > hoje ? hoje : pagoEm,
        recorrencia: recorrente ? "mensal" : "unica",
      });
    }

    for (const modelo of segmento.despesas) {
      const ocorre = modelo.recorrente || random() > 0.12;
      if (!ocorre) continue;
      // No mês corrente só existe o que já foi incorrido: lançar o mês inteiro
      // faria o resultado do mês em curso nascer artificialmente negativo.
      const limiteDia = mesCorrente ? Number(hoje.slice(8, 10)) : diasNoMes;
      const dia = modelo.recorrente
        ? Math.min(limiteDia, 5 + Math.floor(random() * 10))
        : Math.min(limiteDia, 1 + Math.floor(random() * diasNoMes));
      if (dia < 1) continue;
      const data = `${referencia.slice(0, 7)}-${String(dia).padStart(2, "0")}`;
      const variacaoValor =
        modelo.natureza === "fixo" ? 0.98 + random() * 0.05 : 0.72 + random() * 0.6;
      const valor = Math.round(modelo.valorBase * variacaoValor * (0.9 + fator * 0.12));
      const vencimento = addDays(data, modelo.natureza === "fixo" ? 0 : 15);
      // Ninguém deixa a conta de luz vencida por um ano: só o passado recente
      // pode continuar em aberto.
      const diasVencida = diffDays(vencimento, hoje);
      const pago =
        diasVencida > 45 ? true : vencimento <= hoje ? random() > 0.18 : random() > 0.75;

      transacoes.push({
        id: id("trx", contadorTransacao++),
        tipo: "despesa",
        descricao: modelo.descricao,
        categoria: modelo.categoria,
        centroCusto: modelo.centroCusto,
        contraparte: modelo.recorrente ? "Fornecedor fixo" : undefined,
        natureza: modelo.natureza,
        valor,
        data,
        vencimento,
        pago,
        pagoEm: pago ? vencimento : undefined,
        recorrente: modelo.recorrente,
        formaPagamento: modelo.recorrente ? "Boleto" : "Transferência",
      });
    }

    // Receitas fora da operação principal aparecem de vez em quando.
    if (random() > 0.68) {
      const dia = Math.min(diasNoMes, 8 + Math.floor(random() * 16));
      const data = `${referencia.slice(0, 7)}-${String(dia).padStart(2, "0")}`;
      if (data <= hoje) {
        const valor = Math.round(segmento.metaReceitaMensal * (0.02 + random() * 0.05));
        transacoes.push({
          id: id("trx", contadorTransacao++),
          tipo: "receita",
          descricao: escolher(random, [
            "Rendimento de aplicação",
            "Venda de produto avulso",
            "Parceria / repasse",
            "Reembolso de convênio",
          ]),
          categoria: "Receitas não operacionais",
          centroCusto: "Administrativo",
          natureza: "variavel",
          valor,
          data,
          vencimento: data,
          pago: true,
          pagoEm: data,
          recorrente: false,
          formaPagamento: "Transferência",
        });
      }
    }
  }

  return { clientes, servicos, profissionais, atendimentos, transacoes };
}
