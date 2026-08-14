/**
 * Lembrete de cobrança pronto para enviar.
 *
 * Não existe disparo automático aqui, e isso é deliberado: mandar mensagem em
 * nome de alguém exige servidor, número verificado e o risco de cobrar o
 * cliente errado sem ninguém ver. O que o app faz é **escrever a mensagem
 * certa** — com valor, vencimento e o Pix copia e cola — e abrir o WhatsApp já
 * preenchido. Quem aperta enviar é a pessoa.
 */
import { formatCurrency, formatDate, todayISO } from "./format";

export type TomCobranca = "aviso" | "vencendo" | "vencido";

export interface DadosCobranca {
  cliente: string;
  empresa: string;
  valor: number;
  vencimento: string;
  /** O que está sendo cobrado ("Consulta inicial"), quando houver. */
  referencia?: string;
  /** Código Pix copia e cola, se a chave estiver configurada. */
  pix?: string;
}

/**
 * O tom sai da data, não de uma escolha: quem está cobrando trinta clientes não
 * vai parar para classificar cada um, e errar o tom — cobrar como atrasado quem
 * ainda tem prazo — custa relação.
 */
export function tomPorVencimento(vencimento: string, hoje = todayISO()): TomCobranca {
  if (vencimento < hoje) return "vencido";
  if (vencimento === hoje) return "vencendo";
  return "aviso";
}

const ABERTURA: Record<TomCobranca, (d: DadosCobranca) => string> = {
  aviso: (d) => `Oi, ${primeiroNome(d.cliente)}! Passando para lembrar do pagamento`,
  vencendo: (d) => `Oi, ${primeiroNome(d.cliente)}! Só lembrando que vence hoje`,
  vencido: (d) => `Oi, ${primeiroNome(d.cliente)}! Identifiquei um pagamento em aberto`,
};

function primeiroNome(nome: string): string {
  return nome.trim().split(/\s+/)[0] || nome;
}

/**
 * Monta o texto. Curto de propósito: mensagem de cobrança comprida é lida pela
 * metade, e o que importa — quanto, quando e como pagar — precisa caber na
 * prévia da notificação.
 */
export function mensagemCobranca(dados: DadosCobranca, hoje = todayISO()): string {
  const tom = tomPorVencimento(dados.vencimento, hoje);
  const linhas = [
    `${ABERTURA[tom](dados)}${dados.referencia ? ` de ${dados.referencia}` : ""}.`,
    "",
    `Valor: ${formatCurrency(dados.valor)}`,
    tom === "vencido"
      ? `Venceu em: ${formatDate(dados.vencimento)}`
      : `Vencimento: ${formatDate(dados.vencimento)}`,
  ];

  if (dados.pix) {
    linhas.push("", "Se preferir, o Pix copia e cola:", dados.pix);
  }

  linhas.push("", `Qualquer dúvida é só chamar. Obrigado! — ${dados.empresa}`);
  return linhas.join("\n");
}

/**
 * Telefone no formato que o WhatsApp aceita: só dígitos, com o país na frente.
 * Devolve `null` quando não dá para discar — melhor esconder o botão do que
 * abrir uma conversa com um número inventado.
 */
export function telefoneWhatsApp(telefone: string | undefined): string | null {
  if (!telefone) return null;
  const digitos = telefone.replace(/\D/g, "");
  if (digitos.length < 10) return null;
  if (digitos.startsWith("55")) return digitos.length >= 12 ? digitos : null;
  if (digitos.length === 10 || digitos.length === 11) return "55" + digitos;
  return null;
}

/** Link universal do WhatsApp — funciona no aplicativo e no navegador. */
export function linkWhatsApp(telefone: string, mensagem: string): string {
  return `https://wa.me/${telefone}?text=${encodeURIComponent(mensagem)}`;
}

/** Link `mailto:` para quem só tem o e-mail do cliente. */
export function linkEmail(email: string, assunto: string, mensagem: string): string {
  return `mailto:${email}?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(mensagem)}`;
}
