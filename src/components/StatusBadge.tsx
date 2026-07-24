import { StatusPagamento } from "@/lib/types";

const styles: Record<StatusPagamento, string> = {
  pago: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  pendente: "bg-amber-50 text-amber-700 ring-amber-600/20",
  atrasado: "bg-rose-50 text-rose-700 ring-rose-600/20",
};

const labels: Record<StatusPagamento, string> = {
  pago: "Pago",
  pendente: "Pendente",
  atrasado: "Atrasado",
};

export default function StatusBadge({ status }: { status: StatusPagamento }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}
