/**
 * Com um plano em curso, a barra que o mês precisa vencer é o alvo da rampa —
 * não a meta do fim do prazo. Este teste protege essa regra, que é o que
 * impede o painel de acusar fracasso todo mês de um plano saudável.
 *
 *   node tests/meta-do-mes.test.mjs
 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const dir = mkdtempSync(join(tmpdir(), "base-meta-"));
execFileSync(
  "npx",
  [
    "tsc",
    "src/lib/finance.ts",
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

for (const arquivo of ["finance.js", "plano.js", "format.js", "periodo.js", "types.js"]) {
  const caminho = join(dir, arquivo);
  if (!existsSync(caminho)) continue;
  writeFileSync(
    caminho,
    readFileSync(caminho, "utf8").replace(/from "(\.\/[^"]+)"/g, (_, alvo) =>
      alvo.endsWith(".js") ? `from "${alvo}"` : `from "${alvo}.js"`
    )
  );
}

const { metaDoMes, metaDoPeriodo, gerarAlertas, faturamentoPorMes } = await import(
  join(dir, "finance.js")
);

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

const configBase = {
  segmentoId: "clinica",
  empresa: "Teste",
  aliquotaImpostos: 10,
  metaReceitaMensal: 60000,
  tetoDespesaMensal: 20000,
  saldoInicialCaixa: 0,
  reservaMinimaCaixa: 0,
  diasAlertaVencimento: 7,
};

const comPlano = {
  ...configBase,
  faturamentoBase: 40000,
  metaHorizonteMeses: 12,
  planoInicio: "2026-08",
};

const baseVazia = { clientes: [], servicos: [], profissionais: [], atendimentos: [], transacoes: [] };

/** Atendimento simples, já pago, para produzir faturamento num mês. */
const atendimento = (id, data, valor) => ({
  id,
  clienteId: "c1",
  data,
  vencimento: data,
  valor,
  desconto: 0,
  status: "pago",
  pagoEm: data,
  recorrencia: "unica",
});

teste("sem plano, a barra do mês é a meta mensal fixa", () => {
  assert.equal(metaDoMes(configBase, "2026-08"), 60000);
  assert.equal(metaDoMes(configBase, "2027-05"), 60000);
});

teste("com plano, a barra do mês é o alvo da rampa", () => {
  assert.equal(metaDoMes(comPlano, "2026-08"), 40000 + 20000 / 12, "marco 1");
  assert.equal(metaDoMes(comPlano, "2027-01"), 50000, "marco 6");
  assert.equal(metaDoMes(comPlano, "2027-07"), 60000, "último marco é a meta");
});

teste("antes do plano começar, a barra é o ponto de partida", () => {
  assert.equal(metaDoMes(comPlano, "2026-05"), 40000);
});

teste("depois do prazo, a barra vira o patamar da meta", () => {
  assert.equal(metaDoMes(comPlano, "2028-03"), 60000);
});

teste("num período de vários meses, a barra é a soma dos alvos", () => {
  const periodo = { inicio: "2026-08-01", fim: "2026-10-31", label: "3 meses" };
  const esperado =
    metaDoMes(comPlano, "2026-08") + metaDoMes(comPlano, "2026-09") + metaDoMes(comPlano, "2026-10");
  assert.equal(metaDoPeriodo(comPlano, periodo), esperado);
  assert.ok(esperado < 60000 * 3, "a rampa cobra menos que a meta final repetida");
});

teste("sem plano, o período continua sendo a meta mensal vezes os meses", () => {
  const periodo = { inicio: "2026-08-01", fim: "2026-10-31", label: "3 meses" };
  assert.equal(metaDoPeriodo(configBase, periodo), 60000 * 3);
});

teste("mês fechado abaixo da rampa vira alerta com o novo esforço", () => {
  // Julho fechou em 30k; o plano começou em junho, então julho é o marco 2.
  const plano = { ...comPlano, planoInicio: "2026-06" };
  const base = { ...baseVazia, atendimentos: [atendimento("a1", "2026-07-10", 30000)] };
  const alertas = gerarAlertas(base, plano, "2026-08-08");
  const alerta = alertas.find((a) => a.id === "plano-fora-do-ritmo");
  assert.ok(alerta, "deveria alertar");
  assert.equal(alerta.severidade, "warning");
  assert.ok(alerta.detalhe.includes("a mais por mês"), "diz o que fazer agora");
});

teste("mês fechado dentro da rampa não gera alerta", () => {
  const plano = { ...comPlano, planoInicio: "2026-06" };
  const base = { ...baseVazia, atendimentos: [atendimento("a1", "2026-07-10", 60000)] };
  const alertas = gerarAlertas(base, plano, "2026-08-08");
  assert.equal(alertas.find((a) => a.id === "plano-fora-do-ritmo"), undefined);
});

teste("mês anterior ao início do plano não é cobrado", () => {
  // Plano começa em agosto; julho não tinha rampa nenhuma para cumprir.
  const base = { ...baseVazia, atendimentos: [atendimento("a1", "2026-07-10", 1000)] };
  const alertas = gerarAlertas(base, comPlano, "2026-08-08");
  assert.equal(alertas.find((a) => a.id === "plano-fora-do-ritmo"), undefined);
});

teste("com o prazo vencido não há mais o que corrigir", () => {
  const plano = { ...comPlano, planoInicio: "2026-06", metaHorizonteMeses: 2 };
  const base = { ...baseVazia, atendimentos: [atendimento("a1", "2026-07-10", 1000)] };
  const alertas = gerarAlertas(base, plano, "2026-08-08");
  assert.equal(alertas.find((a) => a.id === "plano-fora-do-ritmo"), undefined);
});

teste("sem plano, esse alerta nunca aparece", () => {
  const base = { ...baseVazia, atendimentos: [atendimento("a1", "2026-07-10", 100)] };
  const alertas = gerarAlertas(base, configBase, "2026-08-08");
  assert.equal(alertas.find((a) => a.id === "plano-fora-do-ritmo"), undefined);
});

teste("o alerta do mês em curso mede contra o alvo da rampa, não contra a meta final", () => {
  // Dia 25/08: 80% do mês corrido. Faturou 34k — 82% do alvo (41.666), mas só
  // 57% da meta final. Contra a meta final o alerta dispararia sem motivo.
  const base = { ...baseVazia, atendimentos: [atendimento("a1", "2026-08-05", 34000)] };
  const comRampa = gerarAlertas(base, comPlano, "2026-08-25");
  assert.equal(
    comRampa.find((a) => a.id === "meta-abaixo"),
    undefined,
    "no ritmo da rampa: nada a alertar"
  );
  const semRampa = gerarAlertas(base, configBase, "2026-08-25");
  assert.ok(
    semRampa.find((a) => a.id === "meta-abaixo"),
    "contra a meta fixa de 60k, o mesmo mês está atrasado"
  );
});

teste("faturamentoPorMes ignora cancelados e soma o líquido", () => {
  const base = {
    ...baseVazia,
    atendimentos: [
      atendimento("a1", "2026-08-05", 1000),
      { ...atendimento("a2", "2026-08-06", 500), desconto: 100 },
      { ...atendimento("a3", "2026-08-07", 900), status: "cancelado" },
    ],
  };
  assert.equal(faturamentoPorMes(base).get("2026-08"), 1400);
});

rmSync(dir, { recursive: true, force: true });
console.log(falhas ? `--- ${falhas} FALHA(S) ---` : "--- meta do mês verificada ---");
process.exit(falhas ? 1 : 0);
