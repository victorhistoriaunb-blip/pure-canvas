import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Target } from "lucide-react";
import { useFinance } from "@/lib/finance-store";
import { brl, buildDashboard } from "@/lib/analytics";
import { Page } from "@/components/dashboard/page";
import { GoalGauge, Panel } from "@/components/dashboard/charts";
import { KpiCard } from "@/components/dashboard/kpi-card";

export const Route = createFileRoute("/_gated/metas")({
  head: () => ({
    meta: [
      { title: "Metas · PINA Finanças" },
      { name: "description", content: "Defina sua meta financeira e acompanhe o progresso com base nas planilhas importadas." },
      { property: "og:title", content: "Metas · PINA Finanças" },
      { property: "og:description", content: "Meta financeira e progresso automático." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: GoalsPage,
});

function GoalsPage() {
  const { transactions, goal, saveGoal } = useFinance();
  const [name, setName] = useState(goal.name);
  const [target, setTarget] = useState(String(goal.target));

  useEffect(() => {
    setName(goal.name);
    setTarget(String(goal.target));
  }, [goal]);

  const data = buildDashboard(transactions, goal);
  const monthlySavings = data.kpis.savings;
  const remaining = Math.max(goal.target - data.goal.saved, 0);
  const monthsLeft = monthlySavings > 0 ? Math.ceil(remaining / monthlySavings) : null;

  return (
    <Page title="Metas" subtitle="Acompanhe o progresso da sua meta financeira">
      <div className="flex flex-col gap-5">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard index={0} icon={Target} title="Meta" value={brl(goal.target)} hint={goal.name} tone="primary" />
          <KpiCard index={1} icon={Target} title="Acumulado" value={brl(data.goal.saved)} hint="saldo das planilhas" tone="success" />
          <KpiCard index={2} icon={Target} title="Falta" value={brl(remaining)} hint="para concluir" tone="warning" />
          <KpiCard
            index={3}
            icon={Target}
            title="Previsão"
            value={monthsLeft === null ? "—" : `${monthsLeft} mês(es)`}
            hint="no ritmo atual"
            tone="danger"
          />
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          <Panel title="Progresso" description={goal.name} delay={0.1}>
            <GoalGauge progress={data.goal.progress} />
            <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
              <span>{brl(data.goal.saved)} acumulado</span>
              <span>{brl(goal.target)} alvo</span>
            </div>
          </Panel>

          <Panel title="Configurar meta" description="Os cálculos atualizam na hora" delay={0.15} className="xl:col-span-2">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void saveGoal({ name: name.trim() || "Meta", target: Math.max(Number(target) || 0, 0) });
              }}
              className="flex flex-col gap-4 sm:max-w-md"
            >
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Nome da meta</span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={80}
                  className="rounded-xl border border-input bg-background/60 px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/35"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Valor alvo (R$)</span>
                <input
                  value={target}
                  onChange={(e) => setTarget(e.target.value.replace(/[^\d]/g, ""))}
                  inputMode="numeric"
                  className="rounded-xl border border-input bg-background/60 px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/35"
                />
              </label>
              <button
                type="submit"
                className="inline-flex h-11 items-center justify-center rounded-xl bg-[image:var(--gradient-primary)] text-sm font-semibold text-primary-foreground transition-all hover:brightness-110 active:scale-[0.985]"
              >
                Salvar meta
              </button>
            </form>
          </Panel>
        </div>
      </div>
    </Page>
  );
}
