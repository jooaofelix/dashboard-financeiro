/**
 * Verifica a matemática do plano de crescimento: rampa mensal, marcos, alvo de
 * um mês qualquer, tradução em esforço e o diagnóstico contra o realizado.
 *
 *   node tests/plano.test.mjs
 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const dir = mkdtempSync(join(tmpdir(), "base-plano-"));
execFileSync(
  "npx",
  [
    "tsc",
    "src/lib/plano.ts",
    "src/lib/format.ts",
    "src/lib/types.ts",
    "--outDir",
    dir,
    "--module",
    "esnext",
    "--target",
    "es2022",
    "--moduleResolution",
    "bundler",
    "--skipLibCheck",
  ],
  { stdio: "pipe" }
);
writeFileSync(join(dir, "package.json"), JSON.stringify({ type: "module" }));

for (const arquivo of ["plano.js", "format.js", "types.js"]) {
  const caminho = join(dir, arquivo);
  if (!existsSync(caminho)) continue;
  writeFileSync(
    caminho,
    readFileSync(caminho, "utf8").replace(/from "(\.\/[^"]+)"/g, (_, alvo) =>
      alvo.endsWith(".js") ? `from "${alvo}"` : `from "${alvo}.js"`
    )
  );
}

const {
  alvoDoMes,
  avaliarPlano,
  crescimentoMensalPercent,
  distanciaEmMeses,
  esforcoDoMes,
  marcoDoMes,
  incrementoMensal,
  planoDaConfig,
  planoValido,
  trajetoria,
} = await import(join(dir, "plano.js"));

let falhas = 0;
const teste = (nome, fn) => {
  try {
    fn();
    console.log("✓ " + nome);
  } catch (e) {
    falhas++;
    console.log("✗ " + nome + " — " + e.message);
  }
};

/** Sair de 40 mil e chegar a 60 mil em 12 meses. */
const plano = {
  faturamentoBase: 40000,
  metaReceitaMensal: 60000,
  horizonteMeses: 12,
  inicio: "2026-08",
};

teste("a rampa divide a diferença pelo prazo", () => {
  assert.equal(incrementoMensal(plano), 20000 / 12);
});

teste("meta abaixo do ponto de partida gera rampa negativa (redução planejada)", () => {
  const encolher = { ...plano, metaReceitaMensal: 28000 };
  assert.ok(incrementoMensal(encolher) < 0);
  assert.equal(alvoDoMes(encolher, "2026-07"), 40000, "antes do plano, o alvo é a base");
  assert.equal(alvoDoMes(encolher, "2027-07"), 28000);
});

teste("o percentual composto equivalente confere", () => {
  const taxa = crescimentoMensalPercent(plano) / 100;
  assert.ok(Math.abs(40000 * Math.pow(1 + taxa, 12) - 60000) < 0.01);
});

teste("sem ponto de partida não há percentual — e o app não inventa um", () => {
  assert.equal(crescimentoMensalPercent({ ...plano, faturamentoBase: 0 }), null);
});

teste("a trajetória tem um marco por mês do prazo, começando no mês de partida", () => {
  const marcos = trajetoria(plano);
  assert.equal(marcos.length, 12);
  assert.equal(marcos[0].chave, "2026-08", "o mês de partida é o marco 1");
  assert.equal(marcos[11].chave, "2027-07");
  assert.equal(marcos[0].numero, 1);
});

teste("o último marco é exatamente a meta", () => {
  const marcos = trajetoria(plano);
  assert.equal(marcos[11].alvo, 60000);
});

teste("a trajetória cruza o ano sem errar o mês", () => {
  const marcos = trajetoria({ ...plano, inicio: "2026-11", horizonteMeses: 4 });
  assert.deepEqual(marcos.map((m) => m.chave), ["2026-11", "2026-12", "2027-01", "2027-02"]);
});

teste("alvo antes da partida é o próprio ponto de partida", () => {
  assert.equal(alvoDoMes(plano, "2026-05"), 40000);
});

teste("alvo depois do prazo vira patamar a manter", () => {
  assert.equal(alvoDoMes(plano, "2029-01"), 60000);
});

teste("o mês de partida já é cobrado — o marco 1 é ele", () => {
  assert.equal(marcoDoMes(plano, "2026-08"), 1);
  assert.equal(marcoDoMes(plano, "2026-07"), 0, "antes do plano não há marco");
  assert.equal(alvoDoMes(plano, "2026-08"), 40000 + 20000 / 12);
});

teste("alvo no meio da rampa é interpolado", () => {
  // Marco 6 de 12: 40k + 6 passos de 1.666,67.
  assert.equal(alvoDoMes(plano, "2027-01"), 50000);
});

teste("distância entre meses atravessa anos", () => {
  assert.equal(distanciaEmMeses("2026-08", "2027-08"), 12);
  assert.equal(distanciaEmMeses("2026-08", "2026-08"), 0);
  assert.equal(distanciaEmMeses("2027-01", "2026-11"), -2);
});

teste("o alvo vira esforço concreto no ticket médio", () => {
  const e = esforcoDoMes(50000, 320);
  assert.equal(e.atendimentos, Math.ceil(50000 / 320));
  assert.equal(e.porSemana, Math.ceil(e.atendimentos / 4.33));
});

teste("sem ticket médio não há esforço a calcular", () => {
  assert.equal(esforcoDoMes(50000, 0), null);
});

teste("mês no alvo é diagnosticado no ritmo", () => {
  const d = avaliarPlano(plano, new Map([["2027-01", 50000]]), "2027-01");
  assert.equal(d.alvoMes, 50000);
  assert.equal(d.diferenca, 0);
  assert.equal(d.noRitmo, true);
  assert.equal(d.mesesDecorridos, 6);
  assert.equal(d.mesesRestantes, 6);
});

teste("mês abaixo do alvo é diagnosticado fora do ritmo", () => {
  const d = avaliarPlano(plano, new Map([["2027-01", 41000]]), "2027-01");
  assert.equal(d.noRitmo, false);
  assert.equal(d.diferenca, -9000);
  assert.ok(d.aderenciaPercent > 81 && d.aderenciaPercent < 83);
});

teste("uma folga de 5% não vira acusação de atraso", () => {
  const d = avaliarPlano(plano, new Map([["2027-01", 48000]]), "2027-01");
  assert.equal(d.noRitmo, true, "48k contra alvo de 50k é 96% — está no ritmo");
});

teste("o ritmo observado é projetado até o fim do prazo", () => {
  // 6 meses decorridos, saiu de 40k para 50k: ganho médio de 1.666,67/mês.
  const d = avaliarPlano(plano, new Map([["2027-01", 50000]]), "2027-01");
  assert.ok(Math.abs(d.projecaoFinal - 60000) < 1);
  assert.equal(d.chegaNaMeta, true);
});

teste("ritmo fraco projeta chegada abaixo da meta", () => {
  const d = avaliarPlano(plano, new Map([["2027-01", 43000]]), "2027-01");
  assert.ok(d.projecaoFinal < 60000);
  assert.equal(d.chegaNaMeta, false);
});

teste("antes do plano começar não se projeta ritmo nenhum", () => {
  const d = avaliarPlano(plano, new Map([["2026-07", 40000]]), "2026-07");
  assert.equal(d.mesesDecorridos, 0);
  assert.equal(d.chegaNaMeta, false, "sem mês do plano fechado, não dá para prever");
  assert.equal(d.projecaoFinal, 40000);
});

teste("o primeiro mês do plano já produz um ritmo observável", () => {
  const d = avaliarPlano(plano, new Map([["2026-08", 45000]]), "2026-08");
  assert.equal(d.mesesDecorridos, 1);
  assert.equal(d.mesesRestantes, 11);
  // Ganhou 5.000 num mês; mantendo isso chega bem acima da meta.
  assert.equal(d.projecaoFinal, 45000 + 5000 * 11);
  assert.equal(d.chegaNaMeta, true);
});

teste("o incremento necessário é recalculado sobre o que falta", () => {
  const d = avaliarPlano(plano, new Map([["2027-01", 44000]]), "2027-01");
  assert.equal(d.incrementoNecessario, (60000 - 44000) / 6);
});

teste("meta já alcançada não pede incremento", () => {
  const d = avaliarPlano(plano, new Map([["2027-01", 61000]]), "2027-01");
  assert.equal(d.incrementoNecessario, 0);
});

teste("prazo vencido é marcado como concluído", () => {
  const d = avaliarPlano(plano, new Map([["2027-08", 58000]]), "2027-08");
  assert.equal(d.concluido, true);
  assert.equal(d.mesesRestantes, 0);
  assert.equal(d.incrementoNecessario, 0);
});

teste("mês sem faturamento não quebra o diagnóstico", () => {
  const d = avaliarPlano(plano, new Map(), "2027-01");
  assert.equal(d.realizadoMes, 0);
  assert.equal(d.noRitmo, false);
  assert.equal(d.aderenciaPercent, 0);
});

teste("plano sem prazo ou sem meta é recusado", () => {
  assert.equal(planoValido({ ...plano, horizonteMeses: 0 }), false);
  assert.equal(planoValido({ ...plano, metaReceitaMensal: 0 }), false);
  assert.equal(planoValido({ ...plano, inicio: "" }), false);
  assert.equal(planoValido(null), false);
  assert.equal(planoValido(plano), true);
});

teste("configuração antiga, sem plano, não vira trajetória", () => {
  assert.equal(planoDaConfig({ metaReceitaMensal: 60000 }), null);
});

teste("configuração completa vira plano", () => {
  const p = planoDaConfig({
    metaReceitaMensal: 60000,
    faturamentoBase: 40000,
    metaHorizonteMeses: 12,
    planoInicio: "2026-08",
  });
  assert.deepEqual(p, plano);
});

rmSync(dir, { recursive: true, force: true });
console.log(falhas ? `--- ${falhas} FALHA(S) ---` : "--- plano verificado ---");
process.exit(falhas ? 1 : 0);
