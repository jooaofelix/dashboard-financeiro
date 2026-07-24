"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useData } from "@/lib/data-context";
import { formatCurrency, formatDate, todayISO } from "@/lib/format";
import StatusBadge from "@/components/StatusBadge";
import { StatusPagamento } from "@/lib/types";

const STATUS_OPTIONS: StatusPagamento[] = ["pago", "pendente", "atrasado"];

export default function ConsultasPage() {
  const { consultas, addConsulta, updateConsulta, removeConsulta } = useData();
  const [paciente, setPaciente] = useState("");
  const [data, setData] = useState(todayISO());
  const [valor, setValor] = useState("");
  const [status, setStatus] = useState<StatusPagamento>("pendente");
  const [formaPagamento, setFormaPagamento] = useState("");

  const consultasOrdenadas = useMemo(
    () => [...consultas].sort((a, b) => b.data.localeCompare(a.data)),
    [consultas]
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!paciente.trim() || !valor) return;
    addConsulta({
      paciente: paciente.trim(),
      data,
      valor: Number(valor),
      status,
      formaPagamento: formaPagamento.trim() || undefined,
    });
    setPaciente("");
    setValor("");
    setFormaPagamento("");
    setStatus("pendente");
    setData(todayISO());
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Consultas</h1>
        <p className="text-sm text-slate-500">
          Cadastre consultas e controle o pagamento de cada paciente
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-6"
      >
        <div className="lg:col-span-2">
          <label className="mb-1 block text-xs font-medium text-slate-600">
            Paciente
          </label>
          <input
            value={paciente}
            onChange={(e) => setPaciente(e.target.value)}
            placeholder="Nome do paciente"
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
          <label className="mb-1 block text-xs font-medium text-slate-600">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as StatusPagamento)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s === "pago" ? "Pago" : s === "pendente" ? "Pendente" : "Atrasado"}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Forma pgto.
            </label>
            <input
              value={formaPagamento}
              onChange={(e) => setFormaPagamento(e.target.value)}
              placeholder="Pix, cartão..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="flex h-[38px] items-center gap-1 rounded-lg bg-teal-600 px-3 text-sm font-medium text-white hover:bg-teal-700"
          >
            <Plus size={16} />
            Add
          </button>
        </div>
      </form>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500">
              <th className="px-4 py-3 font-medium">Paciente</th>
              <th className="px-4 py-3 font-medium">Data</th>
              <th className="px-4 py-3 font-medium">Valor</th>
              <th className="px-4 py-3 font-medium">Forma</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {consultasOrdenadas.map((c) => (
              <tr key={c.id} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-3 font-medium text-slate-800">{c.paciente}</td>
                <td className="px-4 py-3 text-slate-600">{formatDate(c.data)}</td>
                <td className="px-4 py-3 text-slate-600">{formatCurrency(c.valor)}</td>
                <td className="px-4 py-3 text-slate-600">{c.formaPagamento || "—"}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <StatusBadge status={c.status} />
                    <select
                      value={c.status}
                      onChange={(e) =>
                        updateConsulta(c.id, {
                          status: e.target.value as StatusPagamento,
                        })
                      }
                      className="rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-xs text-slate-500 focus:outline-none"
                      aria-label={`Alterar status de ${c.paciente}`}
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s === "pago" ? "Pago" : s === "pendente" ? "Pendente" : "Atrasado"}
                        </option>
                      ))}
                    </select>
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => removeConsulta(c.id)}
                    className="rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                    aria-label="Remover consulta"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
            {consultasOrdenadas.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  Nenhuma consulta cadastrada ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
