/**
 * Verifica o lembrete de cobrança: tom conforme a data, conteúdo da mensagem e
 * os links de WhatsApp e e-mail.
 *
 *   node tests/cobranca.test.mjs
 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const dir = mkdtempSync(join(tmpdir(), "base-cobranca-"));
execFileSync(
  "npx",
  [
    "tsc",
    "src/lib/cobranca.ts",
    "src/lib/format.ts",
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

for (const arquivo of ["cobranca.js", "format.js"]) {
  const caminho = join(dir, arquivo);
  if (!existsSync(caminho)) continue;
  writeFileSync(
    caminho,
    readFileSync(caminho, "utf8").replace(/from "(\.\/[^"]+)"/g, (_, alvo) =>
      alvo.endsWith(".js") ? `from "${alvo}"` : `from "${alvo}.js"`
    )
  );
}

const { linkEmail, linkWhatsApp, mensagemCobranca, telefoneWhatsApp, tomPorVencimento } =
  await import(join(dir, "cobranca.js"));

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

const HOJE = "2026-08-14";
const base = {
  cliente: "Ana Beatriz Souza",
  empresa: "Clínica Núcleo Saúde",
  valor: 320,
  vencimento: "2026-08-20",
  referencia: "Consulta inicial",
};

teste("o tom sai da data, não de uma escolha manual", () => {
  assert.equal(tomPorVencimento("2026-08-20", HOJE), "aviso");
  assert.equal(tomPorVencimento("2026-08-14", HOJE), "vencendo");
  assert.equal(tomPorVencimento("2026-08-01", HOJE), "vencido");
});

teste("a mensagem trata o cliente pelo primeiro nome", () => {
  assert.ok(mensagemCobranca(base, HOJE).startsWith("Oi, Ana!"));
});

teste("quem tem prazo não é cobrado como atrasado", () => {
  const texto = mensagemCobranca(base, HOJE);
  assert.ok(texto.includes("lembrar do pagamento"));
  assert.equal(texto.includes("em aberto"), false);
  assert.ok(texto.includes("Vencimento:"));
});

teste("quem está atrasado recebe o texto certo", () => {
  const texto = mensagemCobranca({ ...base, vencimento: "2026-07-10" }, HOJE);
  assert.ok(texto.includes("pagamento em aberto"));
  assert.ok(texto.includes("Venceu em: 10/07/2026"));
});

teste("valor e vencimento aparecem formatados em português", () => {
  const texto = mensagemCobranca(base, HOJE);
  assert.ok(/R\$\s?320,00/.test(texto), texto);
  assert.ok(texto.includes("20/08/2026"));
});

teste("a referência do que está sendo cobrado entra na abertura", () => {
  assert.ok(mensagemCobranca(base, HOJE).includes("de Consulta inicial"));
});

teste("sem referência, a frase continua correta", () => {
  const texto = mensagemCobranca({ ...base, referencia: undefined }, HOJE);
  assert.ok(texto.includes("do pagamento."), texto.split("\n")[0]);
});

teste("o Pix copia e cola entra quando existe", () => {
  const texto = mensagemCobranca({ ...base, pix: "00020126BR6304ABCD" }, HOJE);
  assert.ok(texto.includes("Pix copia e cola"));
  assert.ok(texto.includes("00020126BR6304ABCD"));
});

teste("sem chave Pix, a mensagem não promete um código que não existe", () => {
  assert.equal(mensagemCobranca(base, HOJE).includes("Pix"), false);
});

teste("a mensagem assina com o nome do negócio", () => {
  assert.ok(mensagemCobranca(base, HOJE).includes("— Clínica Núcleo Saúde"));
});

teste("celular com DDD ganha o código do país", () => {
  assert.equal(telefoneWhatsApp("(11) 98888-7777"), "5511988887777");
  assert.equal(telefoneWhatsApp("11 3333-4444"), "551133334444");
});

teste("número que já tem o país não ganha outro", () => {
  assert.equal(telefoneWhatsApp("+55 11 98888-7777"), "5511988887777");
});

teste("número curto demais não vira link", () => {
  assert.equal(telefoneWhatsApp("98888-777"), null);
  assert.equal(telefoneWhatsApp(""), null);
  assert.equal(telefoneWhatsApp(undefined), null);
});

teste("o link do WhatsApp leva a mensagem escapada", () => {
  const url = new URL(linkWhatsApp("5511988887777", mensagemCobranca(base, HOJE)));
  assert.equal(url.origin + url.pathname, "https://wa.me/5511988887777");
  assert.ok(url.searchParams.get("text").includes("Ana"));
  assert.ok(url.searchParams.get("text").includes("320,00"));
});

teste("quebras de linha sobrevivem ao link", () => {
  const url = new URL(linkWhatsApp("5511988887777", "linha1\nlinha2"));
  assert.equal(url.searchParams.get("text"), "linha1\nlinha2");
});

teste("o link de e-mail leva assunto e corpo", () => {
  const link = linkEmail("ana@exemplo.com", "Cobrança", "corpo da mensagem");
  assert.ok(link.startsWith("mailto:ana@exemplo.com?"));
  assert.ok(link.includes("subject=Cobran%C3%A7a"));
  assert.ok(link.includes("body=corpo%20da%20mensagem"));
});

rmSync(dir, { recursive: true, force: true });
console.log(falhas ? `--- ${falhas} FALHA(S) ---` : "--- cobrança verificada ---");
process.exit(falhas ? 1 : 0);
