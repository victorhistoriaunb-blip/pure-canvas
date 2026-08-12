import { useState } from "react";
import { motion } from "motion/react";
import { ChevronDown, Copy, CopyCheck, Pencil, RotateCcw, Trash2 } from "lucide-react";
import { useFinance } from "@/lib/finance-store";
import {
  EXPENSE_KINDS,
  EXPENSE_KIND_LABEL,
  STATUS_LABEL,
  remainingOf,
  type ExpenseKind,
  type PaymentStatus,
  type Transaction,
} from "@/lib/finance.types";
import { brl2 } from "@/lib/analytics";
import { StatusBadge } from "./status-badge";
import { InlineDate, InlineMoney, InlineSelect, InlineText } from "./inline-fields";
import { paidFromStatus } from "./transactions-table";

export const KIND_OPTIONS = EXPENSE_KINDS.map((k) => ({ value: k, label: EXPENSE_KIND_LABEL[k] }));
export const STATUS_OPTIONS = (Object.keys(STATUS_LABEL) as PaymentStatus[]).map((s) => ({
  value: s,
  label: STATUS_LABEL[s],
}));

export const fmtDate = (v: string) =>
  v ? new Date(`${v}T00:00:00Z`).toLocaleDateString("pt-BR", { timeZone: "UTC" }) : "—";

export function textOf(t: Transaction) {
  return [
    `Conta: ${t.description}`,
    `Data: ${fmtDate(t.date)}`,
    `Despesa: ${EXPENSE_KIND_LABEL[t.expenseKind]}`,
    `Vencimento: ${fmtDate(t.dueDate)}`,
    `Situação: ${STATUS_LABEL[t.status]}`,
    `Valor: ${brl2(t.amount)}`,
    `Pago: ${brl2(t.paidAmount)} · Restante: ${brl2(remainingOf(t))}`,
    t.notes ? `Observações: ${t.notes}` : "",
    t.details ? `Detalhamento: ${t.details}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

const labelCls = "text-[10px] font-semibold tracking-wide text-muted-foreground uppercase";

/** Card de registro com edição inline, detalhamento e cópia das informações. */
export function RecordCard({
  t,
  selected,
  onSelect,
  onEdit,
  editable = true,
}: {
  t: Transaction;
  selected?: boolean;
  onSelect?: (v: boolean) => void;
  onEdit?: () => void;
  editable?: boolean;
}) {
  const { updateRecord, deleteRecord } = useFinance();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const up = (data: Partial<Transaction>) => void updateRecord(t.id, data);

  async function copy() {
    try {
      await navigator.clipboard.writeText(textOf(t));
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard indisponível */
    }
  }

  const field = (label: string, node: React.ReactNode, cls = "text-sm text-foreground") => (
    <div className="min-w-0">
      <p className={labelCls}>{label}</p>
      <div className={cls}>{node}</div>
    </div>
  );

  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className={`panel panel-hover flex flex-col gap-3 p-4 ${selected ? "ring-2 ring-primary/50" : ""}`}
    >
      <div className="flex items-start gap-3">
        {onSelect && (
          <input
            type="checkbox"
            checked={!!selected}
            onChange={(e) => onSelect(e.target.checked)}
            aria-label={`Selecionar ${t.description}`}
            className="mt-1 size-5 shrink-0 accent-[var(--color-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        )}
        <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-2">
          {field(
            "Data",
            editable ? (
              <InlineDate label="data" value={t.date} onSave={(v) => up({ date: v })} />
            ) : (
              fmtDate(t.date)
            ),
          )}
          {field(
            "Conta",
            editable ? (
              <InlineText
                label="conta"
                value={t.description}
                onSave={(v) => up({ description: v })}
                placeholder="Nome da conta"
              />
            ) : (
              t.description
            ),
            "truncate text-sm font-semibold text-foreground",
          )}
          {field(
            "Despesa",
            editable ? (
              <InlineSelect
                label="despesa"
                value={t.expenseKind}
                options={KIND_OPTIONS}
                onSave={(v) => up({ expenseKind: v as ExpenseKind })}
              />
            ) : (
              EXPENSE_KIND_LABEL[t.expenseKind]
            ),
          )}
          {field(
            "Vencimento",
            editable ? (
              <InlineDate label="vencimento" value={t.dueDate} onSave={(v) => up({ dueDate: v })} />
            ) : (
              fmtDate(t.dueDate)
            ),
          )}
          {field(
            "Situação",
            editable ? (
              <InlineSelect
                label="situação"
                value={t.status}
                options={STATUS_OPTIONS}
                onSave={(v) => up(paidFromStatus(v as PaymentStatus, t))}
              >
                <StatusBadge status={t.status} />
              </InlineSelect>
            ) : (
              <StatusBadge status={t.status} />
            ),
            "text-sm",
          )}
          {field(
            "Valor",
            editable ? (
              <InlineMoney label="valor" value={t.amount} onSave={(v) => up({ amount: v })} />
            ) : (
              brl2(t.amount)
            ),
            `text-sm font-semibold ${t.type === "receita" ? "text-success" : "text-foreground"}`,
          )}
        </div>

        {editable && (
          <div className="flex shrink-0 gap-1.5">
            {onEdit && (
              <button
                type="button"
                onClick={onEdit}
                aria-label={`Editar ${t.description}`}
                className="grid size-8 place-items-center rounded-lg border border-border text-muted-foreground transition-colors hover:border-primary/60 hover:text-foreground"
              >
                <Pencil className="size-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={() => void deleteRecord(t.id)}
              aria-label={`Excluir ${t.description}`}
              className="grid size-8 place-items-center rounded-lg border border-border text-muted-foreground transition-colors hover:border-destructive/60 hover:text-destructive"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 border-t border-border/60 pt-2">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronDown className={`size-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
          Detalhamento
        </button>
        <button
          type="button"
          onClick={() => void copy()}
          className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:border-primary/60 hover:text-foreground"
        >
          {copied ? <CopyCheck className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
          {copied ? "Copiado" : "Copiar informações"}
        </button>
      </div>

      {open && (
        <div className="grid gap-2 rounded-xl bg-surface/50 p-3 text-[11px] text-muted-foreground">
          <p>
            Pago: <strong className="text-foreground">{brl2(t.paidAmount)}</strong> · Restante:{" "}
            <strong className="text-foreground">{brl2(remainingOf(t))}</strong> · Pagamento em{" "}
            {fmtDate(t.paymentDate)}
          </p>
          {t.category && <p>Categoria: {t.category}</p>}
          {t.notes && <p>Observações: {t.notes}</p>}
          {t.details && <p>Informações adicionais: {t.details}</p>}
          {t.history && <p>Histórico: {t.history}</p>}
          {t.comments && <p>Comentários: {t.comments}</p>}
          {t.links && <p className="truncate">Links: {t.links}</p>}
          {(t.account || t.method) && (
            <p>
              {t.account && `Conta bancária: ${t.account}`} {t.method && `· Forma: ${t.method}`}
            </p>
          )}
          {t.extra &&
            Object.entries(t.extra).map(([k, v]) => (
              <p key={k} className="truncate">
                {k}: {v}
              </p>
            ))}
          {t.source === "planilha" && (
            <p>
              Origem: {t.fileName} · aba {t.sheet}
            </p>
          )}
        </div>
      )}
    </motion.article>
  );
}

/** Área da lixeira: cards translúcidos com opção de desfazer a exclusão. */
export function DeletedRecords() {
  const { deletedRecords, restoreRecord, restoreMany, purgeRecord, purgeAllDeleted } = useFinance();
  if (deletedRecords.length === 0) return null;

  return (
    <section className="mt-2 rounded-2xl border border-dashed border-border/70 p-4">
      <header className="mb-3 flex flex-wrap items-center gap-3">
        <div>
          <h2 className="text-sm font-semibold tracking-tight text-foreground">
            Excluídas recentemente
          </h2>
          <p className="text-xs text-muted-foreground">
            {deletedRecords.length} registro(s) na lixeira — restaure se apagou por engano.
          </p>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void restoreMany(deletedRecords.map((r) => r.id))}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-semibold text-foreground transition-colors hover:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <RotateCcw className="size-3.5" /> Restaurar todos
          </button>
          <button
            type="button"
            onClick={() => void purgeAllDeleted()}
            className="h-9 rounded-lg border border-border px-3 text-xs text-muted-foreground transition-colors hover:border-destructive/60 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Esvaziar lixeira
          </button>
        </div>
      </header>

      <div className="grid gap-3 xl:grid-cols-2">
        {deletedRecords.map((t) => (
          <article
            key={t.id}
            className="panel flex flex-wrap items-center gap-3 p-4 opacity-50 transition-opacity duration-200 hover:opacity-90"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground line-through">
                {t.description || "Sem descrição"}
              </p>
              <p className="text-xs text-muted-foreground">
                {fmtDate(t.date)} · {brl2(t.amount)} · {STATUS_LABEL[t.status]}
                {t.deletedAt
                  ? ` · excluída em ${new Date(t.deletedAt).toLocaleString("pt-BR")}`
                  : ""}
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={() => void restoreRecord(t.id)}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-semibold text-foreground transition-colors hover:border-primary/60"
              >
                <RotateCcw className="size-3.5" /> Restaurar
              </button>
              <button
                type="button"
                onClick={() => void purgeRecord(t.id)}
                aria-label={`Excluir definitivamente ${t.description}`}
                className="grid size-9 place-items-center rounded-lg border border-border text-muted-foreground transition-colors hover:border-destructive/60 hover:text-destructive"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
