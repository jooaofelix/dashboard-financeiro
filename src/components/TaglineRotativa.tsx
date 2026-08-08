"use client";

import { useEffect, useState } from "react";

/**
 * A assinatura da tela de entrada troca sozinha o sujeito da frase, sublinhando
 * a palavra que muda.
 *
 * Duas decisões que fazem a animação não atrapalhar:
 *
 * - Todas as variações ocupam a **mesma célula de grade**, então o bloco tem a
 *   largura da maior e o texto centralizado nunca "pula" a cada troca.
 * - Quem pediu menos movimento no sistema vê só a primeira frase, parada. O
 *   ciclo nem começa.
 */
const FRASES = [
  "toda decisão",
  "todo futuro",
  "todo crescimento",
  "toda meta",
  "todo próximo passo",
];

const COMPLEMENTO = "começa na base.";
const INTERVALO = 3200;

export default function TaglineRotativa({ className = "" }: { className?: string }) {
  const [indice, setIndice] = useState(0);

  useEffect(() => {
    const menosMovimento = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (menosMovimento.matches) return;

    const id = setInterval(
      () => setIndice((atual) => (atual + 1) % FRASES.length),
      INTERVALO
    );
    return () => clearInterval(id);
  }, []);

  return (
    <p className={`text-center text-[15px] leading-relaxed text-ink-2 ${className}`}>
      {/* Leitores de tela recebem uma frase estável; o carrossel é decorativo. */}
      <span className="sr-only">{`${FRASES[0]} ${COMPLEMENTO}`}</span>

      <span aria-hidden className="grid justify-items-center">
        {FRASES.map((frase, i) => {
          const ativa = i === indice;
          return (
            <span
              key={frase}
              className="col-start-1 row-start-1 whitespace-nowrap transition-[opacity,transform] duration-500 ease-out"
              style={{
                opacity: ativa ? 1 : 0,
                transform: `translateY(${ativa ? 0 : 6}px)`,
              }}
            >
              <span className="relative font-semibold text-brand">
                {frase}
                {/* O sublinhado é desenhado da esquerda para a direita quando a
                    frase entra — some junto quando ela sai. */}
                <span
                  className="absolute inset-x-0 -bottom-0.5 h-0.5 origin-left rounded-full bg-brand/45 transition-transform duration-500 ease-out"
                  style={{
                    transform: `scaleX(${ativa ? 1 : 0})`,
                    transitionDelay: ativa ? "160ms" : "0ms",
                  }}
                />
              </span>{" "}
              <span className="text-ink-2">{COMPLEMENTO}</span>
            </span>
          );
        })}
      </span>
    </p>
  );
}
