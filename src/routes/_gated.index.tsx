import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { motion } from "motion/react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Lightbulb,
  Percent,
  PiggyBank,
  Target,
  Wallet,
} from "lucide-react";
import { useFinance } from "@/lib/finance-store";
import { availableMonths, brl, buildDashboard, fullMonthLabel } from "@/lib/analytics";
import { Page, Select } from "@/components/dashboard/page";
import { ExportMenu } from "@/components/dashboard/export-menu";
import { KpiCard } from "@/components/dashboard/kpi-card";

import {
  CategoryBars,
  CategoryDonut,
  DailyBars,
  FlowChart,
  GoalGauge,
  Panel,
} from "@/components/dashboard/charts";

export const Route = createFileRoute("/_gated/")({
  head: () => ({
    meta: [
      { title: "Dashboard Financeiro Pessoal · PINA Finanças" },
      {
        name: "description",
        content:
          "Painel visual com saldo, receitas, despesas, economia, categorias, metas e insights das suas planilhas.",
      },
      { property: "og:title", content: "Dashboard Financeiro Pessoal · PINA Finanças" },
      {
        property: "og:description",
        content: "Saldo, receitas, despesas, categorias e metas em um painel moderno.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { transactions, goal, files } = useFinance();
  const months = useMemo(() => availableMonths(transactions), [transactions]);
  const [month, setMonth] = useState<string>("");
  const current = month && months.includes(month) ? month : months[0];
  const data = useMemo(
    () => buildDashboard(transactions, goal, current),
    [transactions, goal, current],
  );

  const { kpis, monthly, categories, daily, insights, recent } = data;
  const spark = (key: "receitas" | "despesas" | "economia") =>
    monthly.slice(-8).map((m) => ({ v: m[key] }));

  const buildReport = () => ({
    title: "Dashboard",
    subtitle: current ? `Visão geral · ${fullMonthLabel(current)}` : "Visão geral",
    filters: [{ label: "Período", value: current ? fullMonthLabel(current) : "Sem dados" }],
    kpis: [
      { label: "Saldo acumulado", value: brl(kpis.balance), hint: "todas as fontes" },
      { label: "Receitas do mês", value: brl(kpis.income) },
      { label: "Despesas do mês", value: brl(kpis.expense) },
      { label: "Economia do mês", value: brl(kpis.savings) },
      { label: "Percentual gasto", value: `${kpis.spentPct.toFixed(1)}%` },
      { label: "Progresso da meta", value: `${data.goal.progress.toFixed(0)}%`, hint: data.goal.name },
    ],
    charts: [
      {
        title: "Receitas x Despesas (12 meses)",
        type: "bar" as const,
        labels: monthly.map((m) => m.label),
        series: [
          { name: "Receitas", values: monthly.map((m) => m.receitas) },
          { name: "Despesas", values: monthly.map((m) => m.despesas) },
        ],
      },
      ...(categories.length > 0
        ? [
            {
              title: "Distribuição por categoria",
              type: "pie" as const,
              labels: categories.slice(0, 8).map((c) => c.name || "Sem categoria"),
              series: [{ name: "Despesas", values: categories.slice(0, 8).map((c) => c.total) }],
            },
          ]
        : []),
    ],
    tables: [
      {
        title: "Lançamentos recentes",
        columns: ["Data", "Descrição", "Categoria", "Forma", "Valor"],
        rows: recent.map((t) => [t.date, t.description, t.category, t.method, brl(t.amount)]),
      },
    ],
    notes: insights,
  });

  return (
    <Page
      title="Dashboard"
      subtitle={current ? `Visão geral · ${fullMonthLabel(current)}` : "Visão geral"}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          {months.length > 0 && (
            <Select
              value={current}
              onChange={setMonth}
              options={months.map((m) => ({ value: m, label: fullMonthLabel(m) }))}
            />
          )}
          <ExportMenu build={buildReport} />
        </div>
      }
    >

      <div className="flex flex-col gap-5">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard index={0} icon={Wallet} title="Saldo acumulado" value={brl(kpis.balance)} change={kpis.balanceChange} hint="todas as planilhas" tone="primary" spark={spark("economia")} />
          <KpiCard index={1} icon={ArrowUpRight} title="Receitas do mês" value={brl(kpis.income)} change={kpis.incomeChange} hint="vs mês anterior" tone="success" spark={spark("receitas")} />
          <KpiCard index={2} icon={ArrowDownRight} title="Despesas do mês" value={brl(kpis.expense)} change={kpis.expenseChange} hint="vs mês anterior" tone="danger" spark={spark("despesas")} />
          <KpiCard index={3} icon={PiggyBank} title="Economia do mês" value={brl(kpis.savings)} change={kpis.savingsChange} hint="vs mês anterior" tone="warning" spark={spark("economia")} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard index={4} icon={Percent} title="Percentual gasto" value={`${kpis.spentPct.toFixed(1)}%`} hint="da receita do mês" tone="danger" />
          <KpiCard index={5} icon={Percent} title="Percentual economizado" value={`${kpis.savedPct.toFixed(1)}%`} hint="da receita do mês" tone="success" />
          <KpiCard index={6} icon={Target} title={data.goal.name} value={brl(data.goal.saved)} hint={`meta ${brl(data.goal.target)}`} tone="primary" />
          <KpiCard index={7} icon={Target} title="Progresso da meta" value={`${data.goal.progress.toFixed(0)}%`} hint="concluído" tone="warning" />
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          <Panel title="Receitas x Despesas" description="Últimos 12 meses" delay={0.1} className="xl:col-span-2">
            <FlowChart data={monthly} />
          </Panel>
          <Panel title="Distribuição por categoria" description="Mês selecionado" delay={0.15}>
            <CategoryDonut data={categories} />
          </Panel>
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          <Panel title="Maiores categorias" description="Gasto acumulado no mês" delay={0.2} className="xl:col-span-2">
            <CategoryBars data={categories} />
          </Panel>
          <Panel title="Meta financeira" description={data.goal.name} delay={0.25}>
            <GoalGauge progress={data.goal.progress} />
            <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
              <span>{brl(data.goal.saved)} acumulado</span>
              <span>{brl(data.goal.target)} alvo</span>
            </div>
          </Panel>
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          <Panel title="Gastos diários" description="Dia a dia do mês selecionado" delay={0.3} className="xl:col-span-2">
            <DailyBars data={daily} />
          </Panel>

          <Panel title="Insights" description="Análises automáticas" delay={0.35}>
            <ul className="flex flex-col gap-2.5">
              {insights.map((text, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + i * 0.06, duration: 0.35 }}
                  className="flex gap-2.5 rounded-xl bg-surface/50 p-3 text-xs leading-relaxed text-muted-foreground transition-colors duration-200 hover:bg-surface/80 hover:text-foreground"
                >
                  <Lightbulb className="mt-0.5 size-3.5 shrink-0 text-warning" />
                  <span>{text}</span>
                </motion.li>
              ))}
            </ul>
          </Panel>
        </div>

        <Panel
          title="Lançamentos recentes"
          description={`${files.length} planilha(s) importada(s) · ${transactions.length} lançamentos`}
          delay={0.4}
        >
          <div className="-mx-2 overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="text-xs tracking-wide text-muted-foreground uppercase">
                  <th className="px-2 py-2 font-medium">Data</th>
                  <th className="px-2 py-2 font-medium">Descrição</th>
                  <th className="px-2 py-2 font-medium">Categoria</th>
                  <th className="px-2 py-2 font-medium">Forma</th>
                  <th className="px-2 py-2 text-right font-medium">Valor</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((t) => (
                  <tr key={t.id} className="border-t border-border/60 transition-colors duration-200 hover:bg-surface/40">
                    <td className="px-2 py-2.5 text-muted-foreground">
                      {new Date(`${t.date}T00:00:00Z`).toLocaleDateString("pt-BR", { timeZone: "UTC" })}
                    </td>
                    <td className="max-w-[220px] truncate px-2 py-2.5">{t.description}</td>
                    <td className="px-2 py-2.5 text-muted-foreground">{t.category}</td>
                    <td className="px-2 py-2.5 text-muted-foreground">{t.method}</td>
                    <td className={`px-2 py-2.5 text-right font-medium ${t.type === "receita" ? "text-success" : "text-destructive"}`}>
                      {t.type === "receita" ? "+" : "−"}
                      {brl(t.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </Page>
  );
}
