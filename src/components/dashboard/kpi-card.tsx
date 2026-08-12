import { motion } from "motion/react";
import { TrendingDown, TrendingUp } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  icon: LucideIcon;
  title: string;
  value: string;
  change?: number;
  hint?: string;
  tone?: "primary" | "success" | "danger" | "warning";
  spark?: { v: number }[];
  index?: number;
};

const TONE = {
  primary: { text: "text-primary", bg: "bg-primary/12", stroke: "var(--color-primary)" },
  success: { text: "text-success", bg: "bg-success/12", stroke: "var(--color-success)" },
  danger: { text: "text-destructive", bg: "bg-destructive/12", stroke: "var(--color-destructive)" },
  warning: { text: "text-warning", bg: "bg-warning/12", stroke: "var(--color-warning)" },
} as const;

export function KpiCard({
  icon: Icon,
  title,
  value,
  change,
  hint,
  tone = "primary",
  spark,
  index = 0,
}: Props) {
  const t = TONE[tone];
  const up = (change ?? 0) >= 0;
  const id = `spark-${title.replace(/\W/g, "")}`;

  return (
    <motion.article
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }}
      className="panel panel-hover group relative overflow-hidden p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {title}
          </p>
          <p className="mt-2 text-2xl font-semibold tracking-tight sm:text-[1.75rem]">{value}</p>
        </div>
        <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl", t.bg, t.text)}>
          <Icon className="size-5" />
        </span>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          {typeof change === "number" && (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold",
                up ? "bg-success/12 text-success" : "bg-destructive/12 text-destructive",
              )}
            >
              {up ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
              {Math.abs(change).toFixed(1)}%
            </span>
          )}
          {hint && <span className="truncate text-xs text-muted-foreground">{hint}</span>}
        </div>

        {spark && (
          <div className="h-9 w-24 shrink-0 opacity-80 transition-opacity duration-300 group-hover:opacity-100">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={spark}>
                <defs>
                  <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={t.stroke} stopOpacity={0.5} />
                    <stop offset="100%" stopColor={t.stroke} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="v"
                  stroke={t.stroke}
                  strokeWidth={2}
                  fill={`url(#${id})`}
                  isAnimationActive
                  animationDuration={900}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </motion.article>
  );
}
