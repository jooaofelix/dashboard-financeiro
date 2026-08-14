"use client";

import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { AlertCircle, Check, Copy, Mail, MessageCircle, QrCode } from "lucide-react";
import { Button, Modal } from "./ui";
import {
  linkEmail,
  linkWhatsApp,
  mensagemCobranca,
  telefoneWhatsApp,
} from "@/lib/cobranca";
import { chaveValida, gerarPixCopiaECola } from "@/lib/pix";
import { formatCurrency, formatDate } from "@/lib/format";
import { Cliente, Configuracao } from "@/lib/types";

/**
 * Cobrar um recebimento: o Pix copia e cola, o QR e a mensagem pronta.
 *
 * Tudo é gerado no navegador a partir da chave Pix cadastrada — sem integração
 * bancária, sem servidor, sem credencial de banco. A contrapartida honesta é
 * que o app **não sabe quando o dinheiro cai**: a baixa continua sendo um gesto
 * de quem recebeu, e a tela diz isso em vez de fingir conciliação automática.
 */
export default function ModalCobranca({
  aberto,
  onFechar,
  config,
  cliente,
  valor,
  vencimento,
  referencia,
  identificador,
}: {
  aberto: boolean;
  onFechar: () => void;
  config: Configuracao;
  cliente: Cliente | undefined;
  valor: number;
  vencimento: string;
  referencia?: string;
  identificador?: string;
}) {
  const [copiado, setCopiado] = useState<"pix" | "mensagem" | null>(null);
  // Guarda para qual código o QR foi gerado: assim a troca de cobrança
  // descarta a imagem antiga durante a renderização, sem precisar zerar o
  // estado dentro do efeito.
  const [qr, setQr] = useState<{ para: string; svg: string } | null>(null);

  const pix = useMemo(() => {
    if (!config.chavePix || !chaveValida(config.chavePix)) return null;
    try {
      return gerarPixCopiaECola({
        chave: config.chavePix,
        nome: config.empresa,
        cidade: config.cidade ?? "",
        valor,
        identificador,
      });
    } catch {
      return null;
    }
  }, [config.chavePix, config.empresa, config.cidade, valor, identificador]);

  const mensagem = useMemo(
    () =>
      mensagemCobranca({
        cliente: cliente?.nome ?? "",
        empresa: config.empresa || "seu fornecedor",
        valor,
        vencimento,
        referencia,
        pix: pix ?? undefined,
      }),
    [cliente?.nome, config.empresa, valor, vencimento, referencia, pix]
  );

  // O QR é desenhado só quando o painel abre: gerar a imagem de antemão para
  // cada linha de uma lista de cem cobranças seria trabalho jogado fora.
  useEffect(() => {
    if (!aberto || !pix) return;
    let valido = true;
    QRCode.toString(pix, { type: "svg", margin: 1, errorCorrectionLevel: "M" })
      .then((svg) => {
        if (valido) setQr({ para: pix, svg });
      })
      .catch(() => {
        // Sem QR a cobrança segue: o copia e cola é o que resolve no WhatsApp.
      });
    return () => {
      valido = false;
    };
  }, [aberto, pix]);

  const svgQr = qr && qr.para === pix ? qr.svg : null;

  useEffect(() => {
    if (!copiado) return;
    const id = window.setTimeout(() => setCopiado(null), 2500);
    return () => window.clearTimeout(id);
  }, [copiado]);

  async function copiar(texto: string, qual: "pix" | "mensagem") {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(qual);
    } catch {
      // Sem permissão de área de transferência o texto continua selecionável.
    }
  }

  const zap = telefoneWhatsApp(cliente?.telefone);

  return (
    <Modal aberto={aberto} onFechar={onFechar} titulo="Cobrar" largura="max-w-md">
      <div className="flex flex-col gap-4">
        <div className="rounded-lg bg-raised px-3 py-2.5 text-sm">
          <p className="font-medium text-ink">{cliente?.nome ?? "Cliente"}</p>
          <p className="mt-0.5 text-xs text-ink-3">
            {formatCurrency(valor)} · vence {formatDate(vencimento)}
            {referencia ? ` · ${referencia}` : ""}
          </p>
        </div>

        {pix ? (
          <section className="flex flex-col gap-2.5">
            <h3 className="flex items-center gap-1.5 text-xs font-semibold text-ink">
              <QrCode size={14} aria-hidden />
              Pix copia e cola
            </h3>

            {svgQr && (
              <div
                className="mx-auto w-40 rounded-lg bg-white p-2 [&>svg]:h-full [&>svg]:w-full"
                // O SVG vem do gerador local, com o conteúdo que nós mesmos
                // montamos — não há entrada externa neste caminho.
                dangerouslySetInnerHTML={{ __html: svgQr }}
                role="img"
                aria-label="QR code do Pix"
              />
            )}

            <p className="break-all rounded-lg border border-line bg-surface px-3 py-2 font-mono text-[11px] leading-relaxed text-ink-2">
              {pix}
            </p>

            <Button
              variante="primary"
              icon={copiado === "pix" ? Check : Copy}
              onClick={() => copiar(pix, "pix")}
            >
              {copiado === "pix" ? "Código copiado" : "Copiar código Pix"}
            </Button>

            <p className="text-[11px] leading-relaxed text-ink-3">
              O código é gerado aqui no navegador, a partir da sua chave. A BASE
              não conversa com o banco: quando o Pix cair, dê a baixa você mesmo.
            </p>
          </section>
        ) : (
          <p className="flex items-start gap-2 rounded-lg bg-warn-soft px-3 py-2.5 text-xs leading-relaxed text-warn-ink">
            <AlertCircle size={14} className="mt-px shrink-0" aria-hidden />
            <span>
              Sem chave Pix cadastrada, a mensagem sai sem código de pagamento.
              Configure em <strong>Configurações › Recebimento por Pix</strong>.
            </span>
          </p>
        )}

        <section className="flex flex-col gap-2.5">
          <h3 className="text-xs font-semibold text-ink">Mensagem</h3>
          <p className="whitespace-pre-wrap rounded-lg border border-line bg-surface px-3 py-2.5 text-[13px] leading-relaxed text-ink-2">
            {mensagem}
          </p>

          <div className="flex flex-wrap gap-2">
            {zap && (
              <Button
                variante="primary"
                icon={MessageCircle}
                onClick={() => window.open(linkWhatsApp(zap, mensagem), "_blank", "noopener")}
              >
                Enviar no WhatsApp
              </Button>
            )}
            {cliente?.email && (
              <Button
                icon={Mail}
                onClick={() =>
                  window.open(
                    linkEmail(cliente.email!, `Cobrança — ${config.empresa}`, mensagem),
                    "_blank",
                    "noopener"
                  )
                }
              >
                E-mail
              </Button>
            )}
            <Button
              icon={copiado === "mensagem" ? Check : Copy}
              onClick={() => copiar(mensagem, "mensagem")}
            >
              {copiado === "mensagem" ? "Copiada" : "Copiar mensagem"}
            </Button>
          </div>

          {!zap && !cliente?.email && (
            <p className="text-[11px] leading-relaxed text-ink-3">
              Este cliente não tem telefone nem e-mail cadastrados — copie a
              mensagem e envie por onde preferir.
            </p>
          )}
        </section>
      </div>
    </Modal>
  );
}
