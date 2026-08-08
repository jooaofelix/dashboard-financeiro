/**
 * Exportação em CSV com separador `;` e BOM — é o formato que o Excel em
 * português abre sem pedir importação manual.
 */

function escapar(valor: unknown): string {
  if (valor === null || valor === undefined) return "";
  const texto = String(valor);
  if (/[";\n]/.test(texto)) return `"${texto.replace(/"/g, '""')}"`;
  return texto;
}

export function montarCSV(cabecalho: string[], linhas: unknown[][]): string {
  const corpo = [cabecalho, ...linhas]
    .map((linha) => linha.map(escapar).join(";"))
    .join("\r\n");
  return `﻿${corpo}`;
}

export function baixarCSV(nomeArquivo: string, cabecalho: string[], linhas: unknown[][]) {
  const conteudo = montarCSV(cabecalho, linhas);
  const blob = new Blob([conteudo], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nomeArquivo.endsWith(".csv") ? nomeArquivo : `${nomeArquivo}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** Números no CSV usam vírgula decimal para o Excel pt-BR reconhecer. */
export function numeroCSV(valor: number, casas = 2): string {
  return valor.toFixed(casas).replace(".", ",");
}
