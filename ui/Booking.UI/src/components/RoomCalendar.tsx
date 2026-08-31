import { ReservationStatus, type Reservation, type Room } from "../lib/types";

// Mirrors ReservationRuleSettings' defaults (Booking.Api/appsettings.json: 08:00-18:00) — not
// fetched from the Api, since nothing exposes business-hours config over HTTP yet. Worth
// revisiting if that setting ever becomes configurable per-deployment rather than a fixed
// default.
const CALENDAR_START_HOUR = 8;
const CALENDAR_END_HOUR = 18;
const ROW_HEIGHT_PX = 48;

function isSameLocalDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function hourLabel(hour: number): string {
  const period = hour < 12 ? "AM" : "PM";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour} ${period}`;
}

interface RoomCalendarProps {
  date: Date;
  rooms: Room[];
  reservations: Reservation[];
  currentUserId: string | null;
  cancellingId: string | null;
  onSlotClick: (roomId: string, hour: number) => void;
  onCancel: (reservationId: string) => void;
}

export function RoomCalendar({
  date,
  rooms,
  reservations,
  currentUserId,
  cancellingId,
  onSlotClick,
  onCancel,
}: RoomCalendarProps) {
  const hours = Array.from({ length: CALENDAR_END_HOUR - CALENDAR_START_HOUR }, (_, i) => CALENDAR_START_HOUR + i);
  const dayHeight = hours.length * ROW_HEIGHT_PX;

  const reservationsByRoom = new Map<string, Reservation[]>();
  for (const reservation of reservations) {
    if (reservation.status !== ReservationStatus.Confirmed) {
      continue;
    }
    const start = new Date(reservation.startTime);
    if (!isSameLocalDay(start, date)) {
      continue;
    }
    const list = reservationsByRoom.get(reservation.roomId) ?? [];
    list.push(reservation);
    reservationsByRoom.set(reservation.roomId, list);
  }

  if (rooms.length === 0) {
    return <p className="mt-3 text-sm text-slate-500">No rooms yet.</p>;
  }

  return (
    <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <div className="grid min-w-[640px]" style={{ gridTemplateColumns: `56px repeat(${rooms.length}, minmax(120px, 1fr))` }}>
        <div className="border-b border-slate-200" />
        {rooms.map((room) => (
          <div key={room.id} className="border-b border-l border-slate-200 px-2 py-2">
            <div className="truncate text-sm font-medium text-slate-900">{room.name}</div>
            <div className="truncate text-xs text-slate-500">{room.capacity} seats</div>
          </div>
        ))}

        <div className="relative" style={{ height: dayHeight }}>
          {hours.map((hour, i) => (
            <div
              key={hour}
              className="absolute inset-x-0 border-t border-slate-100 pr-2 text-right text-xs text-slate-400"
              style={{ top: i * ROW_HEIGHT_PX }}
            >
              {hourLabel(hour)}
            </div>
          ))}
        </div>

        {rooms.map((room) => {
          const roomReservations = reservationsByRoom.get(room.id) ?? [];
          const occupiedHours = new Set<number>();
          for (const reservation of roomReservations) {
            const startHour = new Date(reservation.startTime).getHours();
            const endLocal = new Date(reservation.endTime);
            const endHour = endLocal.getHours() + (endLocal.getMinutes() > 0 ? 1 : 0);
            for (let h = startHour; h < endHour; h++) {
              occupiedHours.add(h);
            }
          }

          return (
            <div key={room.id} className="relative border-l border-slate-200" style={{ height: dayHeight }}>
              {hours.map((hour, i) => (
                <button
                  key={hour}
                  type="button"
                  disabled={occupiedHours.has(hour)}
                  onClick={() => onSlotClick(room.id, hour)}
                  aria-label={`Book ${room.name} at ${hourLabel(hour)}`}
                  className="absolute inset-x-0 border-t border-slate-100 enabled:hover:bg-slate-50"
                  style={{ top: i * ROW_HEIGHT_PX, height: ROW_HEIGHT_PX }}
                />
              ))}

              {roomReservations.map((reservation) => {
                const start = new Date(reservation.startTime);
                const end = new Date(reservation.endTime);
                const startFrac = Math.max(start.getHours() + start.getMinutes() / 60, CALENDAR_START_HOUR);
                const endFrac = Math.min(end.getHours() + end.getMinutes() / 60, CALENDAR_END_HOUR);
                const top = (startFrac - CALENDAR_START_HOUR) * ROW_HEIGHT_PX;
                const height = Math.max((endFrac - startFrac) * ROW_HEIGHT_PX - 2, 16);
                const isMine = reservation.userId === currentUserId;

                return (
                  <button
                    key={reservation.id}
                    type="button"
                    disabled={!isMine || cancellingId === reservation.id}
                    onClick={() => isMine && onCancel(reservation.id)}
                    title={
                      isMine
                        ? `Your booking, ${start.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}–${end.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })} — click to cancel`
                        : `Booked, ${start.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}–${end.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`
                    }
                    className={`absolute inset-x-1 overflow-hidden rounded px-1.5 py-1 text-left text-xs ${
                      isMine
                        ? "cursor-pointer bg-blue-100 text-blue-800 hover:bg-blue-200 disabled:cursor-wait"
                        : "cursor-default bg-slate-200 text-slate-600"
                    }`}
                    style={{ top, height }}
                  >
                    {isMine ? "Your booking" : "Booked"}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
