import { motion } from "motion/react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const CHART_COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
  "var(--color-chart-6)",
];

const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

const tooltipStyle = {
  backgroundColor: "var(--color-popover)",
  border: "1px solid var(--color-border)",
  borderRadius: "12px",
  color: "var(--color-popover-foreground)",
  fontSize: "12px",
  boxShadow: "var(--shadow-card)",
};

export function Panel({
  title,
  description,
  children,
  delay = 0,
  className = "",
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      className={`panel panel-hover p-5 ${className}`}
    >
      <header className="mb-4 min-w-0">
        <h2 className="truncate text-sm font-semibold tracking-tight">{title}</h2>
        {description && (
          <p className="truncate text-xs text-muted-foreground">{description}</p>
        )}
      </header>
      {children}
    </motion.section>
  );
}

export function FlowChart({
  data,
}: {
  data: { label: string; receitas: number; despesas: number }[];
}) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ left: -18, right: 6, top: 6 }}>
          <defs>
            <linearGradient id="gRec" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-chart-3)" stopOpacity={0.45} />
              <stop offset="100%" stopColor="var(--color-chart-3)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gDes" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.45} />
              <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={70}
            tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
            tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`}
          />
          <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => brl(Number(v))} />
          <Legend wrapperStyle={{ fontSize: 12, color: "var(--color-muted-foreground)" }} />
          <Area
            type="monotone"
            dataKey="receitas"
            name="Receitas"
            stroke="var(--color-chart-3)"
            strokeWidth={2}
            fill="url(#gRec)"
            animationDuration={1100}
          />
          <Area
            type="monotone"
            dataKey="despesas"
            name="Despesas"
            stroke="var(--color-chart-1)"
            strokeWidth={2}
            fill="url(#gDes)"
            animationDuration={1300}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CategoryDonut({ data }: { data: { name: string; total: number }[] }) {
  const top = data.slice(0, 6);
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={top}
            dataKey="total"
            nameKey="name"
            innerRadius="55%"
            outerRadius="82%"
            paddingAngle={3}
            stroke="none"
            animationDuration={1000}
          >
            {top.map((_, i) => (
              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => brl(Number(v))} />
          <Legend
            wrapperStyle={{ fontSize: 11, color: "var(--color-muted-foreground)" }}
            iconType="circle"
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CategoryBars({ data }: { data: { name: string; total: number }[] }) {
  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data.slice(0, 8)} layout="vertical" margin={{ left: 8, right: 16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
          <XAxis
            type="number"
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
            tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={96}
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
          />
          <Tooltip
            cursor={{ fill: "var(--color-surface)", opacity: 0.35 }}
            contentStyle={tooltipStyle}
            formatter={(v: number) => brl(Number(v))}
          />
          <Bar dataKey="total" name="Total" radius={[0, 8, 8, 0]} animationDuration={1000}>
            {data.slice(0, 8).map((_, i) => (
              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DailyBars({ data }: { data: { day: string; despesas: number }[] }) {
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ left: -20, right: 6 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
          <XAxis
            dataKey="day"
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--color-muted-foreground)", fontSize: 10 }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={62}
            tick={{ fill: "var(--color-muted-foreground)", fontSize: 10 }}
          />
          <Tooltip
            cursor={{ fill: "var(--color-surface)", opacity: 0.35 }}
            contentStyle={tooltipStyle}
            formatter={(v: number) => brl(Number(v))}
          />
          <Bar
            dataKey="despesas"
            name="Despesas"
            fill="var(--color-chart-2)"
            radius={[6, 6, 0, 0]}
            animationDuration={900}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function GoalGauge({ progress }: { progress: number }) {
  const data = [{ name: "meta", value: progress, fill: "var(--color-chart-1)" }];
  return (
    <div className="relative h-52 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart
          data={data}
          innerRadius="72%"
          outerRadius="100%"
          startAngle={210}
          endAngle={-30}
        >
          <RadialBar dataKey="value" background={{ fill: "var(--color-surface)" }} cornerRadius={12} animationDuration={1200} />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 grid place-items-center">
        <div className="text-center">
          <p className="text-3xl font-semibold tracking-tight">{progress.toFixed(0)}%</p>
          <p className="text-xs text-muted-foreground">concluído</p>
        </div>
      </div>
    </div>
  );
}
