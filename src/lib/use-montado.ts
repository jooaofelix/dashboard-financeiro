"use client";

import { useSyncExternalStore } from "react";

/** O status de montagem nunca muda depois da hidratação — nada a assinar. */
function assinarNada() {
  return () => {};
}

/**
 * `false` no servidor e na primeira pintura, `true` depois de hidratar. Usado
 * para adiar o que só existe no navegador (localStorage, formatação de moeda)
 * sem divergência de hidratação.
 */
export function useMontado(): boolean {
  return useSyncExternalStore(
    assinarNada,
    () => true,
    () => false
  );
}
