import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarClock,
  PiggyBank,
  Receipt,
  Wallet,
} from "lucide-react";
import { useFinance } from "@/lib/finance-store";
import {
  brl,
  brl2,
  categoriesOf,
  dailySeries,
  fullMonthLabel,
  monthKey,
  monthlySeries,
  shiftMonth,
  totals,
} from "@/lib/analytics";
import { remainingOf, STATUS_LABEL, type PaymentStatus } from "@/lib/finance.types";
import { Page, Select } from "@/components/dashboard/page";
import { ExportMenu } from "@/components/dashboard/export-menu";

import { KpiCard } from "@/components/dashboard/kpi-card";
import {
  CategoryBars,
  CategoryDonut,
  DailyBars,
  FlowChart,
  Panel,
} from "@/components/dashboard/charts";
import { TransactionsTable } from "@/components/dashboard/transactions-table";

export const Route = createFileRoute("/_gated/analise")({
  head: () => ({
    meta: [
      { title: "Análise · PINA Finanças" },
      {
        name: "description",
        content:
          "Dashboard único com filtros de dia, semana, mês e ano: indicadores, gráficos, categorias e lançamentos.",
      },
      { property: "og:title", content: "Análise · PINA Finanças" },
      {
        property: "og:description",
        content: "Indicadores, gráficos e categorias em uma visão única com filtros de período.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AnalisePage,
});

type Mode = "dia" | "semana" | "mes" | "ano" | "tudo";

const MODE_OPTIONS = [
  { value: "dia", label: "Dia" },
  { value: "semana", label: "Semana" },
  { value: "mes", label: "Mês" },
  { value: "ano", label: "Ano" },
  { value: "tudo", label: "Todo o período" },
];

const iso = (d: Date) => d.toISOString().slice(0, 10);

/** Intervalo [start, end] em ISO conforme o modo e a data de referência. */
function rangeOf(mode: Mode, anchor: string) {
  if (mode === "tudo") return { start: "0000-01-01", end: "9999-12-31" };
  if (mode === "dia") return { start: anchor, end: anchor };
  if (mode === "ano") {
    const y = anchor.slice(0, 4);
    return { start: `${y}-01-01`, end: `${y}-12-31` };
  }
  if (mode === "mes") {
    const key = anchor.slice(0, 7);
    const [y, m] = key.split("-").map(Number);
    const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
    return { start: `${key}-01`, end: `${key}-${String(last).padStart(2, "0")}` };
  }
  const d = new Date(`${anchor}T00:00:00Z`);
  const weekday = (d.getUTCDay() + 6) % 7;
  const start = new Date(d);
  start.setUTCDate(d.getUTCDate() - weekday);
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);
  return { start: iso(start), end: iso(end) };
}

function periodLabel(mode: Mode, anchor: string, start: string, end: string) {
  const fmt = (v: string) =>
    new Date(`${v}T00:00:00Z`).toLocaleDateString("pt-BR", { timeZone: "UTC" });
  if (mode === "tudo") return "Todo o período";
  if (mode === "dia")
    return new Date(`${anchor}T00:00:00Z`).toLocaleDateString("pt-BR", {
      dateStyle: "full",
      timeZone: "UTC",
    });
  if (mode === "mes") return fullMonthLabel(anchor.slice(0, 7));
  if (mode === "ano") return `Ano de ${anchor.slice(0, 4)}`;
  return `Semana de ${fmt(start)} a ${fmt(end)}`;
}

function AnalisePage() {
  const { transactions } = useFinance();
  const latest = transactions[0]?.date || new Date().toISOString().slice(0, 10);
  const [mode, setMode] = useState<Mode>("mes");
  const [anchorRaw, setAnchor] = useState("");
  const anchor = anchorRaw || latest;

  const { start, end } = useMemo(() => rangeOf(mode, anchor), [mode, anchor]);
  const rows = useMemo(
    () => transactions.filter((t) => t.date >= start && t.date <= end),
    [transactions, start, end],
  );

  const t = totals(rows);
  const expenseCats = useMemo(() => categoriesOf(rows, "despesa"), [rows]);
  const incomeCats = useMemo(() => categoriesOf(rows, "receita"), [rows]);
  const [catType, setCatType] = useState<"despesa" | "receita">("despesa");
  const categories = catType === "despesa" ? expenseCats : incomeCats;
  const catTotal = categories.reduce((s, c) => s + c.total, 0);

  const monthsBack = useMemo(() => {
    const base = anchor.slice(0, 7);
    const keys: string[] = [];
    for (let i = 11; i >= 0; i--) keys.push(shiftMonth(base, -i));
    return monthlySeries(transactions, keys);
  }, [transactions, anchor]);

  const daily = useMemo(() => dailySeries(rows, anchor.slice(0, 7)), [rows, anchor]);

  const byStatus = useMemo(() => {
    const acc: Record<PaymentStatus, { count: number; total: number }> = {
      pago: { count: 0, total: 0 },
      parcial: { count: 0, total: 0 },
      pendente: { count: 0, total: 0 },
    };
    for (const r of rows) {
      acc[r.status].count += 1;
      acc[r.status].total += r.amount;
    }
    return acc;
  }, [rows]);

  const pendingTotal = rows
    .filter((r) => r.type === "despesa" && r.status !== "pago")
    .reduce((s, r) => s + remainingOf(r), 0);

  const upcoming = useMemo(
    () =>
      rows
        .filter((r) => r.dueDate && r.status !== "pago")
        .sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1))
        .slice(0, 6),
    [rows],
  );

  const monthsWithData = useMemo(
    () => [...new Set(transactions.map((r) => monthKey(r.date)).filter(Boolean))].sort().reverse(),
    [transactions],
  );

  const buildReport = () => ({
    title: "Análise",
    subtitle: periodLabel(mode, anchor, start, end),
    filters: [
      { label: "Período", value: periodLabel(mode, anchor, start, end) },
      { label: "Intervalo", value: mode === "tudo" ? "Todos os lançamentos" : `${start} a ${end}` },
      { label: "Categorias", value: catType === "despesa" ? "Despesas" : "Receitas" },
    ],
    kpis: [
      { label: "Receitas", value: brl(t.receitas) },
      { label: "Despesas", value: brl(t.despesas) },
      { label: "Saldo do período", value: brl(t.economia) },
      { label: "A pagar", value: brl(pendingTotal) },
      { label: "Lançamentos", value: String(t.count) },
    ],
    charts: [
      {
        title: "Receitas x Despesas (12 meses)",
        type: "bar" as const,
        labels: monthsBack.map((m) => m.label),
        series: [
          { name: "Receitas", values: monthsBack.map((m) => m.receitas) },
          { name: "Despesas", values: monthsBack.map((m) => m.despesas) },
        ],
      },
      ...(categories.length > 0
        ? [
            {
              title: `Participação por categoria (${catType === "despesa" ? "despesas" : "receitas"})`,
              type: "pie" as const,
              labels: categories.slice(0, 8).map((c) => c.name || "Sem categoria"),
              series: [{ name: "Total", values: categories.slice(0, 8).map((c) => c.total) }],
            },
          ]
        : []),
    ],
    tables: [
      ...(categories.length > 0
        ? [
            {
              title: "Detalhamento por categoria",
              columns: ["Categoria", "Total", "Participação"],
              rows: categories.map((c) => [
                c.name || "Sem categoria",
                brl(c.total),
                `${c.share.toFixed(1)}%`,
              ]),
            },
          ]
        : []),
      {
        title: "Lançamentos do período",
        columns: ["Data", "Descrição", "Categoria", "Situação", "Valor"],
        rows: rows
          .slice(0, 300)
          .map((r) => [r.date, r.description, r.category, STATUS_LABEL[r.status], brl(r.amount)]),
      },
    ],
    notes: [
      `Pagos: ${byStatus.pago.count} · Parciais: ${byStatus.parcial.count} · Pendentes: ${byStatus.pendente.count}.`,
      `Total em aberto no período: ${brl(pendingTotal)}.`,
    ],
  });

  return (
    <Page
      title="Análise"
      subtitle={periodLabel(mode, anchor, start, end)}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Select value={mode} onChange={(v) => setMode(v as Mode)} options={MODE_OPTIONS} />
          {mode === "mes" ? (
            <Select
              value={anchor.slice(0, 7)}
              onChange={(v) => setAnchor(`${v}-01`)}
              options={(monthsWithData.length > 0 ? monthsWithData : [anchor.slice(0, 7)]).map(
                (m) => ({ value: m, label: fullMonthLabel(m) }),
              )}
            />
          ) : mode === "ano" ? (
            <Select
              value={anchor.slice(0, 4)}
              onChange={(v) => setAnchor(`${v}-01-01`)}
              options={[
                ...new Set(
                  (transactions.length > 0
                    ? transactions.map((r) => r.date.slice(0, 4)).filter(Boolean)
                    : [anchor.slice(0, 4)]
                  ).sort().reverse(),
                ),
              ].map((y) => ({ value: y, label: y }))}
            />
          ) : mode === "tudo" ? null : (
            <input
              type="date"
              value={anchor}
              onChange={(e) => setAnchor(e.target.value)}
              className="rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
            />
          )}
          <ExportMenu build={buildReport} />
        </div>
      }
    >

      <div className="flex flex-col gap-5">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <KpiCard index={0} icon={ArrowUpRight} title="Receitas" value={brl(t.receitas)} tone="success" />
          <KpiCard index={1} icon={ArrowDownRight} title="Despesas" value={brl(t.despesas)} tone="danger" />
          <KpiCard index={2} icon={PiggyBank} title="Saldo do período" value={brl(t.economia)} tone="primary" />
          <KpiCard index={3} icon={Wallet} title="A pagar" value={brl(pendingTotal)} tone="warning" />
          <KpiCard index={4} icon={Receipt} title="Lançamentos" value={String(t.count)} tone="primary" />
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          <Panel
            title="Receitas x Despesas"
            description="Últimos 12 meses a partir do período escolhido"
            delay={0.05}
            className="xl:col-span-2"
          >
            <FlowChart data={monthsBack} />
          </Panel>
          <Panel title="Situação de pagamento" description={`${rows.length} lançamento(s)`} delay={0.1}>
            <div className="flex flex-col gap-3">
              {(Object.keys(STATUS_LABEL) as PaymentStatus[]).map((s) => {
                const share = t.count === 0 ? 0 : (byStatus[s].count / t.count) * 100;
                return (
                  <div key={s} className="rounded-xl bg-surface/50 p-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-foreground">{STATUS_LABEL[s]}</span>
                      <span className="text-muted-foreground">
                        {byStatus[s].count} · {brl(byStatus[s].total)}
                      </span>
                    </div>
                    <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-background">
                      <span
                        className="block h-full rounded-full bg-primary"
                        style={{ width: `${share}%` }}
                      />
                    </span>
                  </div>
                );
              })}
            </div>
          </Panel>
        </div>

        {mode !== "ano" && mode !== "tudo" && (
          <Panel
            title="Movimentação diária"
            description={fullMonthLabel(anchor.slice(0, 7))}
            delay={0.15}
          >
            <DailyBars data={daily} />
          </Panel>
        )}

        <div className="grid gap-4 xl:grid-cols-3">
          <Panel title="Participação por categoria" description={`Total ${brl(catTotal)}`} delay={0.2}>
            <div className="mb-3">
              <Select
                value={catType}
                onChange={(v) => setCatType(v as "despesa" | "receita")}
                options={[
                  { value: "despesa", label: "Despesas" },
                  { value: "receita", label: "Receitas" },
                ]}
              />
            </div>
            <CategoryDonut data={categories} />
          </Panel>
          <Panel
            title="Ranking de categorias"
            description={`${categories.length} categoria(s)`}
            delay={0.25}
            className="xl:col-span-2"
          >
            <CategoryBars data={categories} />
          </Panel>
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          <Panel title="Detalhamento por categoria" description="Valor e participação" delay={0.3} className="xl:col-span-2">
            {categories.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Nenhuma categoria neste período.
              </p>
            ) : (
              <div className="-mx-2 max-h-[360px] overflow-auto">
                <table className="w-full min-w-[420px] text-left text-sm">
                  <thead className="sticky top-0 bg-card">
                    <tr className="text-xs tracking-wide text-muted-foreground uppercase">
                      <th className="px-2 py-2 font-semibold">Categoria</th>
                      <th className="px-2 py-2 text-right font-semibold">Total</th>
                      <th className="px-2 py-2 text-right font-semibold">Participação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories.map((c) => (
                      <tr key={c.name} className="border-t border-border/60 hover:bg-surface/40">
                        <td className="px-2 py-2.5 text-foreground">{c.name || "Sem categoria"}</td>
                        <td className="px-2 py-2.5 text-right font-medium text-foreground">
                          {brl(c.total)}
                        </td>
                        <td className="px-2 py-2.5 text-right text-muted-foreground">
                          {c.share.toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>

          <Panel title="Próximos vencimentos" description="Contas em aberto no período" delay={0.35}>
            {upcoming.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Nenhuma conta em aberto com vencimento.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {upcoming.map((r) => (
                  <li
                    key={r.id}
                    className="flex items-center justify-between gap-3 rounded-xl bg-surface/50 px-3 py-2 text-xs"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <CalendarClock className="size-3.5 shrink-0 text-warning" />
                      <span className="truncate text-foreground">{r.description}</span>
                    </span>
                    <span className="shrink-0 text-right text-muted-foreground">
                      {new Date(`${r.dueDate}T00:00:00Z`).toLocaleDateString("pt-BR", {
                        timeZone: "UTC",
                      })}
                      <strong className="ml-2 text-foreground">{brl2(remainingOf(r))}</strong>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <Panel title="Lançamentos do período" description={`${rows.length} registro(s)`} delay={0.4}>
          <TransactionsTable rows={rows} limit={500} />
        </Panel>
      </div>
    </Page>
  );
}
