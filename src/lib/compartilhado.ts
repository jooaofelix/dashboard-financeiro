/**
 * Lê o texto que chega pelo menu "Compartilhar" do celular.
 *
 * O caso que motiva isto: a pessoa está na conversa do WhatsApp, o cliente
 * escreveu "pode ser 320?" ou ela mesma escreveu "recebi 250 da Marina", e em
 * vez de decorar o valor até abrir o app, compartilha a mensagem para a BASE.
 *
 * O texto vem de gente, não de máquina, então a leitura aqui é **heurística e
 * assumidamente parcial**: extrai com confiança o que dá para extrair com
 * confiança — o valor e, quando o WhatsApp inclui o cabeçalho da mensagem, o
 * nome de quem escreveu — e devolve o resto cru, para a tela mostrar e a pessoa
 * corrigir. Adivinhar demais aqui produziria lançamento errado com cara de
 * lançamento certo, que é pior do que não adivinhar nada.
 */

export interface TextoCompartilhado {
  /** Valor em reais, quando encontrado. */
  valor?: number;
  /** Nome de quem enviou a mensagem, quando o compartilhamento traz o cabeçalho. */
  contato?: string;
  /** A mensagem sem cabeçalho de data/autor — serve de descrição. */
  mensagem: string;
  /** O texto original, inteiro, como chegou. */
  original: string;
}

/**
 * Cabeçalho que o WhatsApp coloca ao compartilhar uma mensagem:
 * `[15/08/2026 10:32] Marina Duarte: …` — com variações de colchete, vírgula e
 * ordem de data/hora entre versões e plataformas.
 */
const CABECALHO_WHATSAPP =
  /^\s*[[(]?\s*\d{1,2}[/.]\d{1,2}(?:[/.]\d{2,4})?[\s,]+\d{1,2}:\d{2}(?::\d{2})?\s*(?:[AaPp]\.?[Mm]\.?)?\s*[\])]?\s*[-–—]?\s*([^:\n]{1,60}?)\s*:\s*/;

/** A mesma coisa com a hora antes da data, que é como o iOS exporta. */
const CABECALHO_WHATSAPP_HORA_PRIMEIRO =
  /^\s*[[(]?\s*\d{1,2}:\d{2}(?::\d{2})?\s*(?:[AaPp]\.?[Mm]\.?)?[\s,]+\d{1,2}[/.]\d{1,2}(?:[/.]\d{2,4})?\s*[\])]?\s*[-–—]?\s*([^:\n]{1,60}?)\s*:\s*/;

/**
 * Um valor em reais dentro de uma frase.
 *
 * A ordem das alternativas importa: milhar com ponto vem primeiro, senão
 * "1.200,50" seria lido como "1". A vírgula decide o resto — onde ela existe é
 * o separador decimal e o ponto é de milhar, o contrário do inglês e a fonte de
 * erro mais comum ao ler dinheiro escrito por brasileiro.
 *
 * Decimal com ponto ("320.50") só é aceito depois de "R$", porque sem a moeda
 * na frente um "15.08" é muito mais provavelmente uma data do que quinze reais
 * e oito centavos.
 */
const VALOR_COM_MOEDA =
  /r\$\s*(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+,\d{1,2}|\d+\.\d{1,2}|\d+)/i;
const VALOR = /(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+,\d{1,2}|\d+)/;

/**
 * Números que claramente não são preço: horas (10:30), datas e telefones.
 *
 * A data com ponto só é removida quando tem ano — `\d{1,2}.\d{1,2}` sozinho
 * casaria com o começo de "1.200,50" e transformaria mil e duzentos reais em
 * cinquenta centavos. Foi exatamente o que aconteceu antes deste cuidado.
 */
function limparNaoValores(texto: string): string {
  return texto
    .replace(/\d{1,2}:\d{2}(?::\d{2})?/g, " ")
    .replace(/\d{1,2}\/\d{1,2}(?:\/\d{2,4})?/g, " ")
    .replace(/\d{1,2}\.\d{1,2}\.\d{2,4}/g, " ")
    .replace(/\(?\d{2}\)?\s*9?\d{4}[-\s]?\d{4}/g, " ");
}

export function interpretarValor(texto: string): number | undefined {
  const limpo = limparNaoValores(texto);
  const encontrado = limpo.match(VALOR_COM_MOEDA) ?? limpo.match(VALOR);
  if (!encontrado) return undefined;

  const numero = numeroDoTexto(encontrado[1]);
  return Number.isFinite(numero) && numero > 0 ? numero : undefined;
}

/**
 * Converte o número escrito em português para número de verdade.
 *
 * O caso que exige cuidado é o ponto sem vírgula: em "2.500" ele é milhar e o
 * valor é dois mil e quinhentos; lido como decimal viraria R$ 2,50 — um erro de
 * mil vezes, silencioso, num campo que a pessoa vai só confirmar.
 */
function numeroDoTexto(cru: string): number {
  if (cru.includes(",")) return Number(cru.replace(/\./g, "").replace(",", "."));
  if (/^\d{1,3}(?:\.\d{3})+$/.test(cru)) return Number(cru.replace(/\./g, ""));
  return Number(cru);
}

/** Separa o cabeçalho do WhatsApp do corpo da mensagem, quando houver. */
export function separarCabecalho(texto: string): { contato?: string; mensagem: string } {
  for (const padrao of [CABECALHO_WHATSAPP, CABECALHO_WHATSAPP_HORA_PRIMEIRO]) {
    const encontrado = texto.match(padrao);
    if (encontrado) {
      const contato = encontrado[1].trim();
      return {
        // "Você" é o próprio usuário: não é cliente, e sugerir isso como nome
        // faria a conta nascer com um cliente chamado "Você".
        contato: /^(voc[êe]|you|eu)$/i.test(contato) ? undefined : contato,
        mensagem: texto.slice(encontrado[0].length).trim(),
      };
    }
  }
  return { mensagem: texto.trim() };
}

/**
 * Lê os parâmetros que o menu de compartilhamento entrega. O Android manda o
 * corpo em `text`; alguns aplicativos mandam também `title` e `url`.
 */
export function interpretarCompartilhado(
  params: URLSearchParams
): TextoCompartilhado | null {
  const partes = [params.get("texto"), params.get("titulo"), params.get("link")]
    .filter((p): p is string => Boolean(p && p.trim()));
  if (partes.length === 0) return null;

  const original = partes.join("\n").trim();
  const { contato, mensagem } = separarCabecalho(original);

  return {
    valor: interpretarValor(mensagem) ?? interpretarValor(original),
    contato,
    mensagem,
    original,
  };
}
