import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import type { PaymentStatus, Transaction } from "@/lib/finance.types";
import { EXPENSE_KINDS, EXPENSE_KIND_LABEL, STATUS_LABEL } from "@/lib/finance.types";
import { useFinance } from "@/lib/finance-store";
import { RecordDialog } from "./record-form";
import { StatusBadge } from "./status-badge";
import { InlineDate, InlineMoney, InlineSelect, InlineText } from "./inline-fields";

/** Converte a situação escolhida em valores de pagamento coerentes. */
export function paidFromStatus(status: PaymentStatus, t: Transaction) {
  if (status === "pago") return { paidAmount: t.amount, paymentDate: t.paymentDate };
  if (status === "pendente") return { paidAmount: 0, paymentDate: "" };
  const half = t.paidAmount > 0 && t.paidAmount < t.amount ? t.paidAmount : t.amount / 2;
  return { paidAmount: Number(half.toFixed(2)), paymentDate: t.paymentDate };
}

const STATUS_OPTIONS = (Object.keys(STATUS_LABEL) as PaymentStatus[]).map((s) => ({
  value: s,
  label: STATUS_LABEL[s],
}));

const KIND_OPTIONS = EXPENSE_KINDS.map((k) => ({ value: k, label: EXPENSE_KIND_LABEL[k] }));

export function TransactionsTable({
  rows,
  limit,
  editable = true,
}: {
  rows: Transaction[];
  limit?: number;
  editable?: boolean;
}) {
  const { deleteRecord, updateRecord } = useFinance();
  const [editing, setEditing] = useState<Transaction | null>(null);
  const list = limit ? rows.slice(0, limit) : rows;

  if (list.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Nenhum registro neste período.</p>;
  }

  return (
    <div className="-mx-2 max-h-[520px] min-w-0 overflow-auto">
      {editing && <RecordDialog record={editing} onClose={() => setEditing(null)} />}
      <table className="w-full min-w-[820px] text-left text-sm">
        <thead className="sticky top-0 z-10 bg-card">
          <tr className="text-xs tracking-wide text-muted-foreground uppercase">
            <th className="px-2 py-2 font-semibold">Data</th>
            <th className="px-2 py-2 font-semibold">Conta</th>
            <th className="px-2 py-2 font-semibold">Despesa</th>
            <th className="px-2 py-2 font-semibold">Vencimento</th>
            <th className="px-2 py-2 font-semibold">Situação</th>
            <th className="px-2 py-2 text-right font-semibold">Valor</th>
            {editable && <th className="px-2 py-2 text-right font-semibold">Ações</th>}
          </tr>
        </thead>
        <tbody>
          {list.map((t) => (
            <tr key={t.id} className="border-t border-border/60 transition-colors duration-200 hover:bg-surface/60">
              <td className="px-2 py-1.5 whitespace-nowrap text-muted-foreground">
                {editable ? (
                  <InlineDate label="data" value={t.date} onSave={(v) => void updateRecord(t.id, { date: v })} />
                ) : t.date ? (
                  new Date(`${t.date}T00:00:00Z`).toLocaleDateString("pt-BR", { timeZone: "UTC" })
                ) : (
                  "—"
                )}
              </td>
              <td className="max-w-[240px] px-2 py-1.5 text-foreground">
                {editable ? (
                  <InlineText
                    label="conta"
                    value={t.description}
                    onSave={(v) => void updateRecord(t.id, { description: v })}
                  />
                ) : (
                  <span className="truncate">{t.description}</span>
                )}
              </td>
              <td className="px-2 py-1.5 text-muted-foreground">
                {editable ? (
                  <InlineSelect
                    label="despesa"
                    value={t.expenseKind}
                    options={KIND_OPTIONS}
                    onSave={(v) => void updateRecord(t.id, { expenseKind: v as Transaction["expenseKind"] })}
                  />
                ) : (
                  EXPENSE_KIND_LABEL[t.expenseKind]
                )}
              </td>
              <td className="px-2 py-1.5 whitespace-nowrap text-muted-foreground">
                {editable ? (
                  <InlineDate
                    label="vencimento"
                    value={t.dueDate}
                    onSave={(v) => void updateRecord(t.id, { dueDate: v })}
                  />
                ) : t.dueDate ? (
                  new Date(`${t.dueDate}T00:00:00Z`).toLocaleDateString("pt-BR", { timeZone: "UTC" })
                ) : (
                  "—"
                )}
              </td>
              <td className="px-2 py-1.5">
                {editable ? (
                  <InlineSelect
                    label="situação"
                    value={t.status}
                    options={STATUS_OPTIONS}
                    onSave={(v) => void updateRecord(t.id, paidFromStatus(v as PaymentStatus, t))}
                  >
                    <StatusBadge status={t.status} />
                  </InlineSelect>
                ) : (
                  <StatusBadge status={t.status} />
                )}
              </td>
              <td
                className={`px-2 py-1.5 text-right font-semibold ${
                  t.type === "receita" ? "text-success" : "text-destructive"
                }`}
              >
                {editable ? (
                  <InlineMoney
                    label="valor"
                    value={t.amount}
                    className="text-right"
                    onSave={(v) => void updateRecord(t.id, { amount: v })}
                  />
                ) : (
                  <>
                    {t.type === "receita" ? "+" : "−"}
                    {t.amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </>
                )}
              </td>
              {editable && (
                <td className="px-2 py-1.5">
                  <div className="flex justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => setEditing(t)}
                      aria-label={`Editar ${t.description}`}
                      className="grid size-8 place-items-center rounded-lg border border-border text-muted-foreground transition-colors hover:border-primary/60 hover:text-foreground"
                    >
                      <Pencil className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => void deleteRecord(t.id)}
                      aria-label={`Excluir ${t.description}`}
                      className="grid size-8 place-items-center rounded-lg border border-border text-muted-foreground transition-colors hover:border-destructive/60 hover:text-destructive"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
