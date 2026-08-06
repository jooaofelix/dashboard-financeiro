"use client";

import { useEffect, useState } from "react";
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

export function useFirestoreCollection<T extends { id: string }>(
  collectionName: string,
  enabled: boolean
) {
  const [items, setItems] = useState<T[]>([]);

  useEffect(() => {
    if (!enabled || !db) return;

    const unsubscribe = onSnapshot(collection(db, collectionName), (snapshot) => {
      setItems(
        snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }) as T)
      );
    });

    return unsubscribe;
  }, [collectionName, enabled]);

  function add(item: Omit<T, "id">) {
    if (!db) return;
    addDoc(collection(db, collectionName), item);
  }

  function update(id: string, patch: Partial<T>) {
    if (!db) return;
    updateDoc(doc(db, collectionName, id), patch as DocumentData);
  }

  function remove(id: string) {
    if (!db) return;
    deleteDoc(doc(db, collectionName, id));
  }

  return { items, add, update, remove };
}
