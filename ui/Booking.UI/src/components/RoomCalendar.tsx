import { useEffect, useState } from "react";
import { ReservationStatus, type Reservation, type Room } from "../lib/types";
import { BUSINESS_HOURS_END, BUSINESS_HOURS_START, hourLabel, isSameLocalDay } from "../lib/dates";

const CALENDAR_START_HOUR = BUSINESS_HOURS_START;
const CALENDAR_END_HOUR = BUSINESS_HOURS_END;
const ROW_HEIGHT_PX = 56;
const RAIL_WIDTH_PX = 140;
// A fixed min-width per hour column, not a percentage of the container — percentages on
// absolutely positioned children never grow their (non-absolutely-positioned) parent, so a
// percentage-based cell can only ever be *narrower* than the viewport, never trigger real
// horizontal scrolling. Fixed px cells give the row a genuine content width wider than the
// container once there are enough hours, which is what actually makes overflow-x scroll.
const HOUR_WIDTH_PX = 90;

// Walks from anchorHour toward targetHour and stops at the first occupied hour it meets — so
// dragging a selection can never span across an existing booking. Returns the far end of the
// clamped range (pair it with anchorHour to get [min, max]).
function clampToFreeRange(occupiedHours: Set<number>, anchorHour: number, targetHour: number): number {
  const step = targetHour >= anchorHour ? 1 : -1;
  let clamped = anchorHour;
  for (let h = anchorHour; step > 0 ? h <= targetHour : h >= targetHour; h += step) {
    if (occupiedHours.has(h)) {
      break;
    }
    clamped = h;
  }
  return clamped;
}

interface RoomCalendarProps {
  date: Date;
  rooms: Room[];
  reservations: Reservation[];
  currentUserId: string | null;
  /** endHour is exclusive — one past the last selected hour (a single-hour pick has endHour = startHour + 1). */
  onSlotSelect: (roomId: string, startHour: number, endHour: number) => void;
  onBlockClick: (reservation: Reservation) => void;
}

interface DragState {
  roomId: string;
  anchorHour: number;
  currentHour: number;
}

export function RoomCalendar({ date, rooms, reservations, currentUserId, onSlotSelect, onBlockClick }: RoomCalendarProps) {
  const hours = Array.from({ length: CALENDAR_END_HOUR - CALENDAR_START_HOUR }, (_, i) => CALENDAR_START_HOUR + i);
  const hoursWidthPx = hours.length * HOUR_WIDTH_PX;
  const [drag, setDrag] = useState<DragState | null>(null);

  // Window-level, not per-button — the mouse can be released after leaving the row entirely
  // (or the whole calendar), and a plain onMouseUp on each slot button would miss that.
  useEffect(() => {
    if (!drag) {
      return;
    }

    function finishDrag() {
      setDrag((current) => {
        if (current) {
          const start = Math.min(current.anchorHour, current.currentHour);
          const end = Math.max(current.anchorHour, current.currentHour) + 1;
          onSlotSelect(current.roomId, start, end);
        }
        return null;
      });
    }

    window.addEventListener("mouseup", finishDrag);
    return () => window.removeEventListener("mouseup", finishDrag);
    // Deliberately [drag !== null], not [drag] or [onSlotSelect] — this only needs to
    // (de)register the listener once per drag start/end, not re-subscribe on every hour the
    // mouse enters while dragging or every re-render of the parent's onSlotSelect callback.
  }, [drag !== null]);

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
      <div
        className="grid select-none"
        style={{ gridTemplateColumns: `${RAIL_WIDTH_PX}px ${hoursWidthPx}px`, minWidth: RAIL_WIDTH_PX + hoursWidthPx }}
      >
        {/* Sticky so the room-name rail stays put while the hours track scrolls under it. */}
        <div className="sticky left-0 z-20 border-b border-slate-200 bg-white" />
        <div className="relative border-b border-slate-200" style={{ height: 28 }}>
          {hours.map((hour, i) => (
            // A tick (border-l) at the exact column boundary, with the label offset a couple px
            // to its right — matches the vertical dividers in the room rows below, so the header
            // reads as a ruler instead of loosely floating text.
            <div
              key={hour}
              className="absolute inset-y-0 border-l border-slate-100 pl-1 pt-1.5 text-xs text-slate-400"
              style={{ left: i * HOUR_WIDTH_PX, width: HOUR_WIDTH_PX }}
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

          const roomDrag = drag?.roomId === room.id ? drag : null;
          const dragClampedHour = roomDrag ? clampToFreeRange(occupiedHours, roomDrag.anchorHour, roomDrag.currentHour) : null;
          const dragStart = roomDrag && dragClampedHour !== null ? Math.min(roomDrag.anchorHour, dragClampedHour) : null;
          const dragEnd = roomDrag && dragClampedHour !== null ? Math.max(roomDrag.anchorHour, dragClampedHour) : null;

          return (
            <div key={room.id} className="contents">
              <div
                className="sticky left-0 z-10 flex flex-col justify-center border-t border-slate-100 bg-white px-3"
                style={{ height: ROW_HEIGHT_PX }}
              >
                <div className="truncate text-sm font-medium text-slate-900">{room.name}</div>
                <div className="truncate text-xs text-slate-500">{room.capacity} seats</div>
              </div>

              <div className="relative border-t border-slate-100" style={{ height: ROW_HEIGHT_PX }}>
                {hours.map((hour, i) => (
                  <button
                    key={hour}
                    type="button"
                    disabled={occupiedHours.has(hour)}
                    onMouseDown={() => setDrag({ roomId: room.id, anchorHour: hour, currentHour: hour })}
                    onMouseEnter={() => setDrag((current) => (current && current.roomId === room.id ? { ...current, currentHour: hour } : current))}
                    aria-label={`Book ${room.name} at ${hourLabel(hour)}`}
                    className="absolute inset-y-0 border-l border-slate-100 enabled:hover:bg-slate-50"
                    style={{ left: i * HOUR_WIDTH_PX, width: HOUR_WIDTH_PX }}
                  />
                ))}

                {dragStart !== null && dragEnd !== null && (
                  <div
                    className="pointer-events-none absolute inset-y-0 z-10 border-2 border-dashed border-indigo-400 bg-indigo-200/40"
                    style={{
                      left: (dragStart - CALENDAR_START_HOUR) * HOUR_WIDTH_PX,
                      width: (dragEnd - dragStart + 1) * HOUR_WIDTH_PX,
                    }}
                  />
                )}

                {roomReservations.map((reservation) => {
                  const start = new Date(reservation.startTime);
                  const end = new Date(reservation.endTime);
                  const startFrac = Math.max(start.getHours() + start.getMinutes() / 60, CALENDAR_START_HOUR);
                  const endFrac = Math.min(end.getHours() + end.getMinutes() / 60, CALENDAR_END_HOUR);
                  const left = (startFrac - CALENDAR_START_HOUR) * HOUR_WIDTH_PX;
                  const width = Math.max((endFrac - startFrac) * HOUR_WIDTH_PX, 24);
                  const isMine = reservation.userId === currentUserId;

                  return (
                    <button
                      key={reservation.id}
                      type="button"
                      onClick={() => onBlockClick(reservation)}
                      title={reservation.username}
                      className={`absolute inset-y-2 flex items-center gap-1 overflow-hidden rounded px-1.5 text-left text-xs font-medium text-white ${
                        isMine ? "bg-indigo-500 hover:bg-indigo-600" : "bg-red-500 hover:bg-red-600"
                      }`}
                      style={{ left, width }}
                    >
                      <span
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-medium text-white ${
                          isMine ? "bg-indigo-700" : "bg-red-700"
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
    </div>
  );
}
