"use client";

import { createContext, useContext, useEffect, useMemo, useRef } from "react";
import { addDoc, collection } from "firebase/firestore";
import { useLocalStorage } from "./use-local-storage";
import { useFirestoreCollection } from "./use-firestore-collection";
import { useAnonymousAuth } from "./use-anonymous-auth";
import { consultasIniciais, transacoesIniciais } from "./mock-data";
import { Consulta, Transacao } from "./types";
import { db, isFirebaseConfigured } from "./firebase";

interface DataContextValue {
  consultas: Consulta[];
  transacoes: Transacao[];
  addConsulta: (consulta: Omit<Consulta, "id">) => void;
  updateConsulta: (id: string, patch: Partial<Consulta>) => void;
  removeConsulta: (id: string) => void;
  addTransacao: (transacao: Omit<Transacao, "id">) => void;
  updateTransacao: (id: string, patch: Partial<Transacao>) => void;
  removeTransacao: (id: string) => void;
  usandoFirebase: boolean;
}

const DataContext = createContext<DataContextValue | null>(null);

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

function useLocalData() {
  const [consultas, setConsultas] = useLocalStorage<Consulta[]>(
    "df:consultas",
    consultasIniciais
  );
  const [transacoes, setTransacoes] = useLocalStorage<Transacao[]>(
    "df:transacoes",
    transacoesIniciais
  );

  return {
    consultas,
    transacoes,
    addConsulta: (consulta: Omit<Consulta, "id">) =>
      setConsultas((prev) => [...prev, { ...consulta, id: generateId() }]),
    updateConsulta: (id: string, patch: Partial<Consulta>) =>
      setConsultas((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c))),
    removeConsulta: (id: string) =>
      setConsultas((prev) => prev.filter((c) => c.id !== id)),
    addTransacao: (transacao: Omit<Transacao, "id">) =>
      setTransacoes((prev) => [...prev, { ...transacao, id: generateId() }]),
    updateTransacao: (id: string, patch: Partial<Transacao>) =>
      setTransacoes((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t))),
    removeTransacao: (id: string) =>
      setTransacoes((prev) => prev.filter((t) => t.id !== id)),
  };
}

function useFirestoreData(authReady: boolean) {
  const consultasCol = useFirestoreCollection<Consulta>("consultas", authReady);
  const transacoesCol = useFirestoreCollection<Transacao>("transacoes", authReady);
  const seeded = useRef(false);

  useEffect(() => {
    if (!authReady || !db || seeded.current) return;
    if (consultasCol.items.length > 0 || transacoesCol.items.length > 0) {
      seeded.current = true;
      return;
    }
    seeded.current = true;
    const database = db;
    consultasIniciais.forEach((consulta) => {
      const { id, ...rest } = consulta;
      void id;
      addDoc(collection(database, "consultas"), rest);
    });
    transacoesIniciais.forEach((transacao) => {
      const { id, ...rest } = transacao;
      void id;
      addDoc(collection(database, "transacoes"), rest);
    });
  }, [authReady, consultasCol.items.length, transacoesCol.items.length]);

  return {
    consultas: consultasCol.items,
    transacoes: transacoesCol.items,
    addConsulta: (consulta: Omit<Consulta, "id">) => consultasCol.add(consulta),
    updateConsulta: (id: string, patch: Partial<Consulta>) => consultasCol.update(id, patch),
    removeConsulta: (id: string) => consultasCol.remove(id),
    addTransacao: (transacao: Omit<Transacao, "id">) => transacoesCol.add(transacao),
    updateTransacao: (id: string, patch: Partial<Transacao>) => transacoesCol.update(id, patch),
    removeTransacao: (id: string) => transacoesCol.remove(id),
  };
}

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { ready: authReady } = useAnonymousAuth();
  const localData = useLocalData();
  const firestoreData = useFirestoreData(authReady);
  const data = isFirebaseConfigured ? firestoreData : localData;

  const value = useMemo<DataContextValue>(
    () => ({ ...data, usandoFirebase: isFirebaseConfigured }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data.consultas, data.transacoes]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData deve ser usado dentro de DataProvider");
  return ctx;
}
