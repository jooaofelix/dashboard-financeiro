import { addDays, formatCurrency, formatDate } from "./format";
import { Atendimento, Cliente, Profissional, Servico } from "./types";

/**
 * Ligação com agendas — em três níveis, do mais universal ao mais integrado:
 *
 * 1. **Link do Google Agenda**: abre o Google com o evento preenchido. Não
 *    exige login, permissão nem servidor.
 * 2. **Arquivo `.ics`**: importa em Google, Apple, Outlook — qualquer agenda.
 * 3. **API do Google**: cria os eventos direto na agenda de quem conectou a
 *    conta (veja `sincronizarEventos`).
 */

export interface EventoAgenda {
  id: string;
  titulo: string;
  descricao: string;
  /** `yyyy-mm-dd`. */
  data: string;
  /** `HH:MM`. Sem hora, o evento vira "dia inteiro". */
  hora?: string;
  duracaoMin: number;
}

const DURACAO_PADRAO_MIN = 60;

export function fusoHorario(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Sao_Paulo";
  } catch {
    return "America/Sao_Paulo";
  }
}

/** Constrói o evento a partir do lançamento, usando o vocabulário do segmento. */
export function atendimentoParaEvento(
  a: Atendimento,
  refs: {
    cliente?: Cliente;
    servico?: Servico;
    profissional?: Profissional;
    rotuloAtendimento: string;
  }
): EventoAgenda {
  const servicoNome = refs.servico?.nome ?? a.descricao ?? refs.rotuloAtendimento;
  const clienteNome = refs.cliente?.nome ?? "";
  const liquido = Math.max(0, a.valor - (a.desconto ?? 0));

  const linhas = [
    `${refs.rotuloAtendimento}: ${servicoNome}`,
    clienteNome && `Cliente: ${clienteNome}`,
    refs.profissional && `Responsável: ${refs.profissional.nome}`,
    `Valor: ${formatCurrency(liquido)}`,
    `Vencimento: ${formatDate(a.vencimento)}`,
    a.observacao && `Obs.: ${a.observacao}`,
    "",
    "Criado pela BASE.",
  ].filter(Boolean) as string[];

  return {
    id: a.id,
    titulo: clienteNome ? `${servicoNome} — ${clienteNome}` : servicoNome,
    descricao: linhas.join("\n"),
    data: a.data,
    hora: a.hora,
    duracaoMin: refs.servico?.duracaoMin || DURACAO_PADRAO_MIN,
  };
}

/* -------------------------------------------------------------------------- */
/* Cálculo de início e fim                                                     */
/* -------------------------------------------------------------------------- */

function minutosParaHora(minutos: number) {
  const h = Math.floor(minutos / 60) % 24;
  const m = minutos % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** `{ inicio, fim }` em horário local flutuante, ou `null` para dia inteiro. */
function intervalo(evento: EventoAgenda) {
  if (!evento.hora) return null;
  const [h, m] = evento.hora.split(":").map(Number);
  const inicioMin = h * 60 + m;
  const fimMin = inicioMin + (evento.duracaoMin || DURACAO_PADRAO_MIN);
  // Atravessou a meia-noite: o fim cai no dia seguinte.
  const diasExtras = Math.floor(fimMin / (24 * 60));
  return {
    inicioData: evento.data,
    inicioHora: evento.hora,
    fimData: diasExtras > 0 ? addDays(evento.data, diasExtras) : evento.data,
    fimHora: minutosParaHora(fimMin),
  };
}

const semTracos = (iso: string) => iso.replace(/-/g, "");
const semDoisPontos = (hora: string) => `${hora.replace(":", "")}00`;

/* -------------------------------------------------------------------------- */
/* 1. Link do Google Agenda                                                    */
/* -------------------------------------------------------------------------- */

export function linkGoogleAgenda(evento: EventoAgenda): string {
  const faixa = intervalo(evento);
  const datas = faixa
    ? `${semTracos(faixa.inicioData)}T${semDoisPontos(faixa.inicioHora)}/${semTracos(faixa.fimData)}T${semDoisPontos(faixa.fimHora)}`
    : // Dia inteiro no iCalendar tem fim exclusivo: termina no dia seguinte.
      `${semTracos(evento.data)}/${semTracos(addDays(evento.data, 1))}`;

  const parametros = new URLSearchParams({
    action: "TEMPLATE",
    text: evento.titulo,
    details: evento.descricao,
    dates: datas,
    ctz: fusoHorario(),
  });
  return `https://calendar.google.com/calendar/render?${parametros.toString()}`;
}

/* -------------------------------------------------------------------------- */
/* 2. Arquivo .ics                                                             */
/* -------------------------------------------------------------------------- */

/** Escapa conforme a RFC 5545: barra, ponto e vírgula, vírgula e quebra de linha. */
function escaparICS(texto: string) {
  return texto
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/** A RFC exige linhas de no máximo 75 octetos, continuadas com um espaço. */
function dobrarLinha(linha: string) {
  if (linha.length <= 75) return linha;
  const partes = [linha.slice(0, 75)];
  let resto = linha.slice(75);
  while (resto.length > 74) {
    partes.push(` ${resto.slice(0, 74)}`);
    resto = resto.slice(74);
  }
  if (resto) partes.push(` ${resto}`);
  return partes.join("\r\n");
}

function carimboUTC(agora = new Date()) {
  return `${agora.toISOString().replace(/[-:]/g, "").split(".")[0]}Z`;
}

export function gerarICS(eventos: EventoAgenda[], agora = new Date()): string {
  const linhas: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//BASE//Gestao Financeira//PT-BR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

  for (const evento of eventos) {
    const faixa = intervalo(evento);
    linhas.push("BEGIN:VEVENT");
    linhas.push(`UID:${evento.id}@base.app`);
    linhas.push(`DTSTAMP:${carimboUTC(agora)}`);
    if (faixa) {
      linhas.push(`DTSTART:${semTracos(faixa.inicioData)}T${semDoisPontos(faixa.inicioHora)}`);
      linhas.push(`DTEND:${semTracos(faixa.fimData)}T${semDoisPontos(faixa.fimHora)}`);
    } else {
      linhas.push(`DTSTART;VALUE=DATE:${semTracos(evento.data)}`);
      linhas.push(`DTEND;VALUE=DATE:${semTracos(addDays(evento.data, 1))}`);
    }
    linhas.push(dobrarLinha(`SUMMARY:${escaparICS(evento.titulo)}`));
    linhas.push(dobrarLinha(`DESCRIPTION:${escaparICS(evento.descricao)}`));
    linhas.push("END:VEVENT");
  }

  linhas.push("END:VCALENDAR");
  return `${linhas.join("\r\n")}\r\n`;
}

export function baixarICS(nomeArquivo: string, eventos: EventoAgenda[]) {
  const blob = new Blob([gerarICS(eventos)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nomeArquivo.endsWith(".ics") ? nomeArquivo : `${nomeArquivo}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/* -------------------------------------------------------------------------- */
/* 3. API do Google Agenda                                                     */
/* -------------------------------------------------------------------------- */

export class TokenExpirado extends Error {}

export interface ResultadoSincronizacao {
  criados: number;
  falhas: number;
}

function corpoDoEvento(evento: EventoAgenda) {
  const faixa = intervalo(evento);
  const fuso = fusoHorario();
  return {
    summary: evento.titulo,
    description: evento.descricao,
    start: faixa
      ? { dateTime: `${faixa.inicioData}T${faixa.inicioHora}:00`, timeZone: fuso }
      : { date: evento.data },
    end: faixa
      ? { dateTime: `${faixa.fimData}T${faixa.fimHora}:00`, timeZone: fuso }
      : { date: addDays(evento.data, 1) },
    source: { title: "BASE", url: "https://base.app" },
  };
}

/**
 * Cria os eventos na agenda principal da conta conectada.
 *
 * O token vem do consentimento do Google e vive só em memória — vale cerca de
 * uma hora. Sem um servidor não há como renová-lo em segundo plano, por isso a
 * sincronização é uma ação explícita e um 401 pede a reconexão em vez de falhar
 * em silêncio.
 */
export async function sincronizarEventos(
  eventos: EventoAgenda[],
  token: string
): Promise<ResultadoSincronizacao> {
  let criados = 0;
  let falhas = 0;

  for (const evento of eventos) {
    const resposta = await fetch(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(corpoDoEvento(evento)),
      }
    );

    if (resposta.status === 401 || resposta.status === 403) {
      throw new TokenExpirado(
        "A permissão da agenda expirou. Conecte o Google Agenda novamente."
      );
    }
    if (resposta.ok) criados += 1;
    else falhas += 1;
  }

  return { criados, falhas };
}

/** Ordena por data e hora — a agenda só faz sentido em ordem cronológica. */
export function ordenarEventos(eventos: EventoAgenda[]): EventoAgenda[] {
  return [...eventos].sort((a, b) => {
    const chaveA = `${a.data}T${a.hora ?? "00:00"}`;
    const chaveB = `${b.data}T${b.hora ?? "00:00"}`;
    return chaveA.localeCompare(chaveB);
  });
}

/** Só faz sentido levar para a agenda o que ainda vai acontecer ou acabou de acontecer. */
export function eventosRelevantes(eventos: EventoAgenda[], desde: string): EventoAgenda[] {
  return ordenarEventos(eventos.filter((e) => e.data >= desde));
}
