import { AlertTriangle, Ban, CheckCircle2, Clock, LucideIcon } from "lucide-react";
import { LABELS_STATUS, StatusPagamento } from "@/lib/types";

/**
 * Status nunca é só cor: ícone + texto carregam o significado, o que mantém a
 * leitura correta em impressão, alto contraste e daltonismo.
 */
const estilos: Record<StatusPagamento, { classe: string; icone: LucideIcon }> = {
  pago: { classe: "bg-good-soft text-good-ink", icone: CheckCircle2 },
  pendente: { classe: "bg-warn-soft text-warn-ink", icone: Clock },
  atrasado: { classe: "bg-crit-soft text-crit-ink", icone: AlertTriangle },
  cancelado: { classe: "bg-neutral-soft text-ink-3", icone: Ban },
};

export default function StatusBadge({
  status,
  compacto = false,
}: {
  status: StatusPagamento;
  compacto?: boolean;
}) {
  const { classe, icone: Icone } = estilos[status];
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${classe}`}
    >
      <Icone size={12} aria-hidden />
      {!compacto && LABELS_STATUS[status]}
    </span>
  );
}
