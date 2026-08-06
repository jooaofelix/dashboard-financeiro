"use client";

import { useEffect, useState } from "react";
import { User, onAuthStateChanged, signInAnonymously } from "firebase/auth";
import { auth, isFirebaseConfigured } from "./firebase";

export function useAnonymousAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(!isFirebaseConfigured);

  useEffect(() => {
    if (!isFirebaseConfigured || !auth) return;
    const authInstance = auth;

    const unsubscribe = onAuthStateChanged(authInstance, (current) => {
      if (current) {
        setUser(current);
        setReady(true);
      } else {
        signInAnonymously(authInstance).catch((error) => {
          console.error("Falha ao autenticar anonimamente no Firebase", error);
          setReady(true);
        });
      }
    });

    return unsubscribe;
  }, []);

  return { user, ready };
}
