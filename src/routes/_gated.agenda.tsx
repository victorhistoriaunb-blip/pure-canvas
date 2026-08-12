import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CalendarDays, LayoutGrid, List, Plus, Search, Trash2, Pencil, Check, X } from "lucide-react";
import { useFinance } from "@/lib/finance-store";
import { brl, fullMonthLabel, monthKey, shiftMonth } from "@/lib/analytics";
import {
  DEFAULT_AGENDA_STATUSES,
  STATUS_LABEL,
  remainingOf,
  type AgendaEvent,
  type Transaction,
} from "@/lib/finance.types";
import { Page, Select } from "@/components/dashboard/page";
import { Panel } from "@/components/dashboard/charts";
import { AgendaCalendar, buildMonthGrid } from "@/components/dashboard/agenda-calendar";

export const Route = createFileRoute("/_gated/agenda")({
  head: () => ({
    meta: [
      { title: "Agenda · PINA Finanças" },
      { name: "description", content: "Acompanhe compromissos, vencimentos e lançamentos financeiros em um calendário mensal." },
      { property: "og:title", content: "Agenda · PINA Finanças" },
      { property: "og:description", content: "Calendário de compromissos financeiros com status configuráveis." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AgendaPage,
});

const todayISO = () => new Date().toISOString().slice(0, 10);

function statusColor(statuses: { id: string; color: string }[], id: string) {
  return statuses.find((s) => s.id === id)?.color ?? "#94A3B8";
}

/** Cor de marcador de um lançamento, priorizando situação de pagamento. */
function txColor(t: Transaction, refDate: string) {
  if (t.status === "pago") return "#22C55E";
  if (t.status === "parcial") return "#F59E0B";
  return refDate < todayISO() ? "#EF4444" : "#F59E0B";
}

type FormState = {
  id?: string;
  date: string;
  time: string;
  title: string;
  statusId: string;
  amount: string;
  notes: string;
};

function emptyForm(date: string, statusId: string): FormState {
  return { date, time: "", title: "", statusId, amount: "", notes: "" };
}

function AgendaPage() {
  const { agenda, saveEvent, removeEvent, transactions, settings, updateRecord } = useFinance();
  const statuses = settings.agendaStatuses?.length ? settings.agendaStatuses : DEFAULT_AGENDA_STATUSES;

  const [month, setMonth] = useState(monthKey(todayISO()));
  const [selectedDate, setSelectedDate] = useState<string | null>(todayISO());
  const [view, setView] = useState<"mes" | "lista">("mes");
  const [statusFilter, setStatusFilter] = useState("all");
  const [term, setTerm] = useState("");
  const [form, setForm] = useState<FormState | null>(null);

  const matchesFilter = (title: string, statusId?: string) =>
    (statusFilter === "all" || statusId === statusFilter) &&
    (term.trim() === "" || title.toLowerCase().includes(term.trim().toLowerCase()));

  const filteredAgenda = useMemo(
    () => agenda.filter((e) => matchesFilter(e.title, e.statusId)),
    [agenda, statusFilter, term],
  );

  const eventsByDate = useMemo(() => {
    const map = new Map<string, AgendaEvent[]>();
    for (const e of filteredAgenda) {
      if (!e.date) continue;
      map.set(e.date, [...(map.get(e.date) ?? []), e]);
    }
    return map;
  }, [filteredAgenda]);

  const txByLaunchDate = useMemo(() => {
    const map = new Map<string, Transaction[]>();
    for (const t of transactions) {
      if (!t.date || (term.trim() && !t.description.toLowerCase().includes(term.trim().toLowerCase())))
        continue;
      if (statusFilter !== "all") continue; // status de agenda não se aplica a lançamentos
      map.set(t.date, [...(map.get(t.date) ?? []), t]);
    }
    return map;
  }, [transactions, term, statusFilter]);

  const txByDueDate = useMemo(() => {
    const map = new Map<string, Transaction[]>();
    for (const t of transactions) {
      if (!t.dueDate || t.dueDate === t.date) continue;
      if (term.trim() && !t.description.toLowerCase().includes(term.trim().toLowerCase())) continue;
      if (statusFilter !== "all") continue;
      map.set(t.dueDate, [...(map.get(t.dueDate) ?? []), t]);
    }
    return map;
  }, [transactions, term, statusFilter]);

  const days = useMemo(() => {
    const grid = buildMonthGrid(month, todayISO());
    return grid.map((d) => {
      const markers: { color: string; key: string }[] = [];
      for (const e of eventsByDate.get(d.date) ?? [])
        markers.push({ color: statusColor(statuses, e.statusId), key: `e-${e.id}` });
      for (const t of txByLaunchDate.get(d.date) ?? [])
        markers.push({ color: txColor(t, d.date), key: `l-${t.id}` });
      for (const t of txByDueDate.get(d.date) ?? [])
        markers.push({ color: txColor(t, d.date), key: `v-${t.id}` });
      return { ...d, markers };
    });
  }, [month, eventsByDate, txByLaunchDate, txByDueDate, statuses]);

  // ---- Resumo mensal ----
  const summary = useMemo(() => {
    const inMonth = (d: string) => d && monthKey(d) === month;
    const compromissos = agenda.filter((e) => inMonth(e.date)).length;
    const aPagar = transactions
      .filter((t) => t.type === "despesa" && t.status !== "pago" && inMonth(t.dueDate || t.date))
      .reduce((sum, t) => sum + remainingOf(t), 0);
    const recebido = transactions
      .filter((t) => t.type === "receita" && inMonth(t.date))
      .reduce((sum, t) => sum + t.amount, 0);
    const in7 = (() => {
      const start = todayISO();
      const end = new Date();
      end.setDate(end.getDate() + 7);
      const endISO = end.toISOString().slice(0, 10);
      const evs = agenda.filter((e) => e.date >= start && e.date <= endISO).length;
      const dues = transactions.filter(
        (t) => t.status !== "pago" && t.dueDate && t.dueDate >= start && t.dueDate <= endISO,
      ).length;
      return evs + dues;
    })();
    return { compromissos, aPagar, recebido, in7 };
  }, [agenda, transactions, month]);

  // ---- Lista de próximos compromissos ----
  const upcoming = useMemo(() => {
    type Item = { date: string; kind: "evento" | "lancamento" | "vencimento"; label: string; sub: string; color: string; id: string; ref?: Transaction | AgendaEvent };
    const items: Item[] = [];
    for (const e of filteredAgenda)
      items.push({
        date: e.date,
        kind: "evento",
        label: e.title,
        sub: e.time ? `${e.time}${e.amount ? " · " + brl(e.amount) : ""}` : e.amount ? brl(e.amount) : "",
        color: statusColor(statuses, e.statusId),
        id: e.id,
        ref: e,
      });
    if (statusFilter === "all") {
      for (const t of transactions) {
        if (term.trim() && !t.description.toLowerCase().includes(term.trim().toLowerCase())) continue;
        if (t.date)
          items.push({
            date: t.date,
            kind: "lancamento",
            label: t.description || "Lançamento",
            sub: `${STATUS_LABEL[t.status]} · ${brl(t.amount)}`,
            color: txColor(t, t.date),
            id: t.id,
            ref: t,
          });
        if (t.dueDate && t.dueDate !== t.date)
          items.push({
            date: t.dueDate,
            kind: "vencimento",
            label: `Vencimento: ${t.description || "Lançamento"}`,
            sub: `${STATUS_LABEL[t.status]} · ${brl(t.amount)}`,
            color: txColor(t, t.dueDate),
            id: `due-${t.id}`,
            ref: t,
          });
      }
    }
    items.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

    const groups = new Map<string, Item[]>();
    for (const item of items) {
      const key = monthKey(item.date);
      groups.set(key, [...(groups.get(key) ?? []), item]);
    }
    return [...groups.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1));
  }, [filteredAgenda, transactions, term, statusFilter, statuses]);

  const dayEvents = selectedDate ? eventsByDate.get(selectedDate) ?? [] : [];
  const dayLaunches = selectedDate ? txByLaunchDate.get(selectedDate) ?? [] : [];
  const dayDues = selectedDate ? (txByDueDate.get(selectedDate) ?? []).filter((t) => !dayLaunches.includes(t)) : [];

  function markPaid(t: Transaction, date: string) {
    updateRecord(t.id, { paidAmount: t.amount, paymentDate: date });
  }

  function submitForm(e: React.FormEvent) {
    e.preventDefault();
    if (!form || !form.title.trim() || !form.date) return;
    const event: AgendaEvent = {
      id: form.id ?? `agenda:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`,
      date: form.date,
      time: form.time,
      title: form.title.trim(),
      notes: form.notes,
      statusId: form.statusId,
      amount: Number(form.amount) || 0,
      recordId: "",
      kind: "evento",
    };
    saveEvent(event);
    setForm(null);
  }

  return (
    <Page title="Agenda" subtitle="Compromissos, lançamentos e vencimentos em um só lugar" requireData={false}>
      <div className="flex flex-col gap-5">
        {form && (
          <div
            className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4"
            onClick={() => setForm(null)}
          >
            <form
              onClick={(e) => e.stopPropagation()}
              onSubmit={submitForm}
              className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-xl"
            >
              <h3 className="mb-4 text-sm font-semibold">{form.id ? "Editar compromisso" : "Novo compromisso"}</h3>
              <div className="flex flex-col gap-3">
                <label className="text-xs text-muted-foreground">
                  Título
                  <input
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-input bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
                    autoFocus
                  />
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="text-xs text-muted-foreground">
                    Data
                    <input
                      type="date"
                      value={form.date}
                      onChange={(e) => setForm({ ...form, date: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-input bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
                    />
                  </label>
                  <label className="text-xs text-muted-foreground">
                    Hora
                    <input
                      type="time"
                      value={form.time}
                      onChange={(e) => setForm({ ...form, time: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-input bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
                    />
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <label className="text-xs text-muted-foreground">
                    Status
                    <select
                      value={form.statusId}
                      onChange={(e) => setForm({ ...form, statusId: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-input bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
                    >
                      {statuses.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-xs text-muted-foreground">
                    Valor (opcional)
                    <input
                      type="number"
                      step="0.01"
                      value={form.amount}
                      onChange={(e) => setForm({ ...form, amount: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-input bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
                    />
                  </label>
                </div>
                <label className="text-xs text-muted-foreground">
                  Observações
                  <textarea
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    rows={3}
                    className="mt-1 w-full rounded-lg border border-input bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
                  />
                </label>
              </div>
              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setForm(null)}
                  className="rounded-lg border border-border px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-[image:var(--gradient-primary)] px-4 py-2 text-xs font-semibold text-primary-foreground hover:brightness-110"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard label="Compromissos do mês" value={String(summary.compromissos)} icon={CalendarDays} />
          <SummaryCard label="A pagar no mês" value={brl(summary.aPagar)} tone="destructive" />
          <SummaryCard label="Recebido no mês" value={brl(summary.recebido)} tone="success" />
          <SummaryCard label="Próximos 7 dias" value={String(summary.in7)} />
        </div>

        <Panel title="Filtros" delay={0.05}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <Select
                value={statusFilter}
                onChange={setStatusFilter}
                label="Status"
                options={[{ value: "all", label: "Todos" }, ...statuses.map((s) => ({ value: s.id, label: s.name }))]}
              />
              <span className="relative flex items-center">
                <Search className="pointer-events-none absolute left-3 size-3.5 text-muted-foreground" />
                <input
                  value={term}
                  onChange={(e) => setTerm(e.target.value)}
                  placeholder="Buscar título ou descrição"
                  className="rounded-lg border border-input bg-card py-2 pr-3 pl-8 text-sm outline-none focus:border-primary"
                />
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="inline-flex rounded-xl border border-border p-1">
                {([
                  ["mes", "Mês", LayoutGrid],
                  ["lista", "Lista", List],
                ] as const).map(([value, label, Icon]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setView(value)}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                      view === value ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Icon className="size-3.5" /> {label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setForm(emptyForm(selectedDate ?? todayISO(), statuses[0]?.id ?? ""))}
                className="inline-flex h-9 items-center gap-2 rounded-xl bg-[image:var(--gradient-primary)] px-4 text-xs font-semibold text-primary-foreground transition-all hover:brightness-110"
              >
                <Plus className="size-3.5" /> Novo
              </button>
            </div>
          </div>
        </Panel>

        {view === "mes" ? (
          <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
            <Panel title="Calendário" delay={0.1}>
              <AgendaCalendar
                monthLabel={fullMonthLabel(month)}
                days={days}
                selectedDate={selectedDate}
                onSelectDay={setSelectedDate}
                onPrevMonth={() => setMonth((m) => shiftMonth(m, -1))}
                onNextMonth={() => setMonth((m) => shiftMonth(m, 1))}
                onToday={() => {
                  setMonth(monthKey(todayISO()));
                  setSelectedDate(todayISO());
                }}
              />
            </Panel>

            <Panel
              title={selectedDate ? formatDay(selectedDate) : "Selecione um dia"}
              description="Compromissos e lançamentos do dia"
              delay={0.15}
            >
              {!selectedDate ? (
                <p className="py-6 text-center text-sm text-muted-foreground">Clique em um dia do calendário.</p>
              ) : dayEvents.length === 0 && dayLaunches.length === 0 && dayDues.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-6 text-center text-sm text-muted-foreground">
                  <p>Nenhum item neste dia.</p>
                  <button
                    type="button"
                    onClick={() => setForm(emptyForm(selectedDate, statuses[0]?.id ?? ""))}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:border-primary/60"
                  >
                    <Plus className="size-3.5" /> Adicionar compromisso
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {dayEvents.map((e) => (
                    <EventRow
                      key={e.id}
                      event={e}
                      color={statusColor(statuses, e.statusId)}
                      statusName={statuses.find((s) => s.id === e.statusId)?.name ?? ""}
                      onEdit={() =>
                        setForm({
                          id: e.id,
                          date: e.date,
                          time: e.time,
                          title: e.title,
                          statusId: e.statusId,
                          amount: e.amount ? String(e.amount) : "",
                          notes: e.notes,
                        })
                      }
                      onDelete={() => removeEvent(e.id)}
                    />
                  ))}
                  {dayLaunches.map((t) => (
                    <TxRow key={t.id} t={t} label="Lançamento" onMarkPaid={() => markPaid(t, selectedDate)} />
                  ))}
                  {dayDues.map((t) => (
                    <TxRow key={`due-${t.id}`} t={t} label="Vencimento" onMarkPaid={() => markPaid(t, selectedDate)} />
                  ))}
                </div>
              )}
            </Panel>
          </div>
        ) : (
          <Panel title="Próximos compromissos" description="Ordenados por data" delay={0.1}>
            {upcoming.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Nenhum compromisso encontrado.</p>
            ) : (
              <div className="flex flex-col gap-6">
                {upcoming.map(([key, items]) => (
                  <div key={key}>
                    <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {fullMonthLabel(key)}
                    </h4>
                    <div className="flex flex-col gap-2">
                      {items.map((item) => (
                        <div
                          key={item.kind + item.id}
                          className="flex items-center gap-3 rounded-xl bg-surface/50 p-3 text-sm"
                        >
                          <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium">{item.label}</p>
                            <p className="truncate text-xs text-muted-foreground">
                              {formatDay(item.date)} {item.sub && `· ${item.sub}`}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        )}
      </div>
    </Page>
  );
}

function formatDay(iso: string) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "long",
    timeZone: "UTC",
  });
}

function SummaryCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  icon?: React.ComponentType<{ className?: string }>;
  tone?: "success" | "destructive";
}) {
  return (
    <div className="panel flex items-center justify-between gap-3 p-4">
      <div className="min-w-0">
        <p className="truncate text-xs text-muted-foreground">{label}</p>
        <p
          className={`mt-1 text-lg font-semibold ${
            tone === "success" ? "text-success" : tone === "destructive" ? "text-destructive" : ""
          }`}
        >
          {value}
        </p>
      </div>
      {Icon && (
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
          <Icon className="size-4" />
        </span>
      )}
    </div>
  );
}

function EventRow({
  event,
  color,
  statusName,
  onEdit,
  onDelete,
}: {
  event: AgendaEvent;
  color: string;
  statusName: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border/60 p-3">
      <span className="mt-1 size-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{event.title}</p>
        <p className="truncate text-xs text-muted-foreground">
          {event.time && `${event.time} · `}
          {statusName}
          {event.amount ? ` · ${brl(event.amount)}` : ""}
        </p>
        {event.notes && <p className="mt-1 truncate text-xs text-muted-foreground">{event.notes}</p>}
      </div>
      <div className="flex shrink-0 gap-1">
        <button
          type="button"
          onClick={onEdit}
          aria-label="Editar"
          className="grid size-7 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-surface hover:text-foreground"
        >
          <Pencil className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          aria-label="Excluir"
          className="grid size-7 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

function TxRow({ t, label, onMarkPaid }: { t: Transaction; label: string; onMarkPaid: () => void }) {
  const color = t.status === "pago" ? "#22C55E" : t.status === "parcial" ? "#F59E0B" : "#EF4444";
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border/60 p-3">
      <span className="mt-1 size-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{t.description || "Lançamento"}</p>
        <p className="truncate text-xs text-muted-foreground">
          {label} · {STATUS_LABEL[t.status]} · {brl(t.amount)}
        </p>
      </div>
      {t.status !== "pago" && (
        <button
          type="button"
          onClick={onMarkPaid}
          className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-border px-2 py-1 text-[11px] font-semibold text-muted-foreground transition-colors hover:border-success/60 hover:text-success"
        >
          <Check className="size-3" /> Pago
        </button>
      )}
    </div>
  );
}
