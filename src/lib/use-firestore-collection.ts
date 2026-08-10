"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DocumentData,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "./firebase";

/** O Firestore rejeita `undefined`; campos opcionais vazios são simplesmente omitidos. */
function semUndefined<T extends object>(objeto: T): DocumentData {
  return Object.fromEntries(
    Object.entries(objeto).filter(([, valor]) => valor !== undefined)
  );
}

interface Estado<T> {
  caminho: string | null;
  items: T[];
  carregado: boolean;
}

/**
 * `caminho` é o caminho completo da subcoleção do usuário —
 * `usuarios/{uid}/clientes`. Quando é `null` não há sessão ainda e o hook fica
 * inerte: assinar uma coleção sem dono seria negado pelas regras de qualquer
 * forma.
 *
 * O caminho é guardado junto com os dados e conferido durante o render, então
 * uma troca de conta nunca exibe o resíduo da conta anterior — sem precisar
 * limpar estado dentro do efeito.
 */
export function useFirestoreCollection<T extends { id: string }>(
  caminho: string | null
) {
  const [estado, setEstado] = useState<Estado<T>>({
    caminho,
    items: [],
    carregado: false,
  });

  useEffect(() => {
    if (!caminho || !db) return;
    return onSnapshot(collection(db, caminho), (snapshot) => {
      setEstado({
        caminho,
        items: snapshot.docs.map(
          (docSnap) => ({ id: docSnap.id, ...docSnap.data() }) as T
        ),
        carregado: true,
      });
    });
  }, [caminho]);

  const atual = estado.caminho === caminho;

  const crud = useMemo(
    () => ({
      add: (item: Omit<T, "id">) => {
        if (!db || !caminho) return "";
        // A referência é criada antes da gravação: assim o id existe de imediato
        // para quem precisa referenciar o registro no mesmo gesto, sem esperar
        // a ida ao servidor.
        const referencia = doc(collection(db, caminho));
        void setDoc(referencia, semUndefined(item));
        return referencia.id;
      },
      update: (id: string, patch: Partial<T>) => {
        if (!db || !caminho) return;
        void updateDoc(doc(db, caminho, id), semUndefined(patch));
      },
      remove: (id: string) => {
        if (!db || !caminho) return;
        void deleteDoc(doc(db, caminho, id));
      },
    }),
    [caminho]
  );

  return {
    items: atual ? estado.items : [],
    carregado: atual && estado.carregado,
    crud,
  };
}
