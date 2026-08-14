/**
 * Pix copia e cola (BR Code estático), conforme o padrão EMV® MPM adotado pelo
 * Banco Central.
 *
 * O código é gerado **inteiramente no cliente**, a partir da chave Pix que o
 * dono do negócio cadastra nas configurações: não há integração bancária, não
 * há servidor no caminho e nenhum dado sai do navegador. Em troca, o app não
 * sabe quando o pagamento cai — a baixa continua sendo um gesto de quem
 * recebeu. É a única forma honesta de oferecer Pix sem pedir credenciais de
 * banco a ninguém.
 *
 * O payload é uma sequência de campos `ID + tamanho(2 dígitos) + valor`, alguns
 * deles aninhados, fechada por um CRC16 sobre tudo que veio antes.
 */

export type TipoChavePix = "cpf" | "cnpj" | "email" | "telefone" | "aleatoria";

export interface DadosCobrancaPix {
  chave: string;
  /** Nome do recebedor — o padrão corta em 25 caracteres. */
  nome: string;
  /** Cidade do recebedor — corta em 15. */
  cidade: string;
  /** Opcional: sem valor, o pagador digita quanto quer pagar. */
  valor?: number;
  /**
   * Identificador da cobrança que volta no extrato (`txid`). Só letras e
   * números, até 25 caracteres. Sem ele, o padrão manda usar `***`.
   */
  identificador?: string;
}

/* -------------------------------------------------------------------------- */

/**
 * CRC-16/CCITT-FALSE (polinômio 0x1021, inicial 0xFFFF) — o que o padrão exige.
 * Escrito bit a bit: são 4 linhas e dispensa a tabela de 256 posições.
 */
export function crc16(texto: string): string {
  let crc = 0xffff;
  for (let i = 0; i < texto.length; i++) {
    crc ^= texto.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/** `ID + tamanho + valor`, com o tamanho sempre em dois dígitos. */
function campo(id: string, valor: string): string {
  return id + String(valor.length).padStart(2, "0") + valor;
}

/**
 * O padrão aceita apenas caracteres ASCII imprimíveis em nome e cidade. Acento
 * vira a letra sem acento; o que sobra é descartado — um "ç" cru faria o
 * aplicativo do banco recusar o código inteiro.
 */
export function normalizarTexto(texto: string, limite: number): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\x20-\x7E]/g, "")
    .trim()
    .slice(0, limite)
    .trim();
}

/** Só letras e números sobrevivem no `txid`, e no máximo 25. */
export function normalizarIdentificador(texto: string): string {
  const limpo = texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 25);
  return limpo || "***";
}

/**
 * Formata a chave no padrão que os bancos esperam. Telefone leva `+55`, CPF e
 * CNPJ vão só com dígitos, e-mail em minúsculas — a chave escrita "bonita",
 * com pontos e traços, não é encontrada do outro lado.
 */
export function normalizarChave(chave: string, tipo: TipoChavePix): string {
  const digitos = chave.replace(/\D/g, "");
  switch (tipo) {
    case "cpf":
    case "cnpj":
      return digitos;
    case "telefone":
      return "+55" + (digitos.startsWith("55") ? digitos.slice(2) : digitos);
    case "email":
      return chave.trim().toLowerCase();
    case "aleatoria":
      return chave.trim().toLowerCase();
  }
}

/** Deduz o tipo pela forma da chave — poupa o usuário de escolher num seletor. */
export function detectarTipoChave(chave: string): TipoChavePix | null {
  const texto = chave.trim();
  if (texto === "") return null;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(texto)) {
    return "aleatoria";
  }
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(texto)) return "email";
  const digitos = texto.replace(/\D/g, "");
  if (digitos.length === 11 && /^[\d.\-\s]+$/.test(texto)) return "cpf";
  if (digitos.length === 14 && /^[\d./\-\s]+$/.test(texto)) return "cnpj";
  if (texto.startsWith("+") || digitos.length === 10 || digitos.length === 13) return "telefone";
  return null;
}

/** A chave está preenchida de um jeito que algum banco reconheceria? */
export function chaveValida(chave: string): boolean {
  return detectarTipoChave(chave) !== null;
}

/**
 * Monta o código copia e cola.
 *
 * `01 = 12` marca a cobrança como de uso único: com valor definido, repetir o
 * mesmo código para outro cliente confundiria a conciliação.
 */
export function gerarPixCopiaECola(dados: DadosCobrancaPix): string {
  const tipo = detectarTipoChave(dados.chave);
  if (!tipo) throw new Error("Chave Pix inválida.");

  const chave = normalizarChave(dados.chave, tipo);
  const nome = normalizarTexto(dados.nome, 25) || "RECEBEDOR";
  const cidade = normalizarTexto(dados.cidade, 15) || "BRASIL";
  const txid = normalizarIdentificador(dados.identificador ?? "");

  const contaPix = campo("00", "br.gov.bcb.pix") + campo("01", chave);

  let payload =
    campo("00", "01") +
    campo("01", "12") +
    campo("26", contaPix) +
    campo("52", "0000") +
    campo("53", "986");

  if (dados.valor !== undefined && dados.valor > 0) {
    payload += campo("54", dados.valor.toFixed(2));
  }

  payload +=
    campo("58", "BR") +
    campo("59", nome) +
    campo("60", cidade) +
    campo("62", campo("05", txid));

  // O CRC entra por último e cobre inclusive o próprio "6304".
  const comMarcador = payload + "6304";
  return comMarcador + crc16(comMarcador);
}

/** Confere um código recebido de volta: o CRC fecha? */
export function pixValido(codigo: string): boolean {
  if (codigo.length < 8) return false;
  const corpo = codigo.slice(0, -4);
  const informado = codigo.slice(-4).toUpperCase();
  return corpo.endsWith("6304") && crc16(corpo) === informado;
}
