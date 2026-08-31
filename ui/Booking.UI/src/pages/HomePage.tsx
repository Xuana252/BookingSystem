import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { getCurrentUserId, isAuthenticated } from "../lib/auth";
import { ApiError } from "../lib/apiClient";
import { cancelReservation, createReservation, getReservations, getRooms } from "../lib/api";
import type { Reservation, Room } from "../lib/types";
import { useReservationHub } from "../hooks/useReservationHub";
import { RoomCalendar } from "../components/RoomCalendar";
import { BookingFormModal } from "../components/BookingFormModal";
import { BookingDetailModal } from "../components/BookingDetailModal";

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function toDatetimeLocalValue(date: Date, hour: number): string {
  const d = new Date(date);
  d.setHours(hour, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function HomePage() {
  const authenticated = isAuthenticated();
  const currentUserId = getCurrentUserId();
  const { onRoomAvailabilityChanged } = useReservationHub();

  const [rooms, setRooms] = useState<Room[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(() => startOfDay(new Date()));

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [roomId, setRoomId] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [roomsResult, reservationsResult] = await Promise.all([getRooms(), getReservations()]);
      setRooms(roomsResult);
      setReservations(reservationsResult);
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : "Could not load rooms and reservations.");
    }
  }, []);

  useEffect(() => {
    setIsLoading(true);
    loadData().finally(() => setIsLoading(false));
  }, [loadData]);

  // Covers changes made from another tab/user too, not just this one's own actions below.
  useEffect(() => onRoomAvailabilityChanged(() => loadData()), [onRoomAvailabilityChanged, loadData]);

  function openBookingForm(prefillRoomId?: string, prefillHour?: number) {
    setRoomId(prefillRoomId ?? "");
    setStartTime(prefillHour !== undefined ? toDatetimeLocalValue(selectedDate, prefillHour) : "");
    setEndTime(prefillHour !== undefined ? toDatetimeLocalValue(selectedDate, prefillHour + 1) : "");
    setFormError(null);
    setIsFormOpen(true);
  }

  async function handleBook(event: FormEvent) {
    event.preventDefault();
    setFormError(null);

    if (!roomId || !startTime || !endTime) {
      setFormError("Pick a room, start time, and end time.");
      return;
    }

    setIsSubmitting(true);
    try {
      // datetime-local values have no timezone — the Date constructor treats them as the
      // browser's local time, so this converts to the correct UTC instant the Api expects
      // (BookingRuleEngine re-interprets it in the configured business timezone).
      await createReservation({
        roomId,
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
      });
      setIsFormOpen(false);
      await loadData();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCancel(reservationId: string) {
    setCancellingId(reservationId);
    try {
      await cancelReservation(reservationId);
      setSelectedReservation(null);
      await loadData();
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : "Could not cancel that reservation.");
    } finally {
      setCancellingId(null);
    }
  }

  if (!authenticated) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-2xl font-semibold text-indigo-700">BookingSystem</h1>
        <p className="mt-2 text-slate-600">Sign in to view room availability and book a time slot.</p>
        <Link
          to="/login"
          className="mt-6 inline-block rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Sign in
        </Link>
      </div>
    );
  }

  const dateLabel = selectedDate.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  const isToday = selectedDate.getTime() === startOfDay(new Date()).getTime();

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setSelectedDate((d) => addDays(d, -1))}
            aria-label="Previous day"
            className="rounded border border-slate-300 px-2 py-1 text-sm text-slate-600 hover:bg-slate-100"
          >
            ‹
          </button>
          <span className="min-w-[9rem] text-center text-sm font-medium text-slate-900">{dateLabel}</span>
          <button
            onClick={() => setSelectedDate((d) => addDays(d, 1))}
            aria-label="Next day"
            className="rounded border border-slate-300 px-2 py-1 text-sm text-slate-600 hover:bg-slate-100"
          >
            ›
          </button>
          {!isToday && (
            <button
              onClick={() => setSelectedDate(startOfDay(new Date()))}
              className="ml-1 rounded border border-slate-300 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
            >
              Today
            </button>
          )}
        </div>

        <button
          onClick={() => openBookingForm()}
          className="rounded bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
        >
          New booking
        </button>
      </div>

      <div className="mt-2 flex items-center gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-indigo-100" /> Your booking
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-violet-50" /> Booked
        </span>
        <span>Click an open slot to book it, or a booking to see details.</span>
      </div>

      {loadError && <p className="mt-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{loadError}</p>}

      {isLoading ? (
        <p className="mt-3 text-sm text-slate-500">Loading...</p>
      ) : (
        <RoomCalendar
          date={selectedDate}
          rooms={rooms}
          reservations={reservations}
          currentUserId={currentUserId}
          onSlotClick={(clickedRoomId, hour) => openBookingForm(clickedRoomId, hour)}
          onBlockClick={setSelectedReservation}
        />
      )}

      {isFormOpen && (
        <BookingFormModal
          rooms={rooms}
          roomId={roomId}
          startTime={startTime}
          endTime={endTime}
          formError={formError}
          isSubmitting={isSubmitting}
          onRoomIdChange={setRoomId}
          onStartTimeChange={setStartTime}
          onEndTimeChange={setEndTime}
          onSubmit={handleBook}
          onClose={() => setIsFormOpen(false)}
        />
      )}

      {selectedReservation && (
        <BookingDetailModal
          reservation={selectedReservation}
          room={rooms.find((r) => r.id === selectedReservation.roomId)}
          isMine={selectedReservation.userId === currentUserId}
          isCancelling={cancellingId === selectedReservation.id}
          onCancel={() => handleCancel(selectedReservation.id)}
          onClose={() => setSelectedReservation(null)}
        />
      )}
    </div>
  );
}
