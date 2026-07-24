export type StatusPagamento = "pago" | "pendente" | "atrasado";

export interface Consulta {
  id: string;
  paciente: string;
  data: string; // ISO date (yyyy-mm-dd)
  valor: number;
  status: StatusPagamento;
  formaPagamento?: string;
  observacao?: string;
}

export type TipoTransacao = "receita" | "despesa";

export interface Transacao {
  id: string;
  tipo: TipoTransacao;
  descricao: string;
  categoria: string;
  valor: number;
  data: string; // ISO date (yyyy-mm-dd)
  pago: boolean;
}
