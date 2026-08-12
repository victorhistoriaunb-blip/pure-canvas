import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowDown, ArrowUp, Eye, EyeOff, RotateCcw, Wallet } from "lucide-react";
import { useFinance } from "@/lib/finance-store";
import {
  availableMonths,
  brl,
  buildDashboard,
  fullMonthLabel,
  monthKey,
} from "@/lib/analytics";
import { Page, Select } from "@/components/dashboard/page";
import { ExportMenu } from "@/components/dashboard/export-menu";

import { KpiCard } from "@/components/dashboard/kpi-card";
import {
  CategoryBars,
  DailyBars,
  FlowChart,
  GoalGauge,
  Panel,
} from "@/components/dashboard/charts";
import { StatusBadge } from "@/components/dashboard/status-badge";
import {
  DASHBOARD_CARDS,
  DEFAULT_DASHBOARD_LAYOUT,
  type DashboardCardPref,
} from "@/lib/finance.types";

export const Route = createFileRoute("/_gated/paineis")({
  head: () => ({
    meta: [
      { title: "Painéis · PINA Finanças" },
      {
        name: "description",
        content:
          "Monte seu painel: escolha quais indicadores e gráficos aparecem, o tamanho e a ordem de cada card.",
      },
      { property: "og:title", content: "Painéis · PINA Finanças" },
      { property: "og:description", content: "Painel financeiro personalizável por card." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PanelsPage,
});

const SIZE_CLASS: Record<DashboardCardPref["size"], string> = {
  pequeno: "sm:col-span-1",
  medio: "sm:col-span-2",
  grande: "sm:col-span-2 xl:col-span-4",
};

const SIZE_OPTIONS = [
  { value: "pequeno", label: "Pequeno" },
  { value: "medio", label: "Médio" },
  { value: "grande", label: "Grande" },
];

function PanelsPage() {
  const { transactions, goal, layout, saveLayout } = useFinance();
  const months = useMemo(() => availableMonths(transactions), [transactions]);
  const [month, setMonth] = useState<string>("");
  const [editing, setEditing] = useState(false);
  const current = month && months.includes(month) ? month : months[0];
  const data = useMemo(() => buildDashboard(transactions, goal, current), [transactions, goal, current]);

  const monthRows = useMemo(
    () => (current ? transactions.filter((t) => monthKey(t.date) === current) : transactions),
    [transactions, current],
  );

  const byKind = useMemo(() => {
    const acc = { Fixa: 0, Variável: 0, Nenhuma: 0 } as Record<string, number>;
    for (const t of monthRows) {
      if (t.type !== "despesa") continue;
      const key = t.expenseKind === "fixa" ? "Fixa" : t.expenseKind === "variavel" ? "Variável" : "Nenhuma";
      acc[key] = (acc[key] ?? 0) + t.amount;
    }
    return Object.entries(acc)
      .filter(([, total]) => total > 0)
      .map(([name, total]) => ({ name, total }));
  }, [monthRows]);

  const pending = monthRows.filter((t) => t.status !== "pago");
  const pendingTotal = pending.reduce((s, t) => s + Math.max(t.amount - t.paidAmount, 0), 0);
  const paidTotal = monthRows.reduce((s, t) => s + t.paidAmount, 0);

  const upcoming = useMemo(
    () =>
      transactions
        .filter((t) => t.dueDate && t.status !== "pago")
        .sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1))
        .slice(0, 8),
    [transactions],
  );

  function move(id: string, delta: number) {
    const i = layout.findIndex((c) => c.id === id);
    const j = i + delta;
    if (i < 0 || j < 0 || j >= layout.length) return;
    const next = [...layout];
    const [item] = next.splice(i, 1);
    next.splice(j, 0, item!);
    void saveLayout(next);
  }

  function patch(id: string, data: Partial<DashboardCardPref>) {
    void saveLayout(layout.map((c) => (c.id === id ? { ...c, ...data } : c)));
  }

  function renderCard(pref: DashboardCardPref, index: number) {
    switch (pref.id) {
      case "kpi-saldo":
        return <KpiCard index={index} icon={Wallet} title="Saldo acumulado" value={brl(data.kpis.balance)} hint="todos os lançamentos" tone="primary" />;
      case "kpi-receitas":
        return <KpiCard index={index} icon={Wallet} title="Receitas do mês" value={brl(data.kpis.income)} hint={data.period.current ? fullMonthLabel(data.period.current) : "—"} tone="success" />;
      case "kpi-despesas":
        return <KpiCard index={index} icon={Wallet} title="Despesas do mês" value={brl(data.kpis.expense)} hint={data.period.current ? fullMonthLabel(data.period.current) : "—"} tone="danger" />;
      case "kpi-economia":
        return <KpiCard index={index} icon={Wallet} title="Economia do mês" value={brl(data.kpis.savings)} hint={`${data.kpis.savedPct.toFixed(0)}% das receitas`} tone="primary" />;
      case "kpi-pendente":
        return <KpiCard index={index} icon={Wallet} title="Total pendente" value={brl(pendingTotal)} hint={`${pending.length} conta(s) em aberto`} tone="warning" />;
      case "kpi-pago":
        return <KpiCard index={index} icon={Wallet} title="Total pago" value={brl(paidTotal)} hint="valores já quitados" tone="success" />;
      case "fluxo":
        return (
          <Panel title="Receitas x Despesas" description="Evolução mensal">
            <FlowChart data={data.monthly} />
          </Panel>
        );
      case "despesa-tipo":
        return (
          <Panel title="Despesas por tipo" description="Fixa, variável e sem classificação">
            {byKind.length === 0 ? <EmptyCard /> : <CategoryBars data={byKind} />}
          </Panel>
        );
      case "diario":
        return (
          <Panel title="Gastos diários" description={data.period.current ? fullMonthLabel(data.period.current) : "—"}>
            {data.daily.length === 0 ? <EmptyCard /> : <DailyBars data={data.daily} />}
          </Panel>
        );
      case "vencimentos":
        return (
          <Panel title="Próximos vencimentos" description="Contas em aberto">
            {upcoming.length === 0 ? (
              <EmptyCard label="Nenhuma conta em aberto." />
            ) : (
              <ul className="flex flex-col gap-2">
                {upcoming.map((t) => (
                  <li key={t.id} className="flex items-center justify-between gap-3 rounded-lg border border-border/60 px-3 py-2 text-sm">
                    <span className="min-w-0 truncate text-foreground">{t.description || "Sem nome"}</span>
                    <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                      {new Date(`${t.dueDate}T00:00:00Z`).toLocaleDateString("pt-BR", { timeZone: "UTC" })}
                      <StatusBadge status={t.status} />
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        );
      case "meta":
        return (
          <Panel title="Meta financeira" description={goal.name}>
            <GoalGauge progress={data.goal.progress} />
            <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
              <span>{brl(data.goal.saved)} acumulado</span>
              <span>{brl(goal.target)} alvo</span>
            </div>
          </Panel>
        );
      case "insights":
        return (
          <Panel title="Insights" description="Leituras automáticas dos seus dados">
            {data.insights.length === 0 ? (
              <EmptyCard label="Cadastre mais lançamentos para gerar insights." />
            ) : (
              <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
                {data.insights.map((i) => (
                  <li key={i} className="rounded-lg border border-border/60 px-3 py-2">
                    {i}
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        );
      default:
        return null;
    }
  }

  const visible = layout.filter((c) => c.visible);

  const buildReport = () => ({
    title: "Painéis",
    subtitle: current ? `Painel personalizado · ${fullMonthLabel(current)}` : "Painel personalizado",
    filters: [
      { label: "Período", value: current ? fullMonthLabel(current) : "Sem dados" },
      {
        label: "Cards visíveis",
        value: visible
          .map((c) => DASHBOARD_CARDS.find((d) => d.id === c.id)?.label ?? c.id)
          .join(", ") || "Nenhum",
      },
    ],
    kpis: [
      { label: "Saldo acumulado", value: brl(data.kpis.balance) },
      { label: "Receitas do mês", value: brl(data.kpis.income) },
      { label: "Despesas do mês", value: brl(data.kpis.expense) },
      { label: "Economia do mês", value: brl(data.kpis.savings) },
      { label: "Total pago", value: brl(paidTotal) },
      { label: "Em aberto", value: brl(pendingTotal) },
    ],
    charts: [
      {
        title: "Receitas x Despesas (12 meses)",
        type: "bar" as const,
        labels: data.monthly.map((m) => m.label),
        series: [
          { name: "Receitas", values: data.monthly.map((m) => m.receitas) },
          { name: "Despesas", values: data.monthly.map((m) => m.despesas) },
        ],
      },
      ...(byKind.length > 0
        ? [
            {
              title: "Despesas fixas x variáveis",
              type: "pie" as const,
              labels: byKind.map((k) => k.name),
              series: [{ name: "Total", values: byKind.map((k) => k.total) }],
            },
          ]
        : []),
    ],
    tables: [
      {
        title: "Próximos vencimentos",
        columns: ["Vencimento", "Descrição", "Situação", "Valor"],
        rows: upcoming.map((t) => [
          t.dueDate,
          t.description || t.category,
          t.status,
          brl(t.amount),
        ]),
      },
    ],
    notes: data.insights,
  });

  return (
    <Page
      title="Painéis"
      subtitle="Monte a visão que faz sentido para você"
      actions={
        <div className="flex flex-wrap items-center gap-2">
          {months.length > 0 && (
            <Select
              value={current ?? ""}
              onChange={setMonth}
              options={months.map((m) => ({ value: m, label: fullMonthLabel(m) }))}
            />
          )}
          <ExportMenu build={buildReport} />
          <button
            type="button"
            onClick={() => setEditing((v) => !v)}
            className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/60 hover:text-foreground"
          >
            {editing ? "Concluir" : "Personalizar"}
          </button>
        </div>
      }
    >

      <div className="flex flex-col gap-5">
        {editing && (
          <Panel title="Organizar cards" description="Mostre, oculte, redimensione e reordene">
            <div className="flex flex-col gap-2">
              {layout.map((c, i) => {
                const meta = DASHBOARD_CARDS.find((d) => d.id === c.id);
                return (
                  <div
                    key={c.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 px-3 py-2"
                  >
                    <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                      {meta?.label ?? c.id}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Select
                        value={c.size}
                        onChange={(v) => patch(c.id, { size: v as DashboardCardPref["size"] })}
                        options={SIZE_OPTIONS}
                      />
                      <IconBtn label="Mover para cima" onClick={() => move(c.id, -1)} disabled={i === 0}>
                        <ArrowUp className="size-3.5" />
                      </IconBtn>
                      <IconBtn
                        label="Mover para baixo"
                        onClick={() => move(c.id, 1)}
                        disabled={i === layout.length - 1}
                      >
                        <ArrowDown className="size-3.5" />
                      </IconBtn>
                      <IconBtn
                        label={c.visible ? "Ocultar card" : "Mostrar card"}
                        onClick={() => patch(c.id, { visible: !c.visible })}
                      >
                        {c.visible ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
                      </IconBtn>
                    </div>
                  </div>
                );
              })}
              <button
                type="button"
                onClick={() => void saveLayout(DEFAULT_DASHBOARD_LAYOUT)}
                className="mt-1 inline-flex w-fit items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground transition-colors hover:border-primary/60 hover:text-foreground"
              >
                <RotateCcw className="size-3.5" /> Restaurar padrão
              </button>
            </div>
          </Panel>
        )}

        {visible.length === 0 ? (
          <p className="panel p-8 text-center text-sm text-muted-foreground">
            Nenhum card visível. Clique em “Personalizar” para ativar os cards do seu painel.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {visible.map((pref, i) => (
              <div key={pref.id} className={SIZE_CLASS[pref.size]}>
                {renderCard(pref, i)}
              </div>
            ))}
          </div>
        )}
      </div>
    </Page>
  );
}

function IconBtn({
  children,
  label,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className="grid size-8 place-items-center rounded-lg border border-border text-muted-foreground transition-colors hover:border-primary/60 hover:text-foreground disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function EmptyCard({ label = "Sem dados neste período." }: { label?: string }) {
  return <p className="py-10 text-center text-sm text-muted-foreground">{label}</p>;
}
