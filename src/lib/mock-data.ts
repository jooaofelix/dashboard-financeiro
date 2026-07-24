import { Consulta, Transacao } from "./types";

export const consultasIniciais: Consulta[] = [
  {
    id: "c1",
    paciente: "Ana Beatriz Souza",
    data: "2026-07-02",
    valor: 250,
    status: "pago",
    formaPagamento: "Pix",
  },
  {
    id: "c2",
    paciente: "Carlos Eduardo Lima",
    data: "2026-07-08",
    valor: 250,
    status: "pago",
    formaPagamento: "Cartão",
  },
  {
    id: "c3",
    paciente: "Fernanda Ribeiro",
    data: "2026-07-15",
    valor: 300,
    status: "pendente",
  },
  {
    id: "c4",
    paciente: "João Pedro Alves",
    data: "2026-07-10",
    valor: 250,
    status: "atrasado",
  },
  {
    id: "c5",
    paciente: "Marina Costa",
    data: "2026-07-20",
    valor: 300,
    status: "pago",
    formaPagamento: "Dinheiro",
  },
  {
    id: "c6",
    paciente: "Ana Beatriz Souza",
    data: "2026-07-23",
    valor: 250,
    status: "pendente",
  },
];

export const transacoesIniciais: Transacao[] = [
  {
    id: "t1",
    tipo: "receita",
    descricao: "Consultas recebidas",
    categoria: "Consultas",
    valor: 800,
    data: "2026-07-15",
    pago: true,
  },
  {
    id: "t2",
    tipo: "despesa",
    descricao: "Aluguel do consultório",
    categoria: "Estrutura",
    valor: 1200,
    data: "2026-07-05",
    pago: true,
  },
  {
    id: "t3",
    tipo: "despesa",
    descricao: "Material de escritório",
    categoria: "Materiais",
    valor: 90,
    data: "2026-07-12",
    pago: true,
  },
  {
    id: "t4",
    tipo: "despesa",
    descricao: "Plataforma de agendamento",
    categoria: "Assinaturas",
    valor: 60,
    data: "2026-07-01",
    pago: false,
  },
];
