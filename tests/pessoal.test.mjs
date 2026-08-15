/**
 * Gasto pessoal pago pela empresa não é despesa da empresa: é retirada.
 * Este teste protege a separação — se ela vazar de volta para o resultado,
 * margem, ponto de equilíbrio e DRE passam a mentir sobre a operação.
 *
 *   node tests/pessoal.test.mjs
 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const dir = mkdtempSync(join(tmpdir(), "base-pessoal-"));
execFileSync(
  "npx",
  ["tsc", "src/lib/finance.ts", "--outDir", dir, "--module", "esnext", "--target", "es2022",
   "--moduleResolution", "bundler", "--skipLibCheck"],
  { stdio: "pipe" }
);
writeFileSync(join(dir, "package.json"), JSON.stringify({ type: "module" }));
for (const arquivo of ["finance.js", "plano.js", "format.js", "periodo.js", "types.js"]) {
  const caminho = join(dir, arquivo);
  if (!existsSync(caminho)) continue;
  writeFileSync(
    caminho,
    readFileSync(caminho, "utf8").replace(/from "(\.\/[^"]+)"/g, (_, alvo) =>
      alvo.endsWith(".js") ? `from "${alvo}"` : `from "${alvo}.js"`)
  );
}

const { calcularResumo, montarDRE, agruparDespesasPorCategoria, gerarAlertas } =
  await import(join(dir, "finance.js"));

let falhas = 0;
const teste = (nome, fn) => {
  try { fn(); console.log("✓ " + nome); }
  catch (e) { falhas++; console.log("✗ " + nome + " — " + e.message); }
};

const config = {
  segmentoId: "clinica", empresa: "Teste", aliquotaImpostos: 0,
  metaReceitaMensal: 0, tetoDespesaMensal: 0, saldoInicialCaixa: 0,
  reservaMinimaCaixa: 0, diasAlertaVencimento: 7,
};
const periodo = { inicio: "2026-08-01", fim: "2026-08-31", label: "Agosto" };

const despesa = (id, valor, extra = {}) => ({
  id, tipo: "despesa", descricao: id, categoria: "Estrutura", natureza: "fixo",
  valor, data: "2026-08-10", vencimento: "2026-08-10", pago: true,
  pagoEm: "2026-08-10", recorrente: false, ...extra,
});
const atendimento = (id, valor) => ({
  id, clienteId: "c1", data: "2026-08-05", vencimento: "2026-08-05", valor,
  desconto: 0, status: "pago", pagoEm: "2026-08-05", recorrencia: "unica",
});

const montarBase = (transacoes) => ({
  clientes: [{ id: "c1", nome: "Ana", tipo: "pf", desde: "2026-01-01", ativo: true }],
  servicos: [], profissionais: [],
  atendimentos: [atendimento("a1", 10000)],
  transacoes,
});

const semPessoal = montarBase([despesa("aluguel", 3000)]);
const comPessoal = montarBase([despesa("aluguel", 3000), despesa("mercado", 2000, { pessoal: true })]);

teste("gasto pessoal não entra nas despesas da empresa", () => {
  const r = calcularResumo(comPessoal, config, periodo);
  assert.equal(r.despesasTotais, 3000, "só o aluguel é despesa");
  assert.equal(r.retiradasPessoais, 2000);
});

teste("o resultado da operação não é penalizado pelo gasto pessoal", () => {
  const a = calcularResumo(semPessoal, config, periodo);
  const b = calcularResumo(comPessoal, config, periodo);
  assert.equal(a.lucroLiquido, b.lucroLiquido, "o mesmo negócio, o mesmo resultado");
});

teste("margem e ponto de equilíbrio ficam intactos", () => {
  const a = calcularResumo(semPessoal, config, periodo);
  const b = calcularResumo(comPessoal, config, periodo);
  assert.equal(a.margemLiquidaPercent, b.margemLiquidaPercent);
  assert.equal(a.pontoEquilibrio, b.pontoEquilibrio);
});

teste("mas o dinheiro que saiu do caixa continua contado", () => {
  const r = calcularResumo(comPessoal, config, periodo);
  assert.equal(r.pagoNoPeriodo, 5000, "o caixa pagou os dois");
});

teste("a mistura é medida em percentual do que o caixa pagou", () => {
  const r = calcularResumo(comPessoal, config, periodo);
  assert.equal(Math.round(r.misturaPercent), 40, "2.000 de 5.000");
});

teste("sem gasto pessoal, a mistura é zero", () => {
  assert.equal(calcularResumo(semPessoal, config, periodo).misturaPercent, 0);
});

teste("a DRE mostra a retirada depois do resultado, não dentro", () => {
  const linhas = montarDRE(comPessoal, config, periodo);
  const rotulos = linhas.map((l) => l.rotulo.trim());
  const iResultado = rotulos.indexOf("Resultado líquido do período");
  const iRetirada = rotulos.indexOf("(–) Retiradas e gastos pessoais");
  assert.ok(iRetirada > iResultado, "a retirada vem depois do resultado");
  assert.equal(linhas[iRetirada].valor, -2000);
});

teste("a DRE fecha com a sobra depois das retiradas", () => {
  const linhas = montarDRE(comPessoal, config, periodo);
  const resultado = linhas.find((l) => l.rotulo.trim() === "Resultado líquido do período").valor;
  const sobra = linhas.find((l) => l.rotulo.trim() === "Sobra depois das retiradas").valor;
  assert.equal(sobra, resultado - 2000);
});

teste("sem retirada, a DRE não ganha linhas vazias", () => {
  const rotulos = montarDRE(semPessoal, config, periodo).map((l) => l.rotulo.trim());
  assert.equal(rotulos.includes("(–) Retiradas e gastos pessoais"), false);
  assert.equal(rotulos.includes("Sobra depois das retiradas"), false);
});

teste("o gráfico de para onde vai o dinheiro ignora o pessoal", () => {
  const grupos = agruparDespesasPorCategoria(comPessoal, periodo);
  assert.equal(grupos.reduce((t, g) => t + g.total, 0), 3000);
});

teste("mistura alta vira alerta acionável", () => {
  const alertas = gerarAlertas(comPessoal, config, "2026-08-20");
  const alerta = alertas.find((a) => a.id === "mistura-pessoal");
  assert.ok(alerta, "deveria alertar com 40% de mistura");
  assert.ok(alerta.detalhe.includes("pró-labore"), "sugere o caminho de saída");
  assert.equal(alerta.href, "/contas");
});

teste("um gasto pessoal pequeno não vira alarme", () => {
  const pouco = montarBase([despesa("aluguel", 3000), despesa("cafe", 100, { pessoal: true })]);
  const alertas = gerarAlertas(pouco, config, "2026-08-20");
  assert.equal(alertas.find((a) => a.id === "mistura-pessoal"), undefined);
});

teste("lançamento antigo, sem o campo, continua sendo despesa da empresa", () => {
  const r = calcularResumo(semPessoal, config, periodo);
  assert.equal(r.despesasTotais, 3000);
  assert.equal(r.retiradasPessoais, 0);
});

rmSync(dir, { recursive: true, force: true });
console.log(falhas ? `--- ${falhas} FALHA(S) ---` : "--- separação pessoal verificada ---");
process.exit(falhas ? 1 : 0);
