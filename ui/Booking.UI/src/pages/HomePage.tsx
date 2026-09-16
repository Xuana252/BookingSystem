import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  ArrowRight,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Filter,
  Info,
  Loader2,
  Plus,
  X,
} from "lucide-react";
import { getCurrentUserId, isAuthenticated } from "../lib/auth";
import { ApiError } from "../lib/apiClient";
import { cancelReservation, createReservation, getReservations, getRooms } from "../lib/api";
import type { Reservation, Room } from "../lib/types";
import { addDays, combineDateAndTime, hourToTimeValue, startOfDay, toDateInputValue } from "../lib/dates";
import { useReservationHub } from "../hooks/useReservationHub";
import { RoomCalendar } from "../components/RoomCalendar";
import { WeekCalendar } from "../components/WeekCalendar";
import { MonthCalendar } from "../components/MonthCalendar";
import { StatsPanel } from "../components/StatsPanel";
import { BookingFormModal } from "../components/BookingFormModal";
import { BookingDetailModal } from "../components/BookingDetailModal";
import { RoomDetailModal } from "../components/RoomDetailModal";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";

type ViewMode = "day" | "week" | "month";

export function HomePage() {
  const authenticated = isAuthenticated();
  const currentUserId = getCurrentUserId();
  const { onRoomAvailabilityChanged } = useReservationHub();

  const [rooms, setRooms] = useState<Room[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(() => startOfDay(new Date()));
  const [viewMode, setViewMode] = useState<ViewMode>("day");
  
  const [searchQuery, setSearchQuery] = useState("");
  const [minCapacity, setMinCapacity] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [roomId, setRoomId] = useState("");
  const [bookingDate, setBookingDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [attendeeUserIds, setAttendeeUserIds] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [roomsResult, reservationsResult] = await Promise.all([getRooms(true), getReservations()]);

      // Ensure any room referenced by an existing reservation is present in rooms, even if
      // deactivated or omitted by an older API response, so its schedule and reservations
      // are consistently displayed on both Month and Day calendars.
      const knownRoomIds = new Set(roomsResult.map((r) => r.id));
      const cachedNames: Record<string, string> = (() => {
        try {
          return JSON.parse(localStorage.getItem("cached_room_names") ?? "{}");
        } catch {
          return {};
        }
      })();

      // Update cache with fresh rooms
      for (const r of roomsResult) {
        cachedNames[r.id] = r.name;
      }
      try {
        localStorage.setItem("cached_room_names", JSON.stringify(cachedNames));
      } catch {
        // ignore storage errors
      }

      const missingRoomIds = [...new Set(reservationsResult.map((r) => r.roomId))].filter(
        (id) => !knownRoomIds.has(id),
      );
      const allRooms: Room[] = [
        ...roomsResult,
        ...missingRoomIds.map((id) => ({
          id,
          name: cachedNames[id] ?? "Room (Maintenance)",
          location: "Unavailable",
          capacity: 0,
          amenities: [],
          webhookUrls: [],
          isActive: false,
          createdAt: new Date().toISOString(),
        })),
      ];

      setRooms(allRooms);
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

  // Instant refresh when AI chatbot completes a booking
  useEffect(() => {
    function handleRefresh() {
      loadData();
    }
    window.addEventListener("refresh-reservations", handleRefresh);
    return () => window.removeEventListener("refresh-reservations", handleRefresh);
  }, [loadData]);

  function openBookingForm(prefillRoomId?: string, prefillStartHour?: number, prefillEndHour?: number) {
    if (prefillRoomId) {
      const targetRoom = rooms.find((r) => r.id === prefillRoomId);
      if (targetRoom && !targetRoom.isActive) {
        return;
      }
    }
    setRoomId(prefillRoomId ?? "");
    setBookingDate(toDateInputValue(selectedDate));
    setStartTime(prefillStartHour !== undefined ? hourToTimeValue(prefillStartHour) : "");
    setEndTime(prefillEndHour !== undefined ? hourToTimeValue(prefillEndHour) : "");
    setAttendeeUserIds([]);
    setFormError(null);
    setIsFormOpen(true);
  }

  function handleStartTimeChange(value: string) {
    setStartTime(value);
    setEndTime((current) => (current && current > value ? current : ""));
  }

  function handleSelectMonthDay(date: Date) {
    setSelectedDate(startOfDay(date));
    setViewMode("day");
  }

  async function handleBook(event: FormEvent) {
    event.preventDefault();
    setFormError(null);

    if (!roomId || !bookingDate || !startTime || !endTime) {
      setFormError("Pick a room, date, and time range.");
      return;
    }
    if (endTime <= startTime) {
      setFormError("End time must be after start time.");
      return;
    }

    setIsSubmitting(true);
    try {
      await createReservation({
        roomId,
        startTime: combineDateAndTime(bookingDate, startTime).toISOString(),
        endTime: combineDateAndTime(bookingDate, endTime).toISOString(),
        attendeeUserIds: attendeeUserIds.length > 0 ? attendeeUserIds : undefined,
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
      <div className="flex min-h-[65vh] items-center justify-center">
        <div className="mx-auto max-w-md text-center">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-primary to-violet-500 text-white shadow-lg shadow-primary/20">
            <Calendar className="size-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Welcome to BookingSystem</h1>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            Reserve conference rooms, review real-time availability, and coordinate meetings seamlessly across your team.
          </p>
          <div className="mt-6 flex justify-center">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/20 transition-all hover:bg-primary/90 hover:shadow-lg"
            >
              <span>Sign in to get started</span>
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const dateLabel =
    viewMode === "day"
      ? selectedDate.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })
      : viewMode === "week"
      ? `Week of ${selectedDate.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`
      : selectedDate.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const isToday = selectedDate.getTime() === startOfDay(new Date()).getTime();

  const filteredRooms = rooms.filter((r) => {
    if (searchQuery && !r.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (minCapacity && r.capacity < parseInt(minCapacity, 10)) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Modern Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-3.5 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          {/* Date navigator */}
          <div className="flex items-center rounded-lg border border-border bg-muted p-0.5">
            <button
              onClick={() => setSelectedDate((d) => addDays(d, viewMode === "day" ? -1 : viewMode === "week" ? -7 : -30))}
              aria-label="Previous"
              className="flex size-7.5 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-card hover:text-foreground focus:outline-none"
            >
              <ChevronLeft className="size-4" />
            </button>
            <div className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-foreground">
              <Calendar className="size-3.5 text-primary" />
              <span>{dateLabel}</span>
            </div>
            <button
              onClick={() => setSelectedDate((d) => addDays(d, viewMode === "day" ? 1 : viewMode === "week" ? 7 : 30))}
              aria-label="Next"
              className="flex size-7.5 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-card hover:text-foreground focus:outline-none"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>

          {!isToday && (
            <button
              onClick={() => setSelectedDate(startOfDay(new Date()))}
              className="rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              Today
            </button>
          )}

          {/* View mode segmented switcher */}
          <div className="flex rounded-lg border border-border bg-muted p-0.5">
            {(["day", "week", "month"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`rounded-md px-3 py-1 text-xs font-medium capitalize transition-all ${
                  viewMode === mode
                    ? "bg-card text-foreground font-semibold shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          {/* Filter Popover Toggle */}
          <div className="relative">
            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={`flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition-colors ${
                isFilterOpen || searchQuery || minCapacity
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Filter className="size-3.5" />
              <span>Filters</span>
              {(searchQuery || minCapacity) && (
                <span className="flex size-4 items-center justify-center rounded-full bg-primary/20 text-[9px] font-bold">
                  {(searchQuery ? 1 : 0) + (minCapacity ? 1 : 0)}
                </span>
              )}
            </button>

            {isFilterOpen && (
              <>
                {/* Backdrop to close when clicking outside */}
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setIsFilterOpen(false)}
                />
                
                {/* Popover container */}
                <div className="absolute left-0 top-full z-50 mt-2 w-64 rounded-xl border border-border bg-card p-4 shadow-xl">
                  <div className="flex items-center justify-between mb-3 border-b border-border pb-2">
                    <h3 className="text-sm font-semibold">Filter Rooms</h3>
                    <button 
                      onClick={() => setIsFilterOpen(false)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground">Search Room</label>
                      <Input
                        type="text"
                        className="h-8 text-xs bg-background"
                        placeholder="e.g. Conference A"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5 flex flex-col">
                      <label className="text-xs font-semibold text-foreground">Min Capacity</label>
                      <Input
                        type="number"
                        className="h-8 text-xs bg-background"
                        placeholder="Seats"
                        value={minCapacity}
                        onChange={(e) => setMinCapacity(e.target.value)}
                        min="0"
                      />
                    </div>
                  </div>
                  
                  {(searchQuery || minCapacity) && (
                    <button
                      onClick={() => {
                        setSearchQuery("");
                        setMinCapacity("");
                      }}
                      className="mt-4 w-full rounded-lg bg-muted py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-colors"
                    >
                      Clear Filters
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Primary CTA */}
        <Button
          onClick={() => openBookingForm()}
          className="gap-1.5 bg-gradient-to-r from-primary to-indigo-600 text-primary-foreground shadow-sm shadow-primary/25 hover:opacity-95"
        >
          <Plus className="size-4" />
          <span>New booking</span>
        </Button>
      </div>

      {/* Legend and tips */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground px-1">
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 font-medium text-primary dark:text-indigo-300">
            <span className="size-2 rounded-full bg-primary" />
            Your booking
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-0.5 font-medium text-amber-700 dark:text-amber-400">
            <span className="size-2 rounded-full bg-amber-500" />
            Attending (Invited)
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/20 bg-rose-500/10 px-2.5 py-0.5 font-medium text-rose-700 dark:text-rose-400">
            <span className="size-2 rounded-full bg-rose-500" />
            Booked by others
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/80">
          <Info className="size-3.5" />
          <span>{viewMode === "day" ? "Click or drag an open slot to book, or click a booking to view details." : viewMode === "week" ? "Click a booking to view details, or click a day to jump to its schedule." : "Click any day in the grid to jump to its schedule."}</span>
        </div>
      </div>

      {loadError && (
        <div className="flex items-center gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          <span>{loadError}</span>
        </div>
      )}

      {/* Main layout */}
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1">
          {isLoading ? (
            <div className="flex min-h-[400px] flex-col items-center justify-center rounded-xl border border-border/70 bg-card p-10 text-muted-foreground">
              <Loader2 className="size-6 animate-spin text-primary mb-2" />
              <p className="text-xs font-medium">Loading schedule...</p>
            </div>
          ) : viewMode === "day" ? (
            <RoomCalendar
              date={selectedDate}
              rooms={filteredRooms}
              reservations={reservations}
              currentUserId={currentUserId}
              onSlotSelect={(clickedRoomId, startHour, endHour) => openBookingForm(clickedRoomId, startHour, endHour)}
              onBlockClick={setSelectedReservation}
              onRoomClick={setSelectedRoom}
            />
          ) : viewMode === "week" ? (
            <WeekCalendar
              weekStart={selectedDate}
              rooms={filteredRooms}
              reservations={reservations}
              onSelectDay={handleSelectMonthDay}
              onBlockClick={setSelectedReservation}
            />
          ) : (
            <MonthCalendar month={selectedDate} rooms={filteredRooms} reservations={reservations} onSelectDay={handleSelectMonthDay} />
          )}
        </div>

        {!isLoading && <StatsPanel rooms={filteredRooms} reservations={reservations} currentUserId={currentUserId} />}
      </div>

      {isFormOpen && (
        <BookingFormModal
          rooms={rooms.filter((r) => r.isActive)}
          roomId={roomId}
          date={bookingDate}
          startTime={startTime}
          endTime={endTime}
          attendeeUserIds={attendeeUserIds}
          formError={formError}
          isSubmitting={isSubmitting}
          onRoomIdChange={setRoomId}
          onDateChange={setBookingDate}
          onStartTimeChange={handleStartTimeChange}
          onEndTimeChange={setEndTime}
          onAttendeeUserIdsChange={setAttendeeUserIds}
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

      {selectedRoom && (
        <RoomDetailModal
          room={selectedRoom}
          onClose={() => setSelectedRoom(null)}
          onBookClick={(roomId) => openBookingForm(roomId)}
        />
      )}
    </div>
  );
}
