import { useEffect, useState } from "react";
import { DoorClosed, Users, Wrench } from "lucide-react";
import { ReservationStatus, type Reservation, type Room } from "../lib/types";
import { BUSINESS_HOURS_END, BUSINESS_HOURS_START, hourLabel, isSameLocalDay } from "../lib/dates";

const CALENDAR_START_HOUR = BUSINESS_HOURS_START;
const CALENDAR_END_HOUR = BUSINESS_HOURS_END;
const ROW_HEIGHT_PX = 60;
const RAIL_WIDTH_PX = 170;
const HOUR_WIDTH_PX = 92;

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

function formatBlockTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

interface RoomCalendarProps {
  date: Date;
  rooms: Room[];
  reservations: Reservation[];
  currentUserId: string | null;
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

  const isDragging = drag !== null;

  useEffect(() => {
    if (!isDragging) {
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
  }, [isDragging, onSlotSelect]);

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

  // Current time calculation for live marker
  const isToday = isSameLocalDay(new Date(), date);
  const now = new Date();
  const nowFrac = now.getHours() + now.getMinutes() / 60;
  const isWithinBusinessHours = nowFrac >= CALENDAR_START_HOUR && nowFrac <= CALENDAR_END_HOUR;
  const currentTimeLeftPx = isToday && isWithinBusinessHours ? (nowFrac - CALENDAR_START_HOUR) * HOUR_WIDTH_PX : null;

  if (rooms.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-border/70 bg-card p-12 text-center text-muted-foreground">
        <DoorClosed className="size-10 text-muted-foreground/50 mb-3" />
        <p className="text-sm font-semibold text-foreground">No rooms configured yet</p>
        <p className="text-xs text-muted-foreground mt-1">An administrator can add rooms to begin scheduling.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
      <div
        className="grid select-none"
        style={{ gridTemplateColumns: `${RAIL_WIDTH_PX}px ${hoursWidthPx}px`, minWidth: RAIL_WIDTH_PX + hoursWidthPx }}
      >
        {/* Sticky room-name rail header */}
        <div className="sticky left-0 z-30 flex items-center border-b border-r border-border bg-card px-4 text-xs font-bold uppercase tracking-wider text-foreground">
          <span>Rooms</span>
        </div>

        {/* Hours ruler track */}
        <div className="relative border-b border-border bg-muted/60 z-20" style={{ height: 36 }}>
          {hours.map((hour, i) => (
            <div
              key={hour}
              className="absolute inset-y-0 flex items-center border-l border-border/70 pl-2 text-xs font-semibold text-muted-foreground"
              style={{ left: i * HOUR_WIDTH_PX, width: HOUR_WIDTH_PX }}
            >
              {hourLabel(hour)}
            </div>
          ))}

          {/* Current time marker dot on header */}
          {currentTimeLeftPx !== null && (
            <div
              className="absolute top-0 bottom-0 z-30 pointer-events-none flex flex-col items-center"
              style={{ left: currentTimeLeftPx }}
            >
              <div className="absolute size-2.5 -mt-1 rounded-full bg-rose-500 shadow-sm shadow-rose-500/50 " />
              <div className="w-0.5 flex-1 bg-rose-500/80" />
            </div>
          )}
        </div>

        {/* Room rows */}
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
              {/* Sticky room rail cell */}
              <div
                className={`sticky left-0 z-30 flex items-center gap-3 border-t border-r border-border px-4 ${
                  !room.isActive ? "bg-muted/70 dark:bg-muted/30" : "bg-card"
                }`}
                style={{ height: ROW_HEIGHT_PX }}
              >
                <div
                  className={`flex size-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                    !room.isActive
                      ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                      : "bg-primary/15 text-primary dark:bg-primary/25"
                  }`}
                >
                  {!room.isActive ? <Wrench className="size-4" /> : (room.name[0]?.toUpperCase() ?? "R")}
                </div>
                <div className="min-w-0 flex-1">
                  <div className={`truncate text-sm font-semibold leading-snug ${!room.isActive ? "text-muted-foreground" : "text-foreground"}`}>
                    {room.name}
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    {!room.isActive ? (
                      <span className="inline-flex items-center gap-1 rounded bg-amber-500/15 px-1.5 py-0.2 text-[10px] font-semibold text-amber-700 dark:text-amber-400">
                        Maintenance
                      </span>
                    ) : (
                      <>
                        <Users className="size-3 shrink-0" />
                        <span>{room.capacity} seats</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Time slot row */}
              <div
                className={`relative border-t border-border ${
                  !room.isActive
                    ? "cursor-not-allowed bg-[repeating-linear-gradient(-45deg,rgba(245,158,11,0.08),rgba(245,158,11,0.08)_12px,rgba(245,158,11,0.02)_12px,rgba(245,158,11,0.02)_24px)] bg-amber-500/5 dark:bg-amber-950/20 select-none"
                    : "bg-card"
                }`}
                style={{ height: ROW_HEIGHT_PX }}
                title={!room.isActive ? `${room.name} is under maintenance. Booking is unavailable.` : undefined}
              >
                {/* Live current time vertical line across this row */}
                {currentTimeLeftPx !== null && (
                  <div
                    className="pointer-events-none absolute inset-y-0 z-20 w-0.5 bg-rose-500/80"
                    style={{ left: currentTimeLeftPx }}
                  />
                )}

                {/* Top border accent for maintenance row */}
                {!room.isActive && (
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-amber-500/50" />
                )}

                {/* Hourly slots */}
                {hours.map((hour, i) => {
                  const isOccupied = occupiedHours.has(hour);

                  if (!room.isActive) {
                    return (
                      <div
                        key={hour}
                        className="pointer-events-none absolute inset-y-0 border-l border-amber-500/20 dark:border-amber-500/10 cursor-not-allowed"
                        style={{ left: i * HOUR_WIDTH_PX, width: HOUR_WIDTH_PX }}
                      />
                    );
                  }

                  return (
                    <button
                      key={hour}
                      type="button"
                      disabled={isOccupied}
                      onMouseDown={() => {
                        setDrag({ roomId: room.id, anchorHour: hour, currentHour: hour });
                      }}
                      onMouseEnter={() => {
                        setDrag((current) => (current && current.roomId === room.id ? { ...current, currentHour: hour } : current));
                      }}
                      title={
                        isOccupied
                          ? `Occupied at ${hourLabel(hour)}`
                          : `Book ${room.name} at ${hourLabel(hour)}`
                      }
                      aria-label={`Book ${room.name} at ${hourLabel(hour)}`}
                      className="absolute inset-y-0 border-l border-border/70 transition-colors enabled:hover:bg-primary/10 focus:outline-none"
                      style={{ left: i * HOUR_WIDTH_PX, width: HOUR_WIDTH_PX }}
                    />
                  );
                })}

                {/* Maintenance overlay & banner */}
                {!room.isActive && (
                  <div
                    className="pointer-events-none absolute inset-0 z-5 flex items-center justify-between px-6 select-none"
                    aria-hidden="true"
                  >
                    <div className="flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/15 dark:bg-amber-950/60 px-3 py-1 text-xs font-bold text-amber-800 dark:text-amber-300 shadow-xs backdrop-blur-xs">
                      <Wrench className="size-3.5 shrink-0" />
                      <span>Under Maintenance — Booking Unavailable</span>
                    </div>
                    {roomReservations.length > 0 && (
                      <span className="text-[11px] font-medium text-amber-700/70 dark:text-amber-400/70 hidden md:inline">
                        Existing reservations displayed below
                      </span>
                    )}
                  </div>
                )}

                {/* Drag selection preview box */}
                {dragStart !== null && dragEnd !== null && (
                  <div
                    className="pointer-events-none absolute inset-y-1.5 z-10 rounded-lg border-2 border-dashed border-primary bg-primary/20 backdrop-blur-xs transition-all shadow-xs"
                    style={{
                      left: (dragStart - CALENDAR_START_HOUR) * HOUR_WIDTH_PX + 2,
                      width: Math.max((dragEnd - dragStart + 1) * HOUR_WIDTH_PX - 4, 10),
                    }}
                  />
                )}

                {/* Reservation block badges */}
                {roomReservations.map((reservation) => {
                  const start = new Date(reservation.startTime);
                  const end = new Date(reservation.endTime);
                  const startFrac = Math.max(start.getHours() + start.getMinutes() / 60, CALENDAR_START_HOUR);
                  const endFrac = Math.min(end.getHours() + end.getMinutes() / 60, CALENDAR_END_HOUR);
                  const left = (startFrac - CALENDAR_START_HOUR) * HOUR_WIDTH_PX + 2;
                  const width = Math.max((endFrac - startFrac) * HOUR_WIDTH_PX - 4, 28);
                  const isMine = reservation.userId === currentUserId;
                  const isAttending = !isMine && Boolean(reservation.attendees?.some((a) => a.userId === currentUserId));

                  return (
                    <button
                      key={reservation.id}
                      type="button"
                      onClick={() => onBlockClick(reservation)}
                      title={
                        isMine
                          ? `Your booking (${formatBlockTime(reservation.startTime)} - ${formatBlockTime(reservation.endTime)})`
                          : isAttending
                          ? `Attending: ${reservation.username}'s meeting (${formatBlockTime(reservation.startTime)} - ${formatBlockTime(reservation.endTime)})`
                          : `${reservation.username} (${formatBlockTime(reservation.startTime)} - ${formatBlockTime(reservation.endTime)})`
                      }
                      className={`group absolute inset-y-2 z-10 flex items-center gap-1.5 overflow-hidden rounded-lg px-2 text-left text-xs font-semibold text-white shadow-sm transition-all hover:scale-[1.01] hover:brightness-105 active:scale-95 focus:outline-none ${
                        !room.isActive ? "ring-2 ring-amber-400/80 shadow-amber-500/20 " : ""
                      }${
                        isMine
                          ? "bg-gradient-to-r from-primary to-indigo-600 shadow-primary/25 ring-1 ring-white/20"
                          : isAttending
                          ? "bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-500 shadow-amber-500/25 ring-1 ring-white/25"
                          : "bg-gradient-to-r from-rose-500 to-red-600 shadow-rose-500/25 ring-1 ring-white/20"
                      }`}
                      style={{ left, width }}
                    >
                      <span
                        className="flex size-4.5 shrink-0 items-center justify-center rounded-full bg-black/20 text-[10px] font-bold text-white shadow-2xs"
                        aria-hidden="true"
                      >
                        {reservation.username[0]?.toUpperCase() ?? "?"}
                      </span>
                      <span className="truncate font-medium">{isMine ? "You" : reservation.username}</span>
                      {isAttending && (
                        <span className="shrink-0 rounded bg-black/25 px-1 py-0.2 text-[9px] font-semibold text-white">
                          Attending
                        </span>
                      )}
                      {!room.isActive && width > 130 && (
                        <span className="shrink-0 rounded bg-black/35 px-1.5 py-0.2 text-[9px] font-semibold text-amber-200 border border-amber-300/40">
                          Maint
                        </span>
                      )}
                      {width > 150 && (
                        <span className="ml-auto hidden text-[10px] opacity-80 xl:inline-block">
                          {formatBlockTime(reservation.startTime)}
                        </span>
                      )}
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
