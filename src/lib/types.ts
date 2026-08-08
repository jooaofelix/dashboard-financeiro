/**
 * Modelo de domínio genérico o suficiente para qualquer negócio de serviços:
 * clínica, escritório de advocacia, consultoria, estética, escola, etc.
 *
 * A tradução dos nomes ("paciente" x "cliente" x "aluno") vive em `segments.ts`
 * e é aplicada só na camada de interface — os dados são sempre os mesmos.
 */

export type StatusPagamento = "pago" | "pendente" | "atrasado" | "cancelado";

export type TipoTransacao = "receita" | "despesa";

export type TipoPessoa = "pf" | "pj";

export type Recorrencia = "unica" | "mensal" | "trimestral" | "anual";

/** Custo fixo acontece independente do volume; variável acompanha o faturamento. */
export type NaturezaCusto = "fixo" | "variavel";

export interface Cliente {
  id: string;
  nome: string;
  tipo: TipoPessoa;
  documento?: string;
  email?: string;
  telefone?: string;
  origem?: string;
  desde: string;
  ativo: boolean;
  observacao?: string;
}

export interface Servico {
  id: string;
  nome: string;
  categoria: string;
  valorPadrao: number;
  /** Custo que só existe quando o serviço é executado (material, laboratório, taxa). */
  custoDireto: number;
  duracaoMin: number;
  ativo: boolean;
}

export interface Profissional {
  id: string;
  nome: string;
  papel: string;
  /** Percentual do valor líquido do atendimento pago como comissão. */
  comissaoPercent: number;
  ativo: boolean;
}

/**
 * Receita operacional: o serviço prestado. É a unidade de faturamento do negócio
 * (consulta, sessão, audiência, sprint, mensalidade...).
 */
export interface Atendimento {
  id: string;
  clienteId: string;
  servicoId?: string;
  profissionalId?: string;
  descricao?: string;
  /** Data da execução — usada no regime de competência. */
  data: string;
  /** `HH:MM`. Opcional: sem hora, o evento na agenda vira "dia inteiro". */
  hora?: string;
  /** Vencimento do pagamento — usado no fluxo de caixa e no aging. */
  vencimento: string;
  valor: number;
  desconto: number;
  status: StatusPagamento;
  formaPagamento?: string;
  /** Data do recebimento — usada no regime de caixa. */
  pagoEm?: string;
  recorrencia: Recorrencia;
  observacao?: string;
}

/** Despesas e receitas não operacionais (aluguel, salários, aportes, juros...). */
export interface Transacao {
  id: string;
  tipo: TipoTransacao;
  descricao: string;
  categoria: string;
  centroCusto?: string;
  contraparte?: string;
  natureza: NaturezaCusto;
  valor: number;
  /** Competência. */
  data: string;
  vencimento: string;
  pago: boolean;
  pagoEm?: string;
  recorrente: boolean;
  formaPagamento?: string;
}

export interface Configuracao {
  segmentoId: string;
  empresa: string;
  /** Alíquota efetiva sobre o faturamento (Simples, presumido, ISS...). */
  aliquotaImpostos: number;
  metaReceitaMensal: number;
  tetoDespesaMensal: number;
  /** Caixa que já existia antes do primeiro lançamento do sistema. */
  saldoInicialCaixa: number;
  /** Caixa mínimo de segurança — alimenta o alerta de runway. */
  reservaMinimaCaixa: number;
  /** Janela do alerta "vence em breve". */
  diasAlertaVencimento: number;
  /** Marca que o workspace já passou pela configuração inicial. */
  onboardingConcluido?: boolean;
}

export interface BaseDados {
  clientes: Cliente[];
  servicos: Servico[];
  profissionais: Profissional[];
  atendimentos: Atendimento[];
  transacoes: Transacao[];
}

export const FORMAS_PAGAMENTO = [
  "Pix",
  "Cartão de crédito",
  "Cartão de débito",
  "Boleto",
  "Transferência",
  "Dinheiro",
  "Convênio",
] as const;

export const LABELS_STATUS: Record<StatusPagamento, string> = {
  pago: "Pago",
  pendente: "Pendente",
  atrasado: "Atrasado",
  cancelado: "Cancelado",
};

export const LABELS_RECORRENCIA: Record<Recorrencia, string> = {
  unica: "Avulso",
  mensal: "Mensal",
  trimestral: "Trimestral",
  anual: "Anual",
};
