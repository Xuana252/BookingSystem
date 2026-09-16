import { ReservationStatus, type Reservation, type Room } from "../lib/types";
import { addDays, isSameLocalDay } from "../lib/dates";
import { getCurrentUserId } from "../lib/auth";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MAX_CHIPS_PER_DAY = 6;

interface WeekCalendarProps {
  weekStart: Date;
  rooms: Room[];
  reservations: Reservation[];
  onSelectDay: (date: Date) => void;
  onBlockClick?: (reservation: Reservation) => void;
}

export function WeekCalendar({ weekStart, rooms, reservations, onSelectDay, onBlockClick }: WeekCalendarProps) {
  const currentUserId = getCurrentUserId();
  const startDay = addDays(weekStart, -weekStart.getDay()); // Always start on Sunday of the week
  const days = Array.from({ length: 7 }, (_, i) => addDays(startDay, i));
  const roomById = new Map(rooms.map((r) => [r.id, r]));
  const today = new Date();

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm h-full flex flex-col">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b border-border bg-muted/70">
        {WEEKDAY_LABELS.map((label, i) => {
          const date = days[i];
          const isCurrentDay = isSameLocalDay(today, date);
          return (
            <div key={label} className={`px-2 py-3 text-center text-xs tracking-wider flex flex-col items-center gap-1 ${isCurrentDay ? "text-primary font-bold" : "text-foreground font-semibold"}`}>
              <span className="uppercase opacity-70 text-[10px]">{label}</span>
              <span className={`flex size-7 items-center justify-center rounded-full text-sm transition-transform ${
                    isCurrentDay
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "hover:bg-muted"
                  }`}>
                {date.getDate()}
              </span>
            </div>
          );
        })}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 divide-x divide-border flex-1 min-h-[400px]">
        {days.map((date) => {
          const isCurrentDay = isSameLocalDay(today, date);
          const dayReservations = reservations.filter(
            (r) => r.status === ReservationStatus.Confirmed && isSameLocalDay(new Date(r.startTime), date),
          );
          
          // Sort by start time
          dayReservations.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
          
          const shown = dayReservations.slice(0, MAX_CHIPS_PER_DAY);
          const extra = dayReservations.length - shown.length;

          return (
            <div
              key={date.toISOString()}
              className={`group flex flex-col items-start gap-1.5 p-2 transition-colors ${
                isCurrentDay ? "bg-primary/5" : "bg-card"
              }`}
            >
              <button 
                className="w-full text-right text-[10px] font-medium text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 cursor-pointer"
                onClick={() => onSelectDay(date)}
              >
                Go to Day
              </button>
              
              {shown.map((r) => {
                const isMine = r.userId === currentUserId;
                const isAttending = !isMine && Boolean(r.attendees?.some((a) => a.userId === currentUserId));
                const room = roomById.get(r.roomId);
                const isInactive = room ? !room.isActive : false;
                const roomLabel = room?.name ?? "Room";
                
                const formatTime = (iso: string) => new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

                return (
                  <button
                    key={r.id}
                    onClick={() => onBlockClick?.(r)}
                    className={`w-full text-left rounded-md px-2 py-1.5 text-xs font-medium border shadow-sm transition-transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer ${
                      isInactive
                        ? "border-amber-500/40 bg-amber-500/15 text-amber-800 dark:text-amber-300 font-semibold"
                        : isMine
                        ? "border-primary/30 bg-primary/10 text-primary dark:bg-primary/20 dark:text-indigo-300"
                        : isAttending
                        ? "border-amber-500/30 bg-amber-500/15 text-amber-700 dark:bg-amber-500/25 dark:text-amber-300 font-semibold"
                        : "border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-400"
                    }`}
                    title={isInactive ? `${roomLabel} is under maintenance` : undefined}
                  >
                    <div className="truncate font-bold mb-0.5">{roomLabel}</div>
                    <div className="truncate text-[10px] opacity-80">{formatTime(r.startTime)} - {formatTime(r.endTime)}</div>
                    <div className="truncate text-[10px] opacity-80">{isMine ? "You" : r.username} {isAttending ? "(Invited)" : ""}</div>
                  </button>
                );
              })}

              {extra > 0 && (
                <button 
                   onClick={() => onSelectDay(date)}
                   className="mt-2 w-full text-center text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  +{extra} more
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
