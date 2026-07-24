import { Consulta, Transacao } from "./types";

export function totalConsultas(consultas: Consulta[], status?: Consulta["status"]) {
  return consultas
    .filter((c) => (status ? c.status === status : true))
    .reduce((sum, c) => sum + c.valor, 0);
}

export function totalTransacoes(
  transacoes: Transacao[],
  tipo: Transacao["tipo"],
  pagoApenas = true
) {
  return transacoes
    .filter((t) => t.tipo === tipo && (!pagoApenas || t.pago))
    .reduce((sum, t) => sum + t.valor, 0);
}

export function totalRecebido(consultas: Consulta[], transacoes: Transacao[]) {
  return (
    totalConsultas(consultas, "pago") + totalTransacoes(transacoes, "receita", true)
  );
}

export function totalPendente(consultas: Consulta[], transacoes: Transacao[]) {
  const consultasPendentes =
    totalConsultas(consultas, "pendente") + totalConsultas(consultas, "atrasado");
  const transacoesPendentes = transacoes
    .filter((t) => t.tipo === "receita" && !t.pago)
    .reduce((sum, t) => sum + t.valor, 0);
  return consultasPendentes + transacoesPendentes;
}

export function totalDespesas(transacoes: Transacao[]) {
  return totalTransacoes(transacoes, "despesa", true);
}

export function saldoAtual(consultas: Consulta[], transacoes: Transacao[]) {
  return totalRecebido(consultas, transacoes) - totalDespesas(transacoes);
}

const MESES = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

export function receitasDespesasPorMes(
  consultas: Consulta[],
  transacoes: Transacao[],
  meses = 6
) {
  const hoje = new Date();
  const buckets: { chave: string; mes: string; receitas: number; despesas: number }[] = [];

  for (let i = meses - 1; i >= 0; i--) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
    const chave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    buckets.push({ chave, mes: MESES[d.getMonth()], receitas: 0, despesas: 0 });
  }

  const bucketMap = new Map(buckets.map((b) => [b.chave, b]));

  for (const c of consultas) {
    if (c.status !== "pago") continue;
    const chave = c.data.slice(0, 7);
    const bucket = bucketMap.get(chave);
    if (bucket) bucket.receitas += c.valor;
  }

  for (const t of transacoes) {
    if (!t.pago) continue;
    const chave = t.data.slice(0, 7);
    const bucket = bucketMap.get(chave);
    if (!bucket) continue;
    if (t.tipo === "receita") bucket.receitas += t.valor;
    else bucket.despesas += t.valor;
  }

  return buckets;
}

export function distribuicaoStatusConsultas(consultas: Consulta[]) {
  const statuses: Consulta["status"][] = ["pago", "pendente", "atrasado"];
  const labels: Record<Consulta["status"], string> = {
    pago: "Pago",
    pendente: "Pendente",
    atrasado: "Atrasado",
  };
  return statuses
    .map((status) => ({
      status,
      name: labels[status],
      value: consultas.filter((c) => c.status === status).length,
    }))
    .filter((item) => item.value > 0);
}
