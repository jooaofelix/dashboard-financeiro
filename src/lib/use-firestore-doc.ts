"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "./firebase";

/**
 * Documento único (as configurações do workspace). Mantém o valor local até o
 * Firestore responder, para a interface nunca piscar com o padrão.
 */
export function useFirestoreDoc<T extends object>(
  caminho: [string, string],
  padrao: T,
  enabled: boolean
) {
  const [valor, setValor] = useState<T>(padrao);
  const [carregado, setCarregado] = useState(false);
  const [colecao, documento] = caminho;

  useEffect(() => {
    if (!enabled || !db) return;
    const referencia = doc(db, colecao, documento);
    return onSnapshot(referencia, (snap) => {
      if (snap.exists()) {
        setValor((atual) => ({ ...atual, ...(snap.data() as T) }));
      }
      setCarregado(true);
    });
  }, [colecao, documento, enabled]);

  function salvar(patch: Partial<T>) {
    setValor((atual) => ({ ...atual, ...patch }));
    if (!db) return;
    void setDoc(doc(db, colecao, documento), patch, { merge: true });
  }

  return { valor, salvar, carregado };
}
