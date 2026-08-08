"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DocumentData,
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  updateDoc,
} from "firebase/firestore";
import { db } from "./firebase";

/** O Firestore rejeita `undefined`; campos opcionais vazios são simplesmente omitidos. */
function semUndefined<T extends object>(objeto: T): DocumentData {
  return Object.fromEntries(
    Object.entries(objeto).filter(([, valor]) => valor !== undefined)
  );
}

export function useFirestoreCollection<T extends { id: string }>(
  collectionName: string,
  enabled: boolean
) {
  const [items, setItems] = useState<T[]>([]);
  const [carregado, setCarregado] = useState(false);

  useEffect(() => {
    if (!enabled || !db) return;

    return onSnapshot(collection(db, collectionName), (snapshot) => {
      setItems(
        snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }) as T)
      );
      setCarregado(true);
    });
  }, [collectionName, enabled]);

  const crud = useMemo(
    () => ({
      add: (item: Omit<T, "id">) => {
        if (!db) return;
        void addDoc(collection(db, collectionName), semUndefined(item));
      },
      update: (id: string, patch: Partial<T>) => {
        if (!db) return;
        void updateDoc(doc(db, collectionName, id), semUndefined(patch));
      },
      remove: (id: string) => {
        if (!db) return;
        void deleteDoc(doc(db, collectionName, id));
      },
    }),
    [collectionName]
  );

  return { items, crud, carregado };
}
