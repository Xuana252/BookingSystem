import type { ReactNode } from "react";
import { Building2, Calendar, CalendarCheck, CalendarX, Clock, History } from "lucide-react";
import { ReservationStatus, type Reservation, type Room } from "../lib/types";
import { addDays, startOfDay } from "../lib/dates";
import { Badge } from "./ui/badge";

const HISTORY_LIMIT = 5;

interface StatsPanelProps {
  rooms: Room[];
  reservations: Reservation[];
  currentUserId: string | null;
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: ReactNode;
}) {
  return (
    <div className="group rounded-xl border border-border bg-card p-3.5 shadow-sm transition-all hover:border-primary/50 hover:shadow-md">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        {icon}
      </div>
      <div className="mt-2 text-2xl font-bold tracking-tight text-foreground">{value}</div>
    </div>
  );
}

export function StatsPanel({ rooms, reservations, currentUserId }: StatsPanelProps) {
  const now = new Date();
  const today = startOfDay(now);
  const tomorrow = addDays(today, 1);

  const todaysBookings = reservations.filter(
    (r) => r.status === ReservationStatus.Confirmed && new Date(r.startTime) >= today && new Date(r.startTime) < tomorrow,
  ).length;

  const myReservations = reservations.filter((r) => r.userId === currentUserId);
  const myUpcoming = myReservations.filter((r) => r.status === ReservationStatus.Confirmed && new Date(r.endTime) >= now).length;

  const myHistory = [...myReservations]
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
    .slice(0, HISTORY_LIMIT);

  const roomNameById = new Map(rooms.map((r) => [r.id, r.name]));

  return (
    <aside className="w-full shrink-0 space-y-4 lg:w-76">
      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="Total Rooms"
          value={rooms.length}
          icon={
            <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Building2 className="size-3.5" />
            </div>
          }
        />
        <StatCard
          label="Today's Bookings"
          value={todaysBookings}
          icon={
            <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CalendarCheck className="size-3.5" />
            </div>
          }
        />
        <StatCard
          label="Your Upcoming"
          value={myUpcoming}
          icon={
            <div className="flex size-7 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">
              <Clock className="size-3.5" />
            </div>
          }
        />
        <StatCard
          label="Your Total"
          value={myReservations.length}
          icon={
            <div className="flex size-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <History className="size-3.5" />
            </div>
          }
        />
      </div>

      {/* History List */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <History className="size-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Recent Bookings</h2>
          </div>
          {myHistory.length > 0 && (
            <span className="text-[11px] font-medium text-muted-foreground">Last {myHistory.length}</span>
          )}
        </div>

        {myHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground">
            <CalendarX className="size-8 text-muted-foreground/40 mb-2" />
            <p className="text-xs font-medium">No bookings yet</p>
            <p className="text-[11px] text-muted-foreground/70 mt-0.5">Your past reservations will show here.</p>
          </div>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {myHistory.map((r) => (
              <li key={r.id} className="py-2.5 first:pt-0 last:pb-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-xs font-semibold text-foreground">
                    {roomNameById.get(r.roomId) ?? "Room"}
                  </span>
                  <Badge
                    variant={r.status === ReservationStatus.Confirmed ? "success" : "secondary"}
                    className="text-[10px] px-1.5 py-0 h-4 shrink-0 font-medium"
                  >
                    {r.status === ReservationStatus.Confirmed ? "Confirmed" : "Cancelled"}
                  </Badge>
                </div>
                <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Calendar className="size-3 text-muted-foreground/70" />
                  <span>
                    {new Date(r.startTime).toLocaleDateString(undefined, { month: "short", day: "numeric" })} ·{" "}
                    {new Date(r.startTime).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
