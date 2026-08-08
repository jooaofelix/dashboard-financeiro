/**
 * Verifica a geração de agenda contra o que Google, Apple e Outlook esperam:
 * estrutura da RFC 5545, escape de caracteres, dobra de linha e o cálculo de
 * início/fim (inclusive dia inteiro e virada de meia-noite).
 *
 *   node tests/agenda.test.mjs
 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// O módulo é TypeScript; transpila para ESM com o compilador do próprio projeto.
const dir = mkdtempSync(join(tmpdir(), "base-agenda-"));
execFileSync(
  "npx",
  [
    "tsc",
    "src/lib/agenda.ts",
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

// O TypeScript emite `from "./format"` sem extensão; o ESM do Node exige o
// `.js`. Reescrever aqui evita alterar os imports do código-fonte só por causa
// do teste.
for (const arquivo of ["agenda.js", "format.js", "types.js"]) {
  const caminho = join(dir, arquivo);
  if (!existsSync(caminho)) continue;
  writeFileSync(
    caminho,
    readFileSync(caminho, "utf8").replace(/from "(\.\/[^"]+)"/g, (_, alvo) =>
      alvo.endsWith(".js") ? `from "${alvo}"` : `from "${alvo}.js"`
    )
  );
}

const agenda = await import(join(dir, "agenda.js"));
const {
  gerarICS,
  linkGoogleAgenda,
  atendimentoParaEvento,
  eventosRelevantes,
} = agenda;

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

const evento = (extra = {}) => ({
  id: "atd-001",
  titulo: "Consulta inicial — Ana Souza",
  descricao: "Cliente: Ana Souza\nValor: R$ 320,00",
  data: "2026-09-10",
  duracaoMin: 50,
  ...extra,
});

teste("ICS tem a moldura VCALENDAR/VEVENT", () => {
  const ics = gerarICS([evento({ hora: "14:00" })]);
  for (const marca of ["BEGIN:VCALENDAR", "VERSION:2.0", "BEGIN:VEVENT", "END:VEVENT", "END:VCALENDAR"]) {
    assert.ok(ics.includes(marca), "faltou " + marca);
  }
});

teste("ICS usa CRLF, como a RFC exige", () => {
  const ics = gerarICS([evento({ hora: "14:00" })]);
  assert.ok(ics.includes("\r\n"));
  assert.equal(/[^\r]\n/.test(ics), false, "há \\n sem \\r antes");
});

teste("evento com hora vira intervalo correto (14:00 + 50min = 14:50)", () => {
  const ics = gerarICS([evento({ hora: "14:00" })]);
  assert.ok(ics.includes("DTSTART:20260910T140000"), "início errado");
  assert.ok(ics.includes("DTEND:20260910T145000"), "fim errado");
});

teste("evento sem hora vira dia inteiro com fim exclusivo", () => {
  const ics = gerarICS([evento()]);
  assert.ok(ics.includes("DTSTART;VALUE=DATE:20260910"), "início errado");
  assert.ok(ics.includes("DTEND;VALUE=DATE:20260911"), "fim deve ser o dia seguinte");
});

teste("evento que atravessa a meia-noite termina no dia seguinte", () => {
  const ics = gerarICS([evento({ hora: "23:30", duracaoMin: 60 })]);
  assert.ok(ics.includes("DTSTART:20260910T233000"));
  assert.ok(ics.includes("DTEND:20260911T003000"), "deveria virar o dia");
});

teste("caracteres especiais são escapados", () => {
  const ics = gerarICS([
    evento({ hora: "09:00", titulo: "Sessão; teste, com \\ barra", descricao: "linha1\nlinha2" }),
  ]);
  assert.ok(ics.includes("SUMMARY:Sessão\\; teste\\, com \\\\ barra"), "escape do título");
  assert.ok(ics.includes("linha1\\nlinha2"), "quebra de linha escapada");
});

teste("linhas longas são dobradas em no máximo 75 caracteres", () => {
  const ics = gerarICS([evento({ hora: "09:00", descricao: "x".repeat(400) })]);
  const longas = ics.split("\r\n").filter((l) => l.length > 75);
  assert.equal(longas.length, 0, longas.length + " linha(s) acima do limite");
});

teste("link do Google leva título, datas e fuso", () => {
  const url = new URL(linkGoogleAgenda(evento({ hora: "14:00" })));
  assert.equal(url.origin + url.pathname, "https://calendar.google.com/calendar/render");
  assert.equal(url.searchParams.get("action"), "TEMPLATE");
  assert.equal(url.searchParams.get("text"), "Consulta inicial — Ana Souza");
  assert.equal(url.searchParams.get("dates"), "20260910T140000/20260910T145000");
  assert.ok(url.searchParams.get("ctz"), "faltou o fuso horário");
});

teste("link de evento sem hora usa formato de dia inteiro", () => {
  const url = new URL(linkGoogleAgenda(evento()));
  assert.equal(url.searchParams.get("dates"), "20260910/20260911");
});

teste("lançamento vira evento com o vocabulário do segmento", () => {
  const e = atendimentoParaEvento(
    {
      id: "a1",
      clienteId: "c1",
      data: "2026-09-10",
      hora: "10:30",
      vencimento: "2026-09-20",
      valor: 500,
      desconto: 50,
      status: "pendente",
      recorrencia: "unica",
    },
    {
      cliente: { id: "c1", nome: "Ana Souza", tipo: "pf", desde: "2026-01-01", ativo: true },
      servico: {
        id: "s1",
        nome: "Audiência",
        categoria: "Contencioso",
        valorPadrao: 500,
        custoDireto: 0,
        duracaoMin: 120,
        ativo: true,
      },
      rotuloAtendimento: "Honorário",
    }
  );
  assert.equal(e.titulo, "Audiência — Ana Souza");
  assert.equal(e.hora, "10:30");
  assert.equal(e.duracaoMin, 120);
  assert.ok(e.descricao.includes("Honorário: Audiência"), "usa o rótulo do segmento");
  assert.ok(e.descricao.includes("450,00"), "valor líquido considera o desconto");
});

teste("só entram na agenda os eventos de hoje em diante, em ordem", () => {
  const lista = eventosRelevantes(
    [
      evento({ id: "velho", data: "2026-01-01" }),
      evento({ id: "depois", data: "2026-09-20" }),
      evento({ id: "antes", data: "2026-09-11" }),
    ],
    "2026-09-01"
  );
  assert.deepEqual(lista.map((e) => e.id), ["antes", "depois"]);
});

rmSync(dir, { recursive: true, force: true });
console.log(falhas ? `--- ${falhas} FALHA(S) ---` : "--- agenda verificada ---");
process.exit(falhas ? 1 : 0);
