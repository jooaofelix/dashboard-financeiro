/**
 * Verifica o Pix copia e cola contra o padrão EMV MPM do Banco Central:
 * estrutura dos campos, limites de tamanho, normalização da chave e o CRC.
 *
 * Um código com um byte errado é recusado pelo aplicativo do banco sem
 * explicação nenhuma — é o tipo de defeito que só aparece na mão do cliente.
 *
 *   node tests/pix.test.mjs
 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const dir = mkdtempSync(join(tmpdir(), "base-pix-"));
execFileSync(
  "npx",
  [
    "tsc",
    "src/lib/pix.ts",
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

const {
  chaveValida,
  crc16,
  detectarTipoChave,
  gerarPixCopiaECola,
  normalizarChave,
  normalizarIdentificador,
  normalizarTexto,
  pixValido,
} = await import(join(dir, "pix.js"));

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

/** Lê o payload como o aplicativo do banco lê: campo a campo. */
function lerCampos(payload) {
  const campos = {};
  let i = 0;
  while (i < payload.length) {
    const id = payload.slice(i, i + 2);
    const tamanho = Number(payload.slice(i + 2, i + 4));
    campos[id] = payload.slice(i + 4, i + 4 + tamanho);
    i += 4 + tamanho;
  }
  return campos;
}

const cobranca = {
  chave: "12345678909",
  nome: "Clínica Núcleo Saúde",
  cidade: "São Paulo",
  valor: 320,
  identificador: "ATD-001",
};

teste("CRC-16/CCITT-FALSE confere com o vetor de referência", () => {
  // Vetor clássico da especificação: CRC de "123456789" é 0x29B1.
  assert.equal(crc16("123456789"), "29B1");
});

teste("o CRC tem sempre quatro dígitos hexadecimais", () => {
  for (const entrada of ["", "a", "0".repeat(500), "çãé"]) {
    assert.match(crc16(entrada), /^[0-9A-F]{4}$/);
  }
});

teste("o código gerado fecha o próprio CRC", () => {
  assert.equal(pixValido(gerarPixCopiaECola(cobranca)), true);
});

teste("um byte trocado invalida o código", () => {
  const codigo = gerarPixCopiaECola(cobranca);
  const adulterado = codigo.slice(0, 40) + (codigo[40] === "1" ? "2" : "1") + codigo.slice(41);
  assert.equal(pixValido(adulterado), false);
});

teste("a moldura obrigatória está presente", () => {
  const campos = lerCampos(gerarPixCopiaECola(cobranca));
  assert.equal(campos["00"], "01", "indicador de formato");
  assert.equal(campos["52"], "0000", "categoria do estabelecimento");
  assert.equal(campos["53"], "986", "moeda: real");
  assert.equal(campos["58"], "BR", "país");
});

teste("a chave entra sob o domínio do Pix", () => {
  const campos = lerCampos(gerarPixCopiaECola(cobranca));
  const conta = lerCampos(campos["26"]);
  assert.equal(conta["00"], "br.gov.bcb.pix");
  assert.equal(conta["01"], "12345678909");
});

teste("o valor sai com duas casas e ponto decimal", () => {
  assert.equal(lerCampos(gerarPixCopiaECola({ ...cobranca, valor: 1234.5 }))["54"], "1234.50");
  assert.equal(lerCampos(gerarPixCopiaECola({ ...cobranca, valor: 0.99 }))["54"], "0.99");
});

teste("cobrança sem valor omite o campo — o pagador digita quanto quer", () => {
  const campos = lerCampos(gerarPixCopiaECola({ ...cobranca, valor: undefined }));
  assert.equal("54" in campos, false);
  assert.equal(pixValido(gerarPixCopiaECola({ ...cobranca, valor: undefined })), true);
});

teste("acentos são removidos de nome e cidade", () => {
  const campos = lerCampos(gerarPixCopiaECola(cobranca));
  assert.equal(campos["59"], "Clinica Nucleo Saude");
  assert.equal(campos["60"], "Sao Paulo");
});

teste("nome e cidade respeitam os limites do padrão", () => {
  const campos = lerCampos(
    gerarPixCopiaECola({
      ...cobranca,
      nome: "Consultorio de Odontologia Integrada Sao Jose",
      cidade: "Sao Jose do Rio Preto",
    })
  );
  assert.ok(campos["59"].length <= 25, "nome tem " + campos["59"].length);
  assert.ok(campos["60"].length <= 15, "cidade tem " + campos["60"].length);
});

teste("o identificador vira alfanumérico e cabe em 25", () => {
  assert.equal(normalizarIdentificador("ATD-001/2026"), "ATD0012026");
  // Acento vira a letra sem acento — descartar "çãé" perderia informação útil.
  assert.equal(normalizarIdentificador("çãé"), "cae");
  assert.equal(normalizarIdentificador("---/---"), "***", "sem nada aproveitável, usa o curinga");
  assert.equal(normalizarIdentificador("x".repeat(40)).length, 25);
});

teste("sem identificador, o padrão manda usar ***", () => {
  const campos = lerCampos(gerarPixCopiaECola({ ...cobranca, identificador: undefined }));
  assert.equal(lerCampos(campos["62"])["05"], "***");
});

teste("cada tipo de chave é reconhecido pela forma", () => {
  assert.equal(detectarTipoChave("12345678909"), "cpf");
  assert.equal(detectarTipoChave("123.456.789-09"), "cpf");
  assert.equal(detectarTipoChave("12.345.678/0001-90"), "cnpj");
  assert.equal(detectarTipoChave("contato@clinica.com.br"), "email");
  assert.equal(detectarTipoChave("+5511988887777"), "telefone");
  assert.equal(detectarTipoChave("123e4567-e12b-12d1-a456-426655440000"), "aleatoria");
  assert.equal(detectarTipoChave("nada disso"), null);
});

teste("telefone ganha o +55 que o padrão exige", () => {
  assert.equal(normalizarChave("(11) 98888-7777", "telefone"), "+5511988887777");
  assert.equal(normalizarChave("+55 11 98888-7777", "telefone"), "+5511988887777");
});

teste("CPF e CNPJ perdem a pontuação", () => {
  assert.equal(normalizarChave("123.456.789-09", "cpf"), "12345678909");
  assert.equal(normalizarChave("12.345.678/0001-90", "cnpj"), "12345678000190");
});

teste("e-mail vai em minúsculas", () => {
  assert.equal(normalizarChave("  Contato@Clinica.com.BR ", "email"), "contato@clinica.com.br");
});

teste("chave inválida é recusada em vez de gerar um código quebrado", () => {
  assert.equal(chaveValida("qualquer coisa"), false);
  assert.throws(() => gerarPixCopiaECola({ ...cobranca, chave: "qualquer coisa" }));
});

teste("todo tipo de chave produz um código válido", () => {
  for (const chave of [
    "12345678909",
    "12.345.678/0001-90",
    "contato@clinica.com.br",
    "+5511988887777",
    "123e4567-e12b-12d1-a456-426655440000",
  ]) {
    assert.equal(pixValido(gerarPixCopiaECola({ ...cobranca, chave })), true, chave);
  }
});

teste("o payload é só ASCII imprimível", () => {
  assert.match(gerarPixCopiaECola(cobranca), /^[\x20-\x7E]+$/);
});

teste("o corte respeita o limite e não deixa espaço nas pontas", () => {
  // Corta no limite, como as implementações de referência — sem tentar
  // adivinhar palavra: um nome mais curto que o permitido informa menos.
  assert.equal(normalizarTexto("Clinica Nucleo Saude Integrada", 17), "Clinica Nucleo Sa");
  assert.equal(normalizarTexto("Clinica Nucleo Saude", 15), "Clinica Nucleo");
  assert.equal(normalizarTexto("   Studio Lumine   ", 25), "Studio Lumine");
});

rmSync(dir, { recursive: true, force: true });
console.log(falhas ? `--- ${falhas} FALHA(S) ---` : "--- pix verificado ---");
process.exit(falhas ? 1 : 0);
