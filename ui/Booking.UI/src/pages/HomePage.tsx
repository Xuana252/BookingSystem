import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { clearToken, getCurrentUserId, isAuthenticated } from "../lib/auth";
import { ApiError } from "../lib/apiClient";
import { cancelReservation, createReservation, getReservations, getRooms } from "../lib/api";
import { ReservationStatus, type Reservation, type Room } from "../lib/types";
import { useReservationHub } from "../hooks/useReservationHub";

function toLocalDisplay(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function HomePage() {
  const navigate = useNavigate();
  const authenticated = isAuthenticated();
  const currentUserId = getCurrentUserId();
  const { onRoomAvailabilityChanged } = useReservationHub();

  const [rooms, setRooms] = useState<Room[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [roomId, setRoomId] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
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

  function handleLogout() {
    clearToken();
    navigate("/login");
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
      setStartTime("");
      setEndTime("");
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
        <h1 className="text-2xl font-semibold text-slate-900">BookingSystem</h1>
        <p className="mt-2 text-slate-600">Sign in to view room availability and book a time slot.</p>
        <Link
          to="/login"
          className="mt-6 inline-block rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Sign in
        </Link>
      </div>
    );
  }

  const now = Date.now();
  const upcomingByRoom = new Map<string, Reservation[]>();
  for (const reservation of reservations) {
    if (reservation.status !== ReservationStatus.Confirmed || new Date(reservation.endTime).getTime() < now) {
      continue;
    }
    const list = upcomingByRoom.get(reservation.roomId) ?? [];
    list.push(reservation);
    upcomingByRoom.set(reservation.roomId, list);
  }
  for (const list of upcomingByRoom.values()) {
    list.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">BookingSystem</h1>
        <button
          onClick={handleLogout}
          className="rounded border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
        >
          Log out
        </button>
      </div>

      <form onSubmit={handleBook} className="mt-6 space-y-4 rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="text-sm font-semibold text-slate-900">Book a room</h2>

        {formError && <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>}

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="sm:col-span-1">
            <label htmlFor="roomId" className="block text-sm font-medium text-slate-700">
              Room
            </label>
            <select
              id="roomId"
              value={roomId}
              onChange={(event) => setRoomId(event.target.value)}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
              required
            >
              <option value="" disabled>
                Select a room
              </option>
              {rooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.name} ({room.capacity})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="startTime" className="block text-sm font-medium text-slate-700">
              Start
            </label>
            <input
              id="startTime"
              type="datetime-local"
              value={startTime}
              onChange={(event) => setStartTime(event.target.value)}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
              required
            />
          </div>

          <div>
            <label htmlFor="endTime" className="block text-sm font-medium text-slate-700">
              End
            </label>
            <input
              id="endTime"
              type="datetime-local"
              value={endTime}
              onChange={(event) => setEndTime(event.target.value)}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
              required
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {isSubmitting ? "Booking..." : "Book"}
        </button>
      </form>

      <div className="mt-8">
        <h2 className="text-sm font-semibold text-slate-900">Rooms</h2>

        {loadError && <p className="mt-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{loadError}</p>}

        {isLoading ? (
          <p className="mt-3 text-sm text-slate-500">Loading...</p>
        ) : rooms.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">No rooms yet.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {rooms.map((room) => (
              <li key={room.id} className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="flex items-baseline justify-between">
                  <span className="font-medium text-slate-900">{room.name}</span>
                  <span className="text-sm text-slate-500">
                    {room.location} · {room.capacity} seats
                  </span>
                </div>

                <ul className="mt-2 space-y-1">
                  {(upcomingByRoom.get(room.id) ?? []).length === 0 ? (
                    <li className="text-sm text-slate-400">No upcoming reservations.</li>
                  ) : (
                    upcomingByRoom.get(room.id)!.map((reservation) => (
                      <li key={reservation.id} className="flex items-center justify-between text-sm text-slate-600">
                        <span>
                          {toLocalDisplay(reservation.startTime)} – {toLocalDisplay(reservation.endTime)}
                        </span>
                        {reservation.userId === currentUserId && (
                          <button
                            onClick={() => handleCancel(reservation.id)}
                            disabled={cancellingId === reservation.id}
                            className="text-xs font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
                          >
                            {cancellingId === reservation.id ? "Cancelling..." : "Cancel"}
                          </button>
                        )}
                      </li>
                    ))
                  )}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
