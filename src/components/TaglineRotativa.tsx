"use client";

import { useEffect, useState } from "react";

/**
 * A assinatura da tela de entrada troca **apenas a expressão sublinhada** — o
 * complemento "começa na base." fica parado.
 *
 * Para o complemento não se mexer, as expressões dividem a mesma célula de
 * grade e são alinhadas à direita: a grade tem a largura da maior, então a
 * palavra sempre termina no mesmo ponto e o espaço até o complemento é
 * constante. Sem isso, cada troca empurraria o resto da frase para os lados.
 *
 * Quem pede menos movimento no sistema vê só a primeira expressão, parada.
 */
const EXPRESSOES = [
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
      () => setIndice((atual) => (atual + 1) % EXPRESSOES.length),
      INTERVALO
    );
    return () => clearInterval(id);
  }, []);

  return (
    <p className={`text-center text-[15px] leading-relaxed text-ink-2 ${className}`}>
      {/* Leitores de tela recebem uma frase estável; o rodízio é decorativo. */}
      <span className="sr-only">{`${EXPRESSOES[0]} ${COMPLEMENTO}`}</span>

      <span aria-hidden>
        <span className="inline-grid justify-items-end align-baseline">
          {EXPRESSOES.map((expressao, i) => {
            const ativa = i === indice;
            return (
              <span
                key={expressao}
                className="relative col-start-1 row-start-1 whitespace-nowrap font-semibold text-brand transition-[opacity,transform] duration-500 ease-out"
                style={{
                  opacity: ativa ? 1 : 0,
                  transform: `translateY(${ativa ? 0 : 5}px)`,
                }}
              >
                {expressao}
                {/* O sublinhado é desenhado da esquerda para a direita quando a
                    expressão entra, e recolhido quando ela sai. */}
                <span
                  className="absolute inset-x-0 -bottom-0.5 h-0.5 origin-left rounded-full bg-brand/45 transition-transform duration-500 ease-out"
                  style={{
                    transform: `scaleX(${ativa ? 1 : 0})`,
                    transitionDelay: ativa ? "160ms" : "0ms",
                  }}
                />
              </span>
            );
          })}
        </span>{" "}
        {COMPLEMENTO}
      </span>
    </p>
  );
}
