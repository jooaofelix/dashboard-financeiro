"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useData } from "@/lib/data-context";
import { formatCurrency, formatDate, todayISO } from "@/lib/format";
import { TipoTransacao } from "@/lib/types";
import { totalDespesas, totalTransacoes } from "@/lib/stats";
import StatCard from "@/components/StatCard";
import { ArrowDownCircle, ArrowUpCircle, Scale } from "lucide-react";

export default function FinanceiroPage() {
  const { transacoes, addTransacao, updateTransacao, removeTransacao } = useData();
  const [descricao, setDescricao] = useState("");
  const [categoria, setCategoria] = useState("");
  const [valor, setValor] = useState("");
  const [tipo, setTipo] = useState<TipoTransacao>("despesa");
  const [data, setData] = useState(todayISO());
  const [pago, setPago] = useState(true);

  const transacoesOrdenadas = useMemo(
    () => [...transacoes].sort((a, b) => b.data.localeCompare(a.data)),
    [transacoes]
  );

  const receitas = useMemo(() => totalTransacoes(transacoes, "receita", true), [transacoes]);
  const despesas = useMemo(() => totalDespesas(transacoes), [transacoes]);
  const saldo = receitas - despesas;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!descricao.trim() || !valor) return;
    addTransacao({
      descricao: descricao.trim(),
      categoria: categoria.trim() || "Geral",
      valor: Number(valor),
      tipo,
      data,
      pago,
    });
    setDescricao("");
    setCategoria("");
    setValor("");
    setTipo("despesa");
    setData(todayISO());
    setPago(true);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Financeiro</h1>
        <p className="text-sm text-slate-500">
          Receitas e despesas gerais além das consultas
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Receitas"
          value={formatCurrency(receitas)}
          icon={ArrowUpCircle}
          tone="teal"
        />
        <StatCard
          label="Despesas"
          value={formatCurrency(despesas)}
          icon={ArrowDownCircle}
          tone="rose"
        />
        <StatCard label="Saldo" value={formatCurrency(saldo)} icon={Scale} tone="slate" />
      </div>

      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-6"
      >
        <div className="lg:col-span-2">
          <label className="mb-1 block text-xs font-medium text-slate-600">
            Descrição
          </label>
          <input
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder="Ex: Aluguel do consultório"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">
            Categoria
          </label>
          <input
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
            placeholder="Estrutura, materiais..."
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Valor</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            placeholder="0,00"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Data</label>
          <input
            type="date"
            value={data}
            onChange={(e) => setData(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
            required
          />
        </div>
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-slate-600">Tipo</label>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value as TipoTransacao)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
            >
              <option value="receita">Receita</option>
              <option value="despesa">Despesa</option>
            </select>
          </div>
          <button
            type="submit"
            className="flex h-[38px] items-center gap-1 rounded-lg bg-teal-600 px-3 text-sm font-medium text-white hover:bg-teal-700"
          >
            <Plus size={16} />
            Add
          </button>
        </div>
        <label className="flex items-center gap-2 text-xs font-medium text-slate-600 lg:col-span-6">
          <input
            type="checkbox"
            checked={pago}
            onChange={(e) => setPago(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
          />
          Já foi pago/recebido
        </label>
      </form>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500">
              <th className="px-4 py-3 font-medium">Descrição</th>
              <th className="px-4 py-3 font-medium">Categoria</th>
              <th className="px-4 py-3 font-medium">Data</th>
              <th className="px-4 py-3 font-medium">Valor</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {transacoesOrdenadas.map((t) => (
              <tr key={t.id} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-3 font-medium text-slate-800">{t.descricao}</td>
                <td className="px-4 py-3 text-slate-600">{t.categoria}</td>
                <td className="px-4 py-3 text-slate-600">{formatDate(t.data)}</td>
                <td
                  className={`px-4 py-3 font-medium ${
                    t.tipo === "receita" ? "text-teal-700" : "text-rose-700"
                  }`}
                >
                  {t.tipo === "receita" ? "+" : "-"}
                  {formatCurrency(t.valor)}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => updateTransacao(t.id, { pago: !t.pago })}
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${
                      t.pago
                        ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20"
                        : "bg-amber-50 text-amber-700 ring-amber-600/20"
                    }`}
                  >
                    {t.pago ? "Pago" : "Pendente"}
                  </button>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => removeTransacao(t.id)}
                    className="rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                    aria-label="Remover transação"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
            {transacoesOrdenadas.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  Nenhuma transação cadastrada ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
