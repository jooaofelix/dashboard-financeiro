"use client";

import { Moon, Sun } from "lucide-react";
import { CHAVE_TEMA } from "@/lib/tema";

/**
 * O tema atual mora no atributo `data-theme` do `<html>` — não em estado React.
 * Assim o botão não precisa espelhar (e ressincronizar) nada: os dois ícones são
 * renderizados e o CSS mostra o que vale para o tema em vigor.
 */
export default function ThemeToggle() {
  function alternar() {
    const raiz = document.documentElement;
    const proximo = raiz.getAttribute("data-theme") === "dark" ? "light" : "dark";
    raiz.setAttribute("data-theme", proximo);
    try {
      localStorage.setItem(CHAVE_TEMA, proximo);
    } catch {
      // Sem localStorage (janela restrita) a troca vale só nesta sessão.
    }
  }

  return (
    <button
      onClick={alternar}
      aria-label="Alternar entre tema claro e escuro"
      title="Alternar tema"
      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-surface text-ink-2 transition-colors hover:bg-raised hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
    >
      <Moon size={16} aria-hidden className="dark:hidden" />
      <Sun size={16} aria-hidden className="hidden dark:block" />
    </button>
  );
}
