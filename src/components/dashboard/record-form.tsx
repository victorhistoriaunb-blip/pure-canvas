import { useState } from "react";
import { motion } from "motion/react";
import { Loader2, X } from "lucide-react";
import { useFinance } from "@/lib/finance-store";
import {
  EXPENSE_KINDS,
  EXPENSE_KIND_LABEL,
  paymentStatusOf,
  type ExpenseKind,
  type Transaction,
} from "@/lib/finance.types";

const field =
  "w-full rounded-xl border border-input bg-background/70 px-3 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/80 focus:border-primary focus:ring-2 focus:ring-ring/30";
const labelCls = "text-[11px] font-semibold tracking-wide text-muted-foreground uppercase";

type FormState = {
  description: string;
  amount: string;
  date: string;
  dueDate: string;
  type: "receita" | "despesa";
  expenseKind: ExpenseKind;
  account: string;
  method: string;
  paidAmount: string;
  paymentDate: string;
  notes: string;
  details: string;
  history: string;
  links: string;
  comments: string;
};

function toForm(record?: Transaction | null): FormState {
  return {
    description: record?.description ?? "",
    amount: record?.amount ? String(record.amount) : "",
    date: record?.date ?? "",
    dueDate: record?.dueDate ?? "",
    type: record?.type ?? "despesa",
    expenseKind: record?.expenseKind ?? "nenhuma",
    account: record?.account ?? "",
    method: record?.method ?? "",
    paidAmount: record?.paidAmount ? String(record.paidAmount) : "",
    paymentDate: record?.paymentDate ?? "",
    notes: record?.notes ?? "",
    details: record?.details ?? "",
    history: record?.history ?? "",
    links: record?.links ?? "",
    comments: record?.comments ?? "",
  };
}

const num = (v: string) => {
  const n = Number(String(v).replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? Math.abs(n) : 0;
};

/**
 * Formulário completo (fluxo da caneta). A edição rápida acontece direto no card.
 */
export function RecordDialog({
  record,
  onClose,
}: {
  record?: Transaction | null;
  onClose: () => void;
}) {
  const { addRecord, updateRecord } = useFinance();
  const [form, setForm] = useState<FormState>(() => toForm(record));
  const [tab, setTab] = useState<"principal" | "detalhamento">("principal");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const amount = num(form.amount);
  const paid = Math.min(num(form.paidAmount), amount || num(form.paidAmount));
  const remaining = Math.max(0, amount - paid);
  const status = paymentStatusOf(amount, paid);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.description.trim()) {
      setError("Informe pelo menos o nome da conta.");
      return;
    }
    setSaving(true);
    setError(null);
    const payload = {
      description: form.description.trim(),
      amount,
      date: form.date,
      dueDate: form.dueDate,
      type: form.type,
      expenseKind: form.expenseKind,
      category: record?.category ?? "",
      account: form.account.trim(),
      method: form.method.trim(),
      paidAmount: paid,
      paymentDate: form.paymentDate,
      notes: form.notes.trim(),
      details: form.details.trim(),
      history: form.history.trim(),
      links: form.links.trim(),
      comments: form.comments.trim(),
    };
    try {
      if (record) await updateRecord(record.id, payload);
      else await addRecord({ ...payload, status });
      onClose();
    } catch {
      setError("Não foi possível salvar. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-background/80 p-4 backdrop-blur-sm sm:items-center">
      <motion.form
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        onSubmit={submit}
        className="panel my-auto w-full max-w-2xl p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">
              {record ? "Editar registro" : "Novo registro"}
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Preencha apenas o que fizer sentido para o seu controle.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="grid size-8 place-items-center rounded-lg border border-border text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-1 rounded-xl border border-border bg-background/50 p-1">
          {(["principal", "detalhamento"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`rounded-lg px-3 py-2 text-xs font-semibold capitalize transition-colors ${
                tab === t
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t === "principal" ? "Principal" : "Detalhamento"}
            </button>
          ))}
        </div>

        {tab === "principal" ? (
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className={labelCls}>Data (lançamento)</span>
              <input
                type="date"
                value={form.date}
                onChange={(e) => set("date", e.target.value)}
                className={field}
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className={labelCls}>Conta</span>
              <input
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                maxLength={160}
                placeholder="Ex.: Água, Luz, Netflix"
                className={field}
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className={labelCls}>Despesa</span>
              <select
                value={form.expenseKind}
                onChange={(e) => set("expenseKind", e.target.value as ExpenseKind)}
                className={field}
              >
                {EXPENSE_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {EXPENSE_KIND_LABEL[k]}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className={labelCls}>Vencimento</span>
              <input
                type="date"
                value={form.dueDate}
                onChange={(e) => set("dueDate", e.target.value)}
                className={field}
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className={labelCls}>Valor</span>
              <input
                value={form.amount}
                onChange={(e) => set("amount", e.target.value)}
                inputMode="decimal"
                placeholder="0,00"
                className={field}
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className={labelCls}>Tipo</span>
              <select
                value={form.type}
                onChange={(e) => set("type", e.target.value as FormState["type"])}
                className={field}
              >
                <option value="despesa">Despesa / Saída</option>
                <option value="receita">Receita / Entrada</option>
              </select>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className={labelCls}>Valor pago</span>
              <input
                value={form.paidAmount}
                onChange={(e) => set("paidAmount", e.target.value)}
                inputMode="decimal"
                placeholder="0,00"
                className={field}
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className={labelCls}>Data do pagamento</span>
              <input
                type="date"
                value={form.paymentDate}
                onChange={(e) => set("paymentDate", e.target.value)}
                className={field}
              />
            </label>
          </div>
        ) : (
          <div className="mt-5 grid gap-4">
            <label className="flex flex-col gap-1.5">
              <span className={labelCls}>Observações</span>
              <textarea
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                rows={2}
                maxLength={600}
                className={`${field} resize-y`}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={labelCls}>Informações adicionais</span>
              <textarea
                value={form.details}
                onChange={(e) => set("details", e.target.value)}
                rows={3}
                maxLength={1200}
                placeholder="Número do contrato, titular, detalhes do serviço…"
                className={`${field} resize-y`}
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5">
                <span className={labelCls}>Histórico</span>
                <textarea
                  value={form.history}
                  onChange={(e) => set("history", e.target.value)}
                  rows={3}
                  maxLength={1200}
                  className={`${field} resize-y`}
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className={labelCls}>Comentários</span>
                <textarea
                  value={form.comments}
                  onChange={(e) => set("comments", e.target.value)}
                  rows={3}
                  maxLength={1200}
                  className={`${field} resize-y`}
                />
              </label>
            </div>
            <label className="flex flex-col gap-1.5">
              <span className={labelCls}>Links</span>
              <input
                value={form.links}
                onChange={(e) => set("links", e.target.value)}
                maxLength={600}
                placeholder="https://…"
                className={field}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={labelCls}>Conta bancária / Forma de pagamento</span>
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  value={form.account}
                  onChange={(e) => set("account", e.target.value)}
                  maxLength={80}
                  placeholder="Banco / carteira"
                  className={field}
                />
                <input
                  value={form.method}
                  onChange={(e) => set("method", e.target.value)}
                  maxLength={80}
                  placeholder="Pix, boleto, cartão…"
                  className={field}
                />
              </div>
            </label>
            <p className="rounded-xl border border-dashed border-border px-3 py-2.5 text-[11px] text-muted-foreground">
              Anexos: estrutura preparada — os arquivos poderão ser vinculados a este registro em uma
              próxima etapa.
            </p>
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface/40 px-4 py-3 text-xs">
          <span className="text-muted-foreground">
            Restante:{" "}
            <strong className="text-foreground">
              {remaining.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </strong>
          </span>
          <span className="text-muted-foreground">
            Situação: <strong className="text-foreground capitalize">{status}</strong>
          </span>
          <div className="ml-auto flex gap-2">
            <button
              type="button"
              onClick={() => set("paidAmount", String(amount))}
              className="rounded-lg border border-border px-3 py-1.5 font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Marcar como pago
            </button>
            <button
              type="button"
              onClick={() => set("paidAmount", "")}
              className="rounded-lg border border-border px-3 py-1.5 font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Marcar como pendente
            </button>
          </div>
        </div>

        {error && (
          <p className="mt-3 rounded-lg bg-destructive/15 px-3 py-2 text-xs text-destructive">{error}</p>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-xl border border-border px-4 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-[image:var(--gradient-primary)] px-5 text-sm font-semibold text-primary-foreground transition-all hover:brightness-110 disabled:opacity-70"
          >
            {saving && <Loader2 className="size-4 animate-spin" />}
            Salvar registro
          </button>
        </div>
      </motion.form>
    </div>
  );
}
