import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { FileQuestion, Wallet, ArrowUpRight, ArrowDownRight, PiggyBank } from "lucide-react";
import { useFinance } from "@/lib/finance-store";
import { Page } from "@/components/dashboard/page";
import { Panel, FlowChart, CategoryDonut, CategoryBars, DailyBars, GoalGauge } from "@/components/dashboard/charts";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { TransactionsTable } from "@/components/dashboard/transactions-table";
import { RecordCard } from "@/components/dashboard/record-card";
import { availableMonths, brl, buildDashboard } from "@/lib/analytics";
import type { CustomBlock } from "@/lib/finance.types";

export const Route = createFileRoute("/_gated/pagina/$id")({
  head: () => ({
    meta: [
      { title: "Aba personalizada · PINA Finanças" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CustomPageRoute,
});

function BlockRenderer({ block, data }: { block: CustomBlock; data: ReturnType<typeof buildDashboard> }) {
  switch (block.kind) {
    case "texto":
      return (
        <Panel title={block.title}>
          <p className="text-sm whitespace-pre-wrap text-muted-foreground">{block.text || "Sem conteúdo."}</p>
        </Panel>
      );
    case "kpis":
      return (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard index={0} icon={Wallet} title="Saldo acumulado" value={brl(data.kpis.balance)} change={data.kpis.balanceChange} tone="primary" />
          <KpiCard index={1} icon={ArrowUpRight} title="Receitas do mês" value={brl(data.kpis.income)} change={data.kpis.incomeChange} tone="success" />
          <KpiCard index={2} icon={ArrowDownRight} title="Despesas do mês" value={brl(data.kpis.expense)} change={data.kpis.expenseChange} tone="danger" />
          <KpiCard index={3} icon={PiggyBank} title="Economia do mês" value={brl(data.kpis.savings)} change={data.kpis.savingsChange} tone="warning" />
        </div>
      );
    case "fluxo":
      return (
        <Panel title={block.title} description="Últimos 12 meses">
          <FlowChart data={data.monthly} />
        </Panel>
      );
    case "categorias":
      return (
        <div className="grid gap-4 xl:grid-cols-2">
          <Panel title={block.title} description="Distribuição">
            <CategoryDonut data={data.categories} />
          </Panel>
          <Panel title="Maiores categorias" description="Gasto acumulado">
            <CategoryBars data={data.categories} />
          </Panel>
        </div>
      );
    case "tabela":
      return (
        <Panel title={block.title}>
          <TransactionsTable rows={data.recent} editable={false} />
        </Panel>
      );
    case "cards":
      return (
        <Panel title={block.title}>
          <div className="flex flex-col gap-3">
            {data.recent.slice(0, 6).map((t) => (
              <RecordCard key={t.id} t={t} editable={false} />
            ))}
          </div>
        </Panel>
      );
    case "vencimentos":
      return (
        <Panel title={block.title} description="Próximos vencimentos">
          <DailyBars data={data.daily} />
        </Panel>
      );
    case "insights":
      return (
        <Panel title={block.title} description="Análises automáticas">
          <ul className="flex flex-col gap-2.5">
            {data.insights.map((text, i) => (
              <li key={i} className="rounded-xl bg-surface/50 p-3 text-xs leading-relaxed text-muted-foreground">
                {text}
              </li>
            ))}
          </ul>
        </Panel>
      );
    case "meta":
      return (
        <Panel title={block.title} description={data.goal.name}>
          <GoalGauge progress={data.goal.progress} />
          <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>{brl(data.goal.saved)} acumulado</span>
            <span>{brl(data.goal.target)} alvo</span>
          </div>
        </Panel>
      );
    default:
      return null;
  }
}

function CustomPageRoute() {
  const { id } = Route.useParams();
  const { settings, transactions, goal } = useFinance();
  const page = useMemo(() => settings.pages.find((p) => p.id === id), [settings.pages, id]);
  const months = useMemo(() => availableMonths(transactions), [transactions]);
  const [month] = useState("");
  const current = month && months.includes(month) ? month : months[0];
  const data = useMemo(() => buildDashboard(transactions, goal, current), [transactions, goal, current]);

  if (!page) {
    return (
      <Page title="Aba não encontrada" requireData={false}>
        <div className="panel grid min-h-[50vh] place-items-center p-8 text-center">
          <div className="max-w-md">
            <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-primary/15 text-primary">
              <FileQuestion className="size-6" />
            </span>
            <h2 className="mt-4 text-lg font-semibold tracking-tight">Esta aba não existe</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Crie ou renomeie abas personalizadas em Configurações → Abas personalizadas.
            </p>
            <Link
              to="/configuracoes"
              className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-[image:var(--gradient-primary)] px-5 text-sm font-semibold text-primary-foreground transition-all hover:brightness-110"
            >
              Ir para Configurações
            </Link>
          </div>
        </div>
      </Page>
    );
  }

  return (
    <Page title={page.name} subtitle="Aba personalizada" requireData={false}>
      {page.blocks.length === 0 ? (
        <div className="panel grid min-h-[40vh] place-items-center p-8 text-center text-sm text-muted-foreground">
          Nenhum bloco configurado ainda. Adicione blocos em Configurações → Abas personalizadas.
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {page.blocks.map((block) => (
            <BlockRenderer key={block.id} block={block} data={data} />
          ))}
        </div>
      )}
    </Page>
  );
}
