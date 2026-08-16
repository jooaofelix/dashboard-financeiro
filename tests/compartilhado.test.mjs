/**
 * Leitura do texto que chega pelo "Compartilhar" do celular.
 *
 * O texto vem de conversa humana, então o risco não é falhar — é *acertar
 * errado*: ler a hora "10:30" como R$ 10,30 e gravar um lançamento plausível e
 * falso. Boa parte dos casos abaixo protege exatamente isso.
 *
 *   node tests/compartilhado.test.mjs
 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const dir = mkdtempSync(join(tmpdir(), "base-compartilhado-"));
execFileSync(
  "npx",
  ["tsc", "src/lib/compartilhado.ts", "--outDir", dir, "--module", "esnext",
   "--target", "es2022", "--moduleResolution", "bundler", "--skipLibCheck"],
  { stdio: "pipe" }
);
writeFileSync(join(dir, "package.json"), JSON.stringify({ type: "module" }));

const { interpretarValor, separarCabecalho, interpretarCompartilhado } =
  await import(join(dir, "compartilhado.js"));

let falhas = 0;
const teste = (nome, fn) => {
  try { fn(); console.log("✓ " + nome); }
  catch (e) { falhas++; console.log("✗ " + nome + " — " + e.message); }
};

const compartilhar = (texto) =>
  interpretarCompartilhado(new URLSearchParams({ texto }));

/* -------------------------------------------------------- valores */

teste("lê o valor escrito como brasileiro escreve", () => {
  assert.equal(interpretarValor("R$ 320,00"), 320);
  assert.equal(interpretarValor("r$1.234,56"), 1234.56);
  assert.equal(interpretarValor("2.500"), 2500);
  assert.equal(interpretarValor("320"), 320);
});

teste("vírgula é decimal e ponto é milhar — nunca o contrário", () => {
  assert.equal(interpretarValor("1.200,50"), 1200.5);
  assert.equal(interpretarValor("1.200"), 1200, "sem vírgula, ponto é milhar");
});

teste("acha o valor no meio da frase", () => {
  assert.equal(interpretarValor("pode ser 320 no pix?"), 320);
  assert.equal(interpretarValor("recebi R$ 450,00 da consulta de hoje"), 450);
});

teste("hora não vira dinheiro", () => {
  assert.equal(interpretarValor("chego às 10:30"), undefined);
  assert.equal(interpretarValor("das 14:00 às 15:30"), undefined);
});

teste("data não vira dinheiro", () => {
  assert.equal(interpretarValor("marcamos para 15/08"), undefined);
  assert.equal(interpretarValor("dia 15/08/2026 tudo bem"), undefined);
});

teste("telefone não vira dinheiro", () => {
  assert.equal(interpretarValor("meu número é (11) 98888-7777"), undefined);
});

teste("hora junto com preço: fica o preço", () => {
  assert.equal(interpretarValor("às 10:30, fica 250"), 250);
});

teste("texto sem número nenhum não inventa valor", () => {
  assert.equal(interpretarValor("bom dia, tudo bem?"), undefined);
});

teste("zero não vale como valor", () => {
  assert.equal(interpretarValor("0"), undefined);
});

/* -------------------------------------------------------- cabeçalho */

teste("separa o cabeçalho do WhatsApp (data primeiro)", () => {
  const r = separarCabecalho("[15/08/2026 10:32] Marina Duarte: pode ser 320?");
  assert.equal(r.contato, "Marina Duarte");
  assert.equal(r.mensagem, "pode ser 320?");
});

teste("separa o cabeçalho com hora primeiro, como o iOS exporta", () => {
  const r = separarCabecalho("[10:32, 15/08/2026] Marina Duarte: pode ser 320?");
  assert.equal(r.contato, "Marina Duarte");
  assert.equal(r.mensagem, "pode ser 320?");
});

teste("aceita as variações de pontuação entre versões", () => {
  for (const cabecalho of [
    "15/08/2026, 10:32 - Marina Duarte: oi",
    "[15/08/2026, 10:32:07] Marina Duarte: oi",
    "(15.08.2026 10:32) Marina Duarte: oi",
  ]) {
    assert.equal(separarCabecalho(cabecalho).contato, "Marina Duarte", cabecalho);
  }
});

teste('"Você" não vira nome de cliente', () => {
  assert.equal(separarCabecalho("[15/08/2026 10:32] Você: recebi 320").contato, undefined);
  assert.equal(separarCabecalho("[15/08/2026 10:32] Eu: recebi 320").contato, undefined);
});

teste("mensagem solta, sem cabeçalho, sobrevive inteira", () => {
  const r = separarCabecalho("recebi 320 da Ana");
  assert.equal(r.contato, undefined);
  assert.equal(r.mensagem, "recebi 320 da Ana");
});

teste("dois-pontos no meio do texto não viram cabeçalho", () => {
  const r = separarCabecalho("atenção: o valor é 320");
  assert.equal(r.contato, undefined, "sem data antes, não é cabeçalho");
  assert.equal(r.mensagem, "atenção: o valor é 320");
});

/* -------------------------------------------------------- entrada completa */

teste("mensagem compartilhada do WhatsApp vira valor e contato", () => {
  const r = compartilhar("[15/08/2026 10:32] Marina Duarte: consegue fazer por R$ 280,00?");
  assert.equal(r.valor, 280);
  assert.equal(r.contato, "Marina Duarte");
  assert.equal(r.mensagem, "consegue fazer por R$ 280,00?");
});

teste("o texto original é preservado para a pessoa conferir", () => {
  const texto = "[15/08/2026 10:32] Marina: 280";
  assert.equal(compartilhar(texto).original, texto);
});

teste("compartilhamento vazio não abre lançamento nenhum", () => {
  assert.equal(interpretarCompartilhado(new URLSearchParams()), null);
  assert.equal(interpretarCompartilhado(new URLSearchParams({ texto: "   " })), null);
});

teste("título e link também são aproveitados", () => {
  const r = interpretarCompartilhado(
    new URLSearchParams({ titulo: "Consulta", texto: "valor 190" })
  );
  assert.equal(r.valor, 190);
  assert.ok(r.original.includes("Consulta"));
});

teste("mensagem sem valor ainda abre a tela, só sem preencher", () => {
  const r = compartilhar("[15/08/2026 10:32] Marina Duarte: bom dia!");
  assert.equal(r.valor, undefined);
  assert.equal(r.contato, "Marina Duarte", "o nome ainda ajuda");
});

teste("uma conversa colada inteira usa o primeiro valor, não o último", () => {
  const r = compartilhar(
    "[15/08 10:32] Marina: fica 320?\n[15/08 10:33] Você: fecho em 300"
  );
  assert.equal(r.valor, 320);
  assert.equal(r.contato, "Marina");
});

rmSync(dir, { recursive: true, force: true });
console.log(falhas ? `--- ${falhas} FALHA(S) ---` : "--- compartilhamento verificado ---");
process.exit(falhas ? 1 : 0);
