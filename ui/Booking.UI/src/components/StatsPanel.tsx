import { ReservationStatus, type Reservation, type Room } from "../lib/types";
import { addDays, startOfDay } from "../lib/dates";

const HISTORY_LIMIT = 5;

interface StatsPanelProps {
  rooms: Room[];
  reservations: Reservation[];
  currentUserId: string | null;
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 text-xl font-semibold text-indigo-700">{value}</div>
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
    <aside className="w-full shrink-0 space-y-4 lg:w-72">
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Rooms" value={rooms.length} />
        <StatCard label="Today" value={todaysBookings} />
        <StatCard label="Your upcoming" value={myUpcoming} />
        <StatCard label="Your history" value={myReservations.length} />
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-900">Your history</h2>
        {myHistory.length === 0 ? (
          <p className="mt-2 text-sm text-slate-400">No reservations yet.</p>
        ) : (
          <ul className="mt-2 space-y-3">
            {myHistory.map((r) => (
              <li key={r.id} className="text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-medium text-slate-900">{roomNameById.get(r.roomId) ?? "Room"}</span>
                  <span
                    className={`shrink-0 rounded px-1.5 py-0.5 text-[11px] ${
                      r.status === ReservationStatus.Confirmed ? "bg-indigo-50 text-indigo-700" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {r.status === ReservationStatus.Confirmed ? "Confirmed" : "Cancelled"}
                  </span>
                </div>
                <div className="text-xs text-slate-500">
                  {new Date(r.startTime).toLocaleDateString(undefined, { month: "short", day: "numeric" })} ·{" "}
                  {new Date(r.startTime).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
