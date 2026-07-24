"use client";

import { createContext, useContext, useMemo } from "react";
import { useLocalStorage } from "./use-local-storage";
import { consultasIniciais, transacoesIniciais } from "./mock-data";
import { Consulta, Transacao } from "./types";

interface DataContextValue {
  consultas: Consulta[];
  transacoes: Transacao[];
  addConsulta: (consulta: Omit<Consulta, "id">) => void;
  updateConsulta: (id: string, patch: Partial<Consulta>) => void;
  removeConsulta: (id: string) => void;
  addTransacao: (transacao: Omit<Transacao, "id">) => void;
  updateTransacao: (id: string, patch: Partial<Transacao>) => void;
  removeTransacao: (id: string) => void;
}

const DataContext = createContext<DataContextValue | null>(null);

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [consultas, setConsultas] = useLocalStorage<Consulta[]>(
    "df:consultas",
    consultasIniciais
  );
  const [transacoes, setTransacoes] = useLocalStorage<Transacao[]>(
    "df:transacoes",
    transacoesIniciais
  );

  const value = useMemo<DataContextValue>(
    () => ({
      consultas,
      transacoes,
      addConsulta: (consulta) =>
        setConsultas((prev) => [...prev, { ...consulta, id: generateId() }]),
      updateConsulta: (id, patch) =>
        setConsultas((prev) =>
          prev.map((c) => (c.id === id ? { ...c, ...patch } : c))
        ),
      removeConsulta: (id) =>
        setConsultas((prev) => prev.filter((c) => c.id !== id)),
      addTransacao: (transacao) =>
        setTransacoes((prev) => [...prev, { ...transacao, id: generateId() }]),
      updateTransacao: (id, patch) =>
        setTransacoes((prev) =>
          prev.map((t) => (t.id === id ? { ...t, ...patch } : t))
        ),
      removeTransacao: (id) =>
        setTransacoes((prev) => prev.filter((t) => t.id !== id)),
    }),
    [consultas, transacoes, setConsultas, setTransacoes]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData deve ser usado dentro de DataProvider");
  return ctx;
}
