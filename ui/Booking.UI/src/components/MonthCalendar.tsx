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

  return (
    <div className="mt-3 overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="px-2 py-2 text-center text-xs font-medium text-slate-500">
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {days.map((date) => {
          const inMonth = date.getMonth() === month.getMonth();
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
              className={`flex min-h-[92px] flex-col items-start gap-1 border-b border-r border-slate-100 p-2 text-left hover:bg-slate-50 ${
                inMonth ? "" : "bg-slate-50/50"
              }`}
            >
              <span className={`text-xs ${inMonth ? "text-slate-700" : "text-slate-300"}`}>{date.getDate()}</span>
              {shown.map((r) => (
                <span key={r.id} className="w-full truncate rounded bg-indigo-50 px-1.5 py-0.5 text-[11px] text-indigo-700">
                  {roomNameById.get(r.roomId) ?? "Room"}
                </span>
              ))}
              {extra > 0 && <span className="text-[11px] text-slate-400">+{extra} more</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
