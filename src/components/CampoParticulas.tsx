/**
 * Poeira de partículas do fundo das telas de entrada. Geradas com semente fixa
 * para o servidor e o cliente desenharem exatamente as mesmas posições — se
 * fossem aleatórias em tempo de render, a hidratação acusaria divergência.
 */

interface Particula {
  x: number;
  y: number;
  r: number;
  o: number;
}

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PARTICULAS: Particula[] = (() => {
  const random = mulberry32(20260808);
  return Array.from({ length: 150 }, () => ({
    x: Number((random() * 100).toFixed(2)),
    y: Number((random() * 100).toFixed(2)),
    r: Number((0.9 + random() * 2.6).toFixed(2)),
    o: Number((0.1 + random() * 0.34).toFixed(2)),
  }));
})();

/**
 * A poeira some no miolo da tela: por cima do formulário ela vira ruído, e o
 * conteúdo é o que precisa ser lido. A máscara radial deixa as partículas
 * viverem só nas bordas.
 */
const MASCARA =
  "radial-gradient(closest-side ellipse at 50% 46%, transparent 0%, transparent 34%, #000 78%)";

export default function CampoParticulas({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
      preserveAspectRatio="none"
      style={{ maskImage: MASCARA, WebkitMaskImage: MASCARA }}
      aria-hidden
    >
      {PARTICULAS.map((p, i) => (
        <circle
          key={i}
          cx={`${p.x}%`}
          cy={`${p.y}%`}
          r={p.r}
          fill="var(--brand)"
          opacity={p.o}
        />
      ))}
    </svg>
  );
}
