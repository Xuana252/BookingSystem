import { ReservationStatus, type Reservation, type Room } from "../lib/types";
import { addDays, isSameLocalDay, startOfMonth } from "../lib/dates";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MAX_CHIPS_PER_DAY = 2;

interface MonthCalendarProps {
  month: Date;
  rooms: Room[];
  reservations: Reservation[];
  onSelectDay: (date: Date) => void;
}

export function MonthCalendar({ month, rooms, reservations, onSelectDay }: MonthCalendarProps) {
  const firstOfMonth = startOfMonth(month);
  const gridStart = addDays(firstOfMonth, -firstOfMonth.getDay());
  const days = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  const roomNameById = new Map(rooms.map((r) => [r.id, r.name]));
  const today = new Date();

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b border-border bg-muted/70">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="px-2 py-2.5 text-center text-xs font-bold uppercase tracking-wider text-foreground">
            {label}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 divide-x divide-y divide-border">
        {days.map((date) => {
          const inMonth = date.getMonth() === month.getMonth();
          const isCurrentDay = isSameLocalDay(today, date);
          const dayReservations = reservations.filter(
            (r) => r.status === ReservationStatus.Confirmed && isSameLocalDay(new Date(r.startTime), date),
          );
          const shown = dayReservations.slice(0, MAX_CHIPS_PER_DAY);
          const extra = dayReservations.length - shown.length;

          return (
            <button
              key={date.toISOString()}
              type="button"
              onClick={() => onSelectDay(date)}
              className={`group flex min-h-[105px] flex-col items-start gap-1 p-2 text-left transition-colors focus:outline-none ${
                inMonth
                  ? "bg-card hover:bg-muted/40"
                  : "bg-muted/40 hover:bg-muted/60 text-muted-foreground/40"
              } ${isCurrentDay ? "ring-2 ring-primary ring-inset" : ""}`}
            >
              <div className="flex w-full items-center justify-between">
                <span
                  className={`flex size-6 items-center justify-center rounded-full text-xs font-medium transition-transform group-hover:scale-110 ${
                    isCurrentDay
                      ? "bg-primary font-bold text-primary-foreground shadow-xs"
                      : inMonth
                        ? "text-foreground font-semibold"
                        : "text-muted-foreground/50"
                  }`}
                >
                  {date.getDate()}
                </span>
                {dayReservations.length > 0 && (
                  <span className="size-1.5 rounded-full bg-primary" />
                )}
              </div>

              {shown.map((r) => (
                <span
                  key={r.id}
                  className="w-full truncate rounded-md border border-primary/20 bg-primary/10 px-1.5 py-0.5 text-[11px] font-medium text-primary dark:bg-primary/20 dark:text-indigo-300"
                >
                  {roomNameById.get(r.roomId) ?? "Room"}
                </span>
              ))}

              {extra > 0 && (
                <span className="mt-auto text-[10px] font-semibold text-muted-foreground hover:text-foreground">
                  +{extra} more
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
