import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { motion, AnimatePresence } from "motion/react";
import { Copy, Trash2, X } from "lucide-react";
import { useFinance } from "@/lib/finance-store";
import {
  STATUS_LABEL,
  remainingOf,
  type ExpenseKind,
  type PaymentStatus,
  type Transaction,
} from "@/lib/finance.types";
import { availableMonths, brl, fullMonthLabel, monthKey, shiftMonth, totals } from "@/lib/analytics";
import { Page, Select, NewRecordButton } from "@/components/dashboard/page";
import { ExportMenu } from "@/components/dashboard/export-menu";

import { RecordDialog } from "@/components/dashboard/record-form";
import { RecordCard, DeletedRecords, KIND_OPTIONS, STATUS_OPTIONS } from "@/components/dashboard/record-card";
import {
  InlineDate,
  InlineMoney,
  InlineSelect,
  InlineText,
} from "@/components/dashboard/inline-fields";

export const Route = createFileRoute("/_gated/contas")({
  head: () => ({
    meta: [
      { title: "Contas · PINA Finanças" },
      {
        name: "description",
        content:
          "Acompanhe suas contas em cards com edição rápida, situação de pagamento, vencimento e replicação entre meses.",
      },
      { property: "og:title", content: "Contas · PINA Finanças" },
      {
        property: "og:description",
        content: "Cards de contas com edição rápida e replicação entre meses.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ContasPage,
});

type Draft = {
  sourceId: string;
  description: string;
  amount: number;
  expenseKind: ExpenseKind;
  dueDate: string;
  date: string;
};

function ReplicateDialog({
  rows,
  months,
  onClose,
}: {
  rows: Transaction[];
  months: string[];
  onClose: (done: boolean) => void;
}) {
  const { addRecords } = useFinance();
  const base = rows[0]?.date?.slice(0, 7) ?? new Date().toISOString().slice(0, 7);
  const options = useMemo(() => {
    const set = new Set<string>(months);
    for (let i = -2; i <= 12; i++) set.add(shiftMonth(base, i));
    return [...set].sort();
  }, [months, base]);

  const [target, setTarget] = useState(shiftMonth(base, 1));
  const [step, setStep] = useState<"mes" | "revisao">("mes");
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [saving, setSaving] = useState(false);

  function toReview() {
    const moved = (iso: string) => {
      if (!iso) return "";
      const day = iso.slice(8, 10);
      const last = new Date(Date.UTC(Number(target.slice(0, 4)), Number(target.slice(5, 7)), 0)).getUTCDate();
      return `${target}-${String(Math.min(Number(day), last)).padStart(2, "0")}`;
    };
    setDrafts(
      rows.map((t) => ({
        sourceId: t.id,
        description: t.description,
        amount: t.amount,
        expenseKind: t.expenseKind,
        dueDate: moved(t.dueDate),
        date: moved(t.date) || `${target}-01`,
      })),
    );
    setStep("revisao");
  }

  async function confirm() {
    setSaving(true);
    const byId = new Map(rows.map((r) => [r.id, r]));
    await addRecords(
      drafts.map((d) => {
        const src = byId.get(d.sourceId)!;
        return {
          date: d.date,
          dueDate: d.dueDate,
          type: src.type,
          category: src.category,
          expenseKind: d.expenseKind,
          description: d.description,
          account: src.account,
          method: src.method,
          amount: d.amount,
          notes: src.notes,
          details: src.details,
          history: src.history,
          links: src.links,
          comments: src.comments,
          paidAmount: 0,
          paymentDate: "",
        };
      }),
    );
    setSaving(false);
    onClose(true);
  }

  const set = (i: number, data: Partial<Draft>) =>
    setDrafts((list) => list.map((d, idx) => (idx === i ? { ...d, ...data } : d)));

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-background/80 p-4 backdrop-blur-sm sm:items-center">
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        className="panel my-auto w-full max-w-3xl p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Replicar contas</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {step === "mes"
                ? `Deseja copiar ${rows.length} conta(s) para qual mês?`
                : "Revise e ajuste antes de confirmar. Status e data de pagamento não são copiados."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onClose(false)}
            aria-label="Fechar"
            className="grid size-8 place-items-center rounded-lg border border-border text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        {step === "mes" ? (
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Select
              label="Mês de destino"
              value={target}
              onChange={setTarget}
              options={options.map((m) => ({ value: m, label: fullMonthLabel(m) }))}
            />
            <button
              type="button"
              onClick={toReview}
              className="ml-auto inline-flex h-10 items-center rounded-xl bg-[image:var(--gradient-primary)] px-5 text-sm font-semibold text-primary-foreground transition-all hover:brightness-110"
            >
              Revisar
            </button>
          </div>
        ) : (
          <>
            <div className="mt-5 max-h-[45vh] overflow-auto">
              <table className="w-full min-w-[620px] text-left text-sm">
                <thead>
                  <tr className="text-[11px] tracking-wide text-muted-foreground uppercase">
                    <th className="px-2 py-2">Data</th>
                    <th className="px-2 py-2">Conta</th>
                    <th className="px-2 py-2">Despesa</th>
                    <th className="px-2 py-2">Vencimento</th>
                    <th className="px-2 py-2 text-right">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {drafts.map((d, i) => (
                    <tr key={d.sourceId} className="border-t border-border/60">
                      <td className="px-2 py-1.5">
                        <InlineDate label="data" value={d.date} onSave={(v) => set(i, { date: v })} />
                      </td>
                      <td className="px-2 py-1.5">
                        <InlineText
                          label="conta"
                          value={d.description}
                          onSave={(v) => set(i, { description: v })}
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <InlineSelect
                          label="despesa"
                          value={d.expenseKind}
                          options={KIND_OPTIONS}
                          onSave={(v) => set(i, { expenseKind: v as ExpenseKind })}
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <InlineDate
                          label="vencimento"
                          value={d.dueDate}
                          onSave={(v) => set(i, { dueDate: v })}
                        />
                      </td>
                      <td className="px-2 py-1.5 text-right">
                        <InlineMoney
                          label="valor"
                          value={d.amount}
                          className="text-right"
                          onSave={(v) => set(i, { amount: v })}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setStep("mes")}
                className="h-10 rounded-xl border border-border px-4 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Voltar
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void confirm()}
                className="h-10 rounded-xl bg-[image:var(--gradient-primary)] px-5 text-sm font-semibold text-primary-foreground transition-all hover:brightness-110 disabled:opacity-70"
              >
                Confirmar replicação
              </button>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}

function ContasPage() {
  const { transactions, settings, deleteMany } = useFinance();
  const months = useMemo(() => availableMonths(transactions), [transactions]);
  const [month, setMonth] = useState<string>("");
  const current = month && months.includes(month) ? month : (months[0] ?? "");
  const [statusFilter, setStatusFilter] = useState<string>("todas");
  const [selected, setSelected] = useState<string[]>([]);
  const [replicating, setReplicating] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const rows = useMemo(
    () =>
      transactions
        .filter((t) => (current ? monthKey(t.date) === current : true))
        .filter((t) => (statusFilter === "todas" ? true : t.status === statusFilter)),
    [transactions, current, statusFilter],
  );

  const chosen = rows.filter((r) => selected.includes(r.id));

  const buildReport = () => {
    const t = totals(rows);
    return {
      title: settings.labels.contas || "Contas",
      subtitle: current ? `Cards do mês · ${fullMonthLabel(current)}` : "Todas as contas",
      filters: [
        { label: "Mês", value: current ? fullMonthLabel(current) : "Todos" },
        {
          label: "Situação",
          value: statusFilter === "todas" ? "Todas" : (STATUS_LABEL[statusFilter as PaymentStatus] ?? statusFilter),
        },
      ],
      kpis: [
        { label: "Contas listadas", value: String(rows.length) },
        { label: "Receitas", value: brl(t.receitas) },
        { label: "Despesas", value: brl(t.despesas) },
        {
          label: "Em aberto",
          value: brl(rows.filter((r) => r.status !== "pago").reduce((s, r) => s + remainingOf(r), 0)),
        },
      ],
      charts: [],
      tables: [
        {
          title: "Contas do período",
          columns: ["Data", "Conta", "Vencimento", "Situação", "Valor", "Pago", "Restante"],
          rows: rows.map((r) => [
            r.date,
            r.description || r.category,
            r.dueDate,
            STATUS_LABEL[r.status],
            brl(r.amount),
            brl(r.paidAmount),
            brl(remainingOf(r)),
          ]),
        },
      ],
    };
  };

  return (
    <Page
      title={settings.labels.contas}
      subtitle={current ? `Cards do mês · ${fullMonthLabel(current)}` : "Cards de contas"}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          {months.length > 0 && (
            <Select
              value={current}
              onChange={setMonth}
              options={months.map((m) => ({ value: m, label: fullMonthLabel(m) }))}
            />
          )}
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: "todas", label: "Todas" },
              ...STATUS_OPTIONS,
            ]}
          />
          <ExportMenu build={buildReport} />
          <NewRecordButton label="Nova conta" />
        </div>
      }
    >

      {editing && <RecordDialog record={editing} onClose={() => setEditing(null)} />}
      {replicating && chosen.length > 0 && (
        <ReplicateDialog
          rows={chosen}
          months={months}
          onClose={(done) => {
            setReplicating(false);
            if (done) setSelected([]);
          }}
        />
      )}

      {confirmingDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="panel w-full max-w-sm p-6"
          >
            <h2 className="text-base font-semibold tracking-tight">Excluir contas selecionadas?</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {selected.length} conta(s) irão para a lixeira e poderão ser restauradas depois, na
              área translúcida no fim desta página.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setConfirmingDelete(false)}
                className="h-10 rounded-xl border border-border px-4 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={async () => {
                  setDeleting(true);
                  await deleteMany(selected);
                  setDeleting(false);
                  setConfirmingDelete(false);
                  setSelected([]);
                }}
                className="h-10 rounded-xl bg-destructive px-5 text-sm font-semibold text-destructive-foreground transition-all hover:brightness-110 disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {deleting ? "Excluindo…" : "Excluir selecionadas"}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      <div className="flex flex-col gap-4 pb-20">
        <div className="panel flex flex-wrap items-center gap-3 px-4 py-3 text-xs text-muted-foreground">
          <label className="inline-flex min-h-10 items-center gap-2">
            <input
              type="checkbox"
              checked={rows.length > 0 && selected.length === rows.length}
              onChange={(e) => setSelected(e.target.checked ? rows.map((r) => r.id) : [])}
              className="size-4 accent-[var(--color-primary)]"
            />
            Selecionar todas (respeita os filtros ativos)
          </label>
          {selected.length > 0 && (
            <button
              type="button"
              onClick={() => setSelected([])}
              className="text-xs font-medium text-muted-foreground underline-offset-2 transition-colors hover:text-foreground hover:underline"
            >
              Limpar seleção
            </button>
          )}
          <span>{selected.length} selecionada(s) de {rows.length}</span>
          <button
            type="button"
            disabled={selected.length === 0}
            onClick={() => setReplicating(true)}
            className="ml-auto inline-flex h-9 items-center gap-2 rounded-xl border border-border px-4 text-xs font-semibold text-foreground transition-colors hover:border-primary/60 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Copy className="size-3.5" /> Replicar
          </button>
        </div>

        {rows.length === 0 ? (
          <p className="panel py-10 text-center text-sm text-muted-foreground">
            Nenhuma conta neste período. Ajuste o filtro de mês ou situação, ou cadastre uma nova conta.
          </p>
        ) : (
          <div className="grid gap-3 xl:grid-cols-2">
            {rows.map((t) => (
              <RecordCard
                key={t.id}
                t={t}
                selected={selected.includes(t.id)}
                onSelect={(v) =>
                  setSelected((list) => (v ? [...list, t.id] : list.filter((id) => id !== t.id)))
                }
                onEdit={() => setEditing(t)}
              />
            ))}
          </div>
        )}

        <DeletedRecords />
      </div>

      <AnimatePresence>
        {selected.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 px-4 py-3 backdrop-blur-sm lg:left-64"
          >
            <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3">
              <span className="text-sm font-medium text-foreground">
                {selected.length} conta(s) selecionada(s)
              </span>
              <div className="ml-auto flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setReplicating(true)}
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-border px-4 text-sm font-semibold text-foreground transition-colors hover:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Copy className="size-4" /> Replicar
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(true)}
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-destructive/50 px-4 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Trash2 className="size-4" /> Excluir selecionados
                </button>
                <button
                  type="button"
                  onClick={() => setSelected([])}
                  aria-label="Limpar seleção"
                  className="grid size-10 place-items-center rounded-xl border border-border text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Page>
  );
}
