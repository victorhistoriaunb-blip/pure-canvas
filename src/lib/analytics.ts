import type {
  CategoryTotal,
  DailyPoint,
  DashboardData,
  Goal,
  MonthlyPoint,
  Transaction,
} from "./finance.types";

export const MONTH_LABELS = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
];

export const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export const brl2 = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const monthKey = (d: string) => d.slice(0, 7);
export const sum = (rows: Transaction[]) => rows.reduce((t, r) => t + r.amount, 0);
export const pct = (curr: number, prev: number) => (prev === 0 ? 0 : ((curr - prev) / prev) * 100);

export function monthLabel(key: string) {
  const [y, m] = key.split("-");
  return `${MONTH_LABELS[Number(m) - 1]}/${y}`;
}

export function fullMonthLabel(key: string) {
  return new Date(`${key}-01T00:00:00Z`).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function shiftMonth(key: string, delta: number) {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function availableMonths(tx: Transaction[]) {
  return [...new Set(tx.map((t) => monthKey(t.date)))].sort().reverse();
}

export function availableYears(tx: Transaction[]) {
  return [...new Set(tx.map((t) => t.date.slice(0, 4)))].sort().reverse();
}

export function categoriesOf(tx: Transaction[], type: Transaction["type"] = "despesa"): CategoryTotal[] {
  const rows = tx.filter((t) => t.type === type);
  const total = sum(rows);
  const map = new Map<string, number>();
  for (const t of rows) map.set(t.category, (map.get(t.category) ?? 0) + t.amount);
  return [...map.entries()]
    .map(([name, value]) => ({
      name,
      total: Math.round(value),
      share: total === 0 ? 0 : (value / total) * 100,
    }))
    .sort((a, b) => b.total - a.total);
}

export function monthlySeries(tx: Transaction[], months: string[]): MonthlyPoint[] {
  return months.map((k) => {
    const rows = tx.filter((t) => monthKey(t.date) === k);
    const rec = sum(rows.filter((t) => t.type === "receita"));
    const desp = sum(rows.filter((t) => t.type === "despesa"));
    return {
      key: k,
      label: MONTH_LABELS[Number(k.slice(5, 7)) - 1],
      receitas: Math.round(rec),
      despesas: Math.round(desp),
      economia: Math.round(rec - desp),
    };
  });
}

export function dailySeries(tx: Transaction[], month: string): DailyPoint[] {
  const [y, m] = month.split("-").map(Number);
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const out: DailyPoint[] = [];
  for (let d = 1; d <= days; d++) {
    const key = `${month}-${String(d).padStart(2, "0")}`;
    const rows = tx.filter((t) => t.date === key);
    out.push({
      day: String(d).padStart(2, "0"),
      despesas: Math.round(sum(rows.filter((r) => r.type === "despesa"))),
      receitas: Math.round(sum(rows.filter((r) => r.type === "receita"))),
    });
  }
  return out;
}

/** Semana ISO (segunda a domingo) que contém a data. */
export function weekRange(dateISO: string) {
  const d = new Date(`${dateISO}T00:00:00Z`);
  const day = (d.getUTCDay() + 6) % 7;
  const start = new Date(d);
  start.setUTCDate(d.getUTCDate() - day);
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
}

export function inRange(tx: Transaction[], start: string, end: string) {
  return tx.filter((t) => t.date >= start && t.date <= end);
}

export function totals(rows: Transaction[]) {
  const receitas = sum(rows.filter((t) => t.type === "receita"));
  const despesas = sum(rows.filter((t) => t.type === "despesa"));
  return { receitas, despesas, economia: receitas - despesas, count: rows.length };
}

export function buildDashboard(tx: Transaction[], goal: Goal, current?: string): DashboardData {
  const months = availableMonths(tx);
  const currentKey = current ?? months[0] ?? new Date().toISOString().slice(0, 7);
  const previousKey = shiftMonth(currentKey, -1);

  const inMonth = (key: string, type: Transaction["type"]) =>
    tx.filter((t) => monthKey(t.date) === key && t.type === type);

  const income = sum(inMonth(currentKey, "receita"));
  const expense = sum(inMonth(currentKey, "despesa"));
  const prevIncome = sum(inMonth(previousKey, "receita"));
  const prevExpense = sum(inMonth(previousKey, "despesa"));
  const savings = income - expense;
  const prevSavings = prevIncome - prevExpense;
  const balance =
    sum(tx.filter((t) => t.type === "receita")) - sum(tx.filter((t) => t.type === "despesa"));

  const keys: string[] = [];
  for (let i = 11; i >= 0; i--) keys.push(shiftMonth(currentKey, -i));
  const monthly = monthlySeries(tx, keys);

  const categories = categoriesOf(tx.filter((t) => monthKey(t.date) === currentKey));
  const daily = dailySeries(tx, currentKey);

  const saved = Math.max(balance, 0);
  const biggest = inMonth(currentKey, "despesa").sort((a, b) => b.amount - a.amount)[0];
  const topCategory = categories[0];
  const growth = categories
    .map((c) => ({
      name: c.name,
      change: pct(c.total, sum(inMonth(previousKey, "despesa").filter((t) => t.category === c.name))),
    }))
    .sort((a, b) => b.change - a.change);

  const insights = [
    prevExpense > 0
      ? expense < prevExpense
        ? `Você gastou ${Math.abs(pct(expense, prevExpense)).toFixed(0)}% menos que no mês anterior.`
        : `Seus gastos subiram ${pct(expense, prevExpense).toFixed(0)}% em relação ao mês anterior.`
      : "Importe mais de um mês de dados para comparar a evolução dos gastos.",
    topCategory ? `${topCategory.name} representa ${topCategory.share.toFixed(0)}% dos gastos do mês.` : "",
    growth[0] && Number.isFinite(growth[0].change) && growth[0].change > 0
      ? `${growth[0].name} foi a categoria que mais cresceu (${growth[0].change.toFixed(0)}%).`
      : "",
    growth.length > 1 && growth[growth.length - 1].change < 0
      ? `${growth[growth.length - 1].name} teve redução de ${Math.abs(growth[growth.length - 1].change).toFixed(0)}%.`
      : "",
    biggest ? `Seu maior gasto do mês foi ${biggest.description} (${brl2(biggest.amount)}).` : "",
    income > 0
      ? `Você economizou ${((savings / income) * 100).toFixed(0)}% da receita deste mês.`
      : "",
    `Economia acumulada de ${brl(monthly.reduce((t, m) => t + m.economia, 0))} nos últimos 12 meses.`,
  ].filter(Boolean);

  return {
    period: { current: currentKey, previous: previousKey },
    kpis: {
      balance: Math.round(balance),
      income: Math.round(income),
      expense: Math.round(expense),
      savings: Math.round(savings),
      spentPct: income === 0 ? 0 : (expense / income) * 100,
      savedPct: income === 0 ? 0 : (savings / income) * 100,
      incomeChange: pct(income, prevIncome),
      expenseChange: pct(expense, prevExpense),
      savingsChange: pct(savings, prevSavings),
      balanceChange: pct(balance, balance - savings),
    },
    goal: {
      name: goal.name,
      target: goal.target,
      saved: Math.round(saved),
      progress: goal.target > 0 ? Math.min((saved / goal.target) * 100, 100) : 0,
    },
    monthly,
    categories,
    daily,
    insights,
    recent: [...tx].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 8),
    source: "",
  };
}
