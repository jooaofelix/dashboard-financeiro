"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CircleDollarSign, Clock, TrendingDown, Wallet } from "lucide-react";
import { useData } from "@/lib/data-context";
import StatCard from "@/components/StatCard";
import { formatCurrency } from "@/lib/format";
import {
  distribuicaoStatusConsultas,
  receitasDespesasPorMes,
  saldoAtual,
  totalDespesas,
  totalPendente,
  totalRecebido,
} from "@/lib/stats";

const STATUS_COLORS: Record<string, string> = {
  pago: "#0d9488",
  pendente: "#d97706",
  atrasado: "#e11d48",
};

export default function DashboardPage() {
  const { consultas, transacoes } = useData();

  const recebido = useMemo(
    () => totalRecebido(consultas, transacoes),
    [consultas, transacoes]
  );
  const pendente = useMemo(
    () => totalPendente(consultas, transacoes),
    [consultas, transacoes]
  );
  const despesas = useMemo(() => totalDespesas(transacoes), [transacoes]);
  const saldo = useMemo(
    () => saldoAtual(consultas, transacoes),
    [consultas, transacoes]
  );
  const serieMensal = useMemo(
    () => receitasDespesasPorMes(consultas, transacoes),
    [consultas, transacoes]
  );
  const distribuicao = useMemo(
    () => distribuicaoStatusConsultas(consultas),
    [consultas]
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500">
          Visão geral das suas consultas e finanças
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Recebido"
          value={formatCurrency(recebido)}
          icon={CircleDollarSign}
          tone="teal"
        />
        <StatCard
          label="A receber"
          value={formatCurrency(pendente)}
          icon={Clock}
          tone="amber"
        />
        <StatCard
          label="Despesas"
          value={formatCurrency(despesas)}
          icon={TrendingDown}
          tone="rose"
        />
        <StatCard
          label="Saldo atual"
          value={formatCurrency(saldo)}
          icon={Wallet}
          tone="slate"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:col-span-2">
          <h2 className="mb-4 text-sm font-semibold text-slate-700">
            Receitas x Despesas (últimos 6 meses)
          </h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={serieMensal}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="mes" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <YAxis
                  tick={{ fontSize: 12 }}
                  stroke="#94a3b8"
                  tickFormatter={(v) => `R$${v}`}
                />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Legend />
                <Bar dataKey="receitas" name="Receitas" fill="#0d9488" radius={[4, 4, 0, 0]} />
                <Bar dataKey="despesas" name="Despesas" fill="#e11d48" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-slate-700">
            Status das consultas
          </h2>
          <div className="h-72">
            {distribuicao.length === 0 ? (
              <p className="text-sm text-slate-400">Sem consultas cadastradas.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={distribuicao}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                  >
                    {distribuicao.map((entry) => (
                      <Cell key={entry.status} fill={STATUS_COLORS[entry.status]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
