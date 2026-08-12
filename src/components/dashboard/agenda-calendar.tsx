import { ChevronLeft, ChevronRight } from "lucide-react";

export type CalendarDayInfo = {
  date: string; // yyyy-mm-dd
  inMonth: boolean;
  isToday: boolean;
  markers: { color: string; key: string }[];
};

const WEEKDAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

/** Gera as células (6 semanas x 7 dias) de um mês, começando na segunda-feira. */
export function buildMonthGrid(monthKey: string, today: string): CalendarDayInfo[] {
  const [y, m] = monthKey.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1));
  const firstWeekday = (first.getUTCDay() + 6) % 7; // 0 = segunda
  const start = new Date(first);
  start.setUTCDate(first.getUTCDate() - firstWeekday);

  const cells: CalendarDayInfo[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setUTCDate(start.getUTCDate() + i);
    const iso = d.toISOString().slice(0, 10);
    cells.push({
      date: iso,
      inMonth: d.getUTCMonth() === m - 1,
      isToday: iso === today,
      markers: [],
    });
  }
  return cells;
}

export function AgendaCalendar({
  monthLabel,
  days,
  selectedDate,
  onSelectDay,
  onPrevMonth,
  onNextMonth,
  onToday,
}: {
  monthLabel: string;
  days: CalendarDayInfo[];
  selectedDate: string | null;
  onSelectDay: (date: string) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onToday: () => void;
}) {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold capitalize tracking-tight">{monthLabel}</h3>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onToday}
            className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/60 hover:text-foreground"
          >
            Hoje
          </button>
          <button
            type="button"
            onClick={onPrevMonth}
            aria-label="Mês anterior"
            className="grid size-8 place-items-center rounded-lg border border-border text-muted-foreground transition-colors hover:border-primary/60 hover:text-foreground"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            onClick={onNextMonth}
            aria-label="Próximo mês"
            className="grid size-8 place-items-center rounded-lg border border-border text-muted-foreground transition-colors hover:border-primary/60 hover:text-foreground"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:gap-1.5">
        {WEEKDAYS.map((w) => (
          <div key={w} className="py-1">
            {w}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
        {days.map((day) => {
          const dayNum = Number(day.date.slice(8, 10));
          const selected = selectedDate === day.date;
          return (
            <button
              key={day.date}
              type="button"
              onClick={() => onSelectDay(day.date)}
              className={`flex min-h-[3.5rem] flex-col items-center gap-1 rounded-lg border p-1 text-xs transition-colors sm:min-h-[4.5rem] sm:items-start sm:p-1.5 ${
                selected
                  ? "border-primary bg-primary/10"
                  : "border-border/60 hover:border-primary/50"
              } ${day.inMonth ? "" : "opacity-40"}`}
            >
              <span
                className={`inline-flex size-5 items-center justify-center rounded-full text-[11px] ${
                  day.isToday ? "bg-primary text-primary-foreground font-semibold" : "text-foreground"
                }`}
              >
                {dayNum}
              </span>
              {day.markers.length > 0 && (
                <span className="flex flex-wrap items-center justify-center gap-0.5 sm:justify-start">
                  {day.markers.slice(0, 4).map((mk, i) => (
                    <span
                      key={mk.key + i}
                      className="hidden size-1.5 rounded-full sm:inline-block"
                      style={{ backgroundColor: mk.color }}
                    />
                  ))}
                  <span
                    className="size-1.5 rounded-full sm:hidden"
                    style={{ backgroundColor: day.markers[0].color }}
                  />
                  {day.markers.length > 4 && (
                    <span className="hidden text-[9px] text-muted-foreground sm:inline">
                      +{day.markers.length - 4}
                    </span>
                  )}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
