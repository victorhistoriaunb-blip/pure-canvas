import type { PaymentStatus } from "@/lib/finance.types";
import { STATUS_LABEL } from "@/lib/finance.types";

const STYLES: Record<PaymentStatus, string> = {
  pago: "bg-success/20 text-success border-success/40",
  parcial: "bg-warning/20 text-warning border-warning/40",
  pendente: "bg-destructive/20 text-destructive border-destructive/40",
};

export function StatusBadge({ status }: { status: PaymentStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${STYLES[status]}`}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {STATUS_LABEL[status]}
    </span>
  );
}
