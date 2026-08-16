"use client";

import { useEffect } from "react";

/**
 * Registra o service worker, que é o que torna a BASE instalável no celular —
 * e, uma vez instalada, o que a faz aparecer no menu "Compartilhar" do Android.
 *
 * Não renderiza nada. Falha em silêncio de propósito: navegador sem suporte,
 * aba anônima ou origem sem HTTPS simplesmente seguem usando o app normalmente
 * pela web. Nenhuma funcionalidade depende disto para existir.
 */
export default function RegistrarApp() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    // Espera o carregamento terminar: registrar durante a primeira pintura
    // disputa banda com o próprio app.
    const registrar = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    };
    if (document.readyState === "complete") registrar();
    else window.addEventListener("load", registrar, { once: true });
    return () => window.removeEventListener("load", registrar);
  }, []);

  return null;
}
