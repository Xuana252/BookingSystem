import { ReservationStatus, type Reservation, type Room } from "../lib/types";
import { isSameLocalDay } from "../lib/dates";

// Mirrors ReservationRuleSettings' defaults (Booking.Api/appsettings.json: 08:00-18:00) — not
// fetched from the Api, since nothing exposes business-hours config over HTTP yet. Worth
// revisiting if that setting ever becomes configurable per-deployment rather than a fixed
// default.
const CALENDAR_START_HOUR = 8;
const CALENDAR_END_HOUR = 18;
const ROW_HEIGHT_PX = 56;
const RAIL_WIDTH_PX = 140;

function hourLabel(hour: number): string {
  const period = hour < 12 ? "AM" : "PM";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}${period}`;
}

interface RoomCalendarProps {
  date: Date;
  rooms: Room[];
  reservations: Reservation[];
  currentUserId: string | null;
  onSlotClick: (roomId: string, hour: number) => void;
  onBlockClick: (reservation: Reservation) => void;
}

export function RoomCalendar({ date, rooms, reservations, currentUserId, onSlotClick, onBlockClick }: RoomCalendarProps) {
  const hours = Array.from({ length: CALENDAR_END_HOUR - CALENDAR_START_HOUR }, (_, i) => CALENDAR_START_HOUR + i);
  const hourWidthPct = 100 / hours.length;

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
    <div className="mt-3 grid overflow-hidden rounded-lg border border-slate-200 bg-white" style={{ gridTemplateColumns: `${RAIL_WIDTH_PX}px 1fr` }}>
      <div className="border-b border-slate-200" />
      <div className="relative border-b border-slate-200" style={{ height: 28 }}>
        {hours.map((hour, i) => (
          // A tick (border-l) at the exact column boundary, with the label offset a couple px
          // to its right — matches the vertical dividers in the room rows below, so the header
          // reads as a ruler instead of loosely floating text. Equal-width columns already made
          // this uniform (verified: every hour is 85.04px apart at 1280px), but without a visible
          // line to anchor each label, "8AM" vs "12PM" being different lengths made the spacing
          // look uneven even though the underlying grid wasn't.
          <div
            key={hour}
            className="absolute inset-y-0 border-l border-slate-100 pl-1 pt-1.5 text-xs text-slate-400"
            style={{ left: `${i * hourWidthPct}%` }}
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
          <div key={room.id} className="contents">
            <div className="flex flex-col justify-center border-t border-slate-100 px-3" style={{ height: ROW_HEIGHT_PX }}>
              <div className="truncate text-sm font-medium text-slate-900">{room.name}</div>
              <div className="truncate text-xs text-slate-500">{room.capacity} seats</div>
            </div>

            <div className="relative border-t border-slate-100" style={{ height: ROW_HEIGHT_PX }}>
              {hours.map((hour, i) => (
                <button
                  key={hour}
                  type="button"
                  disabled={occupiedHours.has(hour)}
                  onClick={() => onSlotClick(room.id, hour)}
                  aria-label={`Book ${room.name} at ${hourLabel(hour)}`}
                  className="absolute inset-y-0 border-l border-slate-100 enabled:hover:bg-slate-50"
                  style={{ left: `${i * hourWidthPct}%`, width: `${hourWidthPct}%` }}
                />
              ))}

              {roomReservations.map((reservation) => {
                const start = new Date(reservation.startTime);
                const end = new Date(reservation.endTime);
                const startFrac = Math.max(start.getHours() + start.getMinutes() / 60, CALENDAR_START_HOUR);
                const endFrac = Math.min(end.getHours() + end.getMinutes() / 60, CALENDAR_END_HOUR);
                const left = (startFrac - CALENDAR_START_HOUR) * hourWidthPct;
                const width = Math.max((endFrac - startFrac) * hourWidthPct, 3);
                const isMine = reservation.userId === currentUserId;

                return (
                  <button
                    key={reservation.id}
                    type="button"
                    onClick={() => onBlockClick(reservation)}
                    title={reservation.username}
                    className={`absolute inset-y-2 flex items-center gap-1 overflow-hidden rounded px-1.5 text-left text-xs ${
                      isMine ? "bg-indigo-100 text-indigo-800 hover:bg-indigo-200" : "bg-violet-50 text-violet-700 hover:bg-violet-100"
                    }`}
                    style={{ left: `${left}%`, width: `${width}%` }}
                  >
                    <span
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-medium ${
                        isMine ? "bg-indigo-200 text-indigo-900" : "bg-violet-200 text-violet-900"
                      }`}
                      aria-hidden="true"
                    >
                      {reservation.username[0]?.toUpperCase() ?? "?"}
                    </span>
                    <span className="truncate">{isMine ? "You" : reservation.username}</span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
