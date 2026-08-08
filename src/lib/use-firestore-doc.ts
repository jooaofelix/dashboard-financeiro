"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "./firebase";

interface Estado<T> {
  caminho: string | null;
  valor: T | null;
  carregado: boolean;
}

/**
 * Documento único do workspace (`usuarios/{uid}`), onde vivem o perfil e as
 * configurações.
 *
 * Como nas coleções, o caminho viaja junto com o valor: ao trocar de conta a
 * tela volta ao padrão em vez de mostrar a configuração da conta anterior.
 */
export function useFirestoreDoc<T extends object>(
  caminho: string | null,
  padrao: T
) {
  const [estado, setEstado] = useState<Estado<T>>({
    caminho,
    valor: null,
    carregado: false,
  });

  useEffect(() => {
    if (!caminho || !db) return;
    return onSnapshot(doc(db, caminho), (snap) => {
      setEstado((anterior) => ({
        caminho,
        valor: snap.exists()
          ? { ...(anterior.caminho === caminho ? anterior.valor : null), ...(snap.data() as T) }
          : null,
        carregado: true,
      }));
    });
  }, [caminho]);

  const atual = estado.caminho === caminho;
  const valor = atual && estado.valor ? { ...padrao, ...estado.valor } : padrao;

  function salvar(patch: Partial<T>) {
    setEstado((anterior) => ({
      caminho,
      valor: { ...padrao, ...(anterior.caminho === caminho ? anterior.valor : null), ...patch },
      carregado: anterior.caminho === caminho ? anterior.carregado : false,
    }));
    if (!db || !caminho) return;
    void setDoc(doc(db, caminho), patch, { merge: true });
  }

  return { valor, salvar, carregado: atual && estado.carregado };
}
