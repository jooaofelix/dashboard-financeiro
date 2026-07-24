"use client";

import { useCallback, useSyncExternalStore } from "react";

type Listener = () => void;

const listeners = new Map<string, Set<Listener>>();
const cache = new Map<string, unknown>();

function getListeners(key: string): Set<Listener> {
  let set = listeners.get(key);
  if (!set) {
    set = new Set();
    listeners.set(key, set);
  }
  return set;
}

function readValue<T>(key: string, initialValue: T): T {
  if (typeof window === "undefined") return initialValue;
  try {
    const stored = window.localStorage.getItem(key);
    return stored ? (JSON.parse(stored) as T) : initialValue;
  } catch {
    return initialValue;
  }
}

export function useLocalStorage<T>(key: string, initialValue: T) {
  const subscribe = useCallback(
    (onStoreChange: Listener) => {
      const set = getListeners(key);
      set.add(onStoreChange);
      return () => set.delete(onStoreChange);
    },
    [key]
  );

  const getSnapshot = useCallback(() => {
    if (!cache.has(key)) cache.set(key, readValue(key, initialValue));
    return cache.get(key) as T;
    // initialValue only matters on first read per key; intentionally excluded
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const getServerSnapshot = useCallback(() => initialValue, [initialValue]);

  const value = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setValue = useCallback(
    (updater: T | ((prev: T) => T)) => {
      const prev = cache.has(key) ? (cache.get(key) as T) : readValue(key, initialValue);
      const next =
        typeof updater === "function" ? (updater as (prev: T) => T)(prev) : updater;
      cache.set(key, next);
      window.localStorage.setItem(key, JSON.stringify(next));
      getListeners(key).forEach((listener) => listener());
    },
    [key, initialValue]
  );

  return [value, setValue] as const;
}
