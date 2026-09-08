import { useEffect, useState, type FormEvent } from "react";
import {
  AlertCircle,
  Building2,
  Calendar,
  CalendarPlus,
  Clock,
  Loader2,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { Modal } from "./Modal";
import type { Room, UserSummary } from "../lib/types";
import { BUSINESS_HOURS_END_TIME, BUSINESS_HOURS_START_TIME, toDateInputValue } from "../lib/dates";
import { getCurrentUserId } from "../lib/auth";
import { getUsers } from "../lib/api";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Badge } from "./ui/badge";

interface BookingFormModalProps {
  rooms: Room[];
  roomId: string;
  date: string;
  /** HH:mm, 24-hour — the format <input type="time"> reads/writes. */
  startTime: string;
  endTime: string;
  attendeeUserIds: string[];
  formError: string | null;
  isSubmitting: boolean;
  onRoomIdChange: (value: string) => void;
  onDateChange: (value: string) => void;
  onStartTimeChange: (value: string) => void;
  onEndTimeChange: (value: string) => void;
  onAttendeeUserIdsChange: (userIds: string[]) => void;
  onSubmit: (event: FormEvent) => void;
  onClose: () => void;
}

function calculateDuration(start: string, end: string): string | null {
  if (!start || !end || end <= start) {
    return null;
  }
  const [startH, startM] = start.split(":").map(Number);
  const [endH, endM] = end.split(":").map(Number);
  if (startH === undefined || startM === undefined || endH === undefined || endM === undefined) {
    return null;
  }
  const totalMins = endH * 60 + endM - (startH * 60 + startM);
  if (totalMins <= 0) {
    return null;
  }
  const hours = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  if (hours > 0 && mins > 0) {
    return `${hours} hr ${mins} mins`;
  }
  if (hours > 0) {
    return `${hours} ${hours === 1 ? "hr" : "hrs"}`;
  }
  return `${mins} mins`;
}

export function BookingFormModal({
  rooms,
  roomId,
  date,
  startTime,
  endTime,
  attendeeUserIds,
  formError,
  isSubmitting,
  onRoomIdChange,
  onDateChange,
  onStartTimeChange,
  onEndTimeChange,
  onAttendeeUserIdsChange,
  onSubmit,
  onClose,
}: BookingFormModalProps) {
  const duration = calculateDuration(startTime, endTime);
  const currentUserId = getCurrentUserId();

  const [availableUsers, setAvailableUsers] = useState<UserSummary[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  const selectedRoom = rooms.find((r) => r.id === roomId);
  const maxAttendees = selectedRoom ? Math.max(0, selectedRoom.capacity - 1) : 0;
  const isCapacityReached = selectedRoom !== undefined && attendeeUserIds.length >= maxAttendees;

  useEffect(() => {
    let isMounted = true;
    setIsLoadingUsers(true);
    getUsers()
      .then((users) => {
        if (isMounted) {
          // Exclude the current user because they are the host (implicit organizer)
          setAvailableUsers(users.filter((u) => u.id !== currentUserId));
        }
      })
      .catch(() => {
        // Non-fatal if users couldn't be loaded, booking can still proceed without attendees
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingUsers(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [currentUserId]);

  function handleAddAttendee(userId: string) {
    if (!userId || attendeeUserIds.includes(userId)) return;
    if (isCapacityReached) return;
    onAttendeeUserIdsChange([...attendeeUserIds, userId]);
  }

  function handleRemoveAttendee(userId: string) {
    onAttendeeUserIdsChange(attendeeUserIds.filter((id) => id !== userId));
  }

  // Candidates for adding are available users not yet selected
  const unselectedUsers = availableUsers.filter((u) => !attendeeUserIds.includes(u.id));

  return (
    <Modal onClose={onClose}>
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <CalendarPlus className="size-4" />
          </div>
          <h2 className="text-base font-semibold text-foreground">Schedule a Room</h2>
        </div>
        <button
          onClick={onClose}
          aria-label="Close"
          className="flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground focus:outline-none"
        >
          <X className="size-4" />
        </button>
      </div>

      <form onSubmit={onSubmit} className="mt-4 space-y-4">
        {formError && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-2.5 text-xs text-destructive">
            <AlertCircle className="size-4 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        <div>
          <Label htmlFor="roomId" className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
            <Building2 className="size-3.5 text-muted-foreground" />
            <span>Room</span>
          </Label>
          <Select
            value={roomId}
            onValueChange={(value) => {
              const newRoomId = value ?? "";
              onRoomIdChange(newRoomId);
              // If new room has lower capacity than current attendees + 1, trim or keep within bounds
              const newRoom = rooms.find((r) => r.id === newRoomId);
              if (newRoom && attendeeUserIds.length > Math.max(0, newRoom.capacity - 1)) {
                onAttendeeUserIdsChange(attendeeUserIds.slice(0, Math.max(0, newRoom.capacity - 1)));
              }
            }}
            required
          >
            <SelectTrigger id="roomId" className="mt-1.5 w-full bg-card">
              <SelectValue placeholder="Select a conference room">
                {(value: string | null) => {
                  const room = rooms.find((r) => r.id === value);
                  return room ? `${room.name} (${room.capacity} seats)` : null;
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {rooms.map((room) => (
                <SelectItem key={room.id} value={room.id}>
                  {room.name} ({room.capacity} seats)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="date" className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
            <Calendar className="size-3.5 text-muted-foreground" />
            <span>Date</span>
          </Label>
          <Input
            id="date"
            type="date"
            value={date}
            onChange={(event) => onDateChange(event.target.value)}
            min={toDateInputValue(new Date())}
            className="mt-1.5 bg-card"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="startTime" className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <Clock className="size-3.5 text-muted-foreground" />
              <span>Start Time</span>
            </Label>
            <Input
              id="startTime"
              type="time"
              value={startTime}
              onChange={(event) => onStartTimeChange(event.target.value)}
              min={BUSINESS_HOURS_START_TIME}
              max={BUSINESS_HOURS_END_TIME}
              className="mt-1.5 bg-card"
              required
            />
          </div>

          <div>
            <Label htmlFor="endTime" className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <Clock className="size-3.5 text-muted-foreground" />
              <span>End Time</span>
            </Label>
            <Input
              id="endTime"
              type="time"
              value={endTime}
              onChange={(event) => onEndTimeChange(event.target.value)}
              min={startTime || BUSINESS_HOURS_START_TIME}
              max={BUSINESS_HOURS_END_TIME}
              className="mt-1.5 bg-card"
              required
            />
          </div>
        </div>

        {duration && (
          <div className="flex items-center justify-between rounded-lg border border-border bg-muted px-3 py-2 text-xs">
            <span className="text-muted-foreground">Booking Duration</span>
            <Badge variant="indigo" className="font-semibold">
              {duration}
            </Badge>
          </div>
        )}

        {/* Attendees Section */}
        <div className="space-y-2 rounded-xl border border-border bg-muted/30 p-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="attendees" className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <Users className="size-3.5 text-muted-foreground" />
              <span>Invite Attendees</span>
            </Label>
            {selectedRoom && (
              <span className="text-[11px] text-muted-foreground">
                <span className="font-semibold text-foreground">{1 + attendeeUserIds.length}</span> of{" "}
                <span className="font-semibold text-foreground">{selectedRoom.capacity}</span> seats filled
              </span>
            )}
          </div>

          {selectedRoom ? (
            <>
              {/* Add attendee selector */}
              <div className="flex gap-2">
                <Select
                  value=""
                  onValueChange={(val) => {
                    if (val) handleAddAttendee(val);
                  }}
                  disabled={isCapacityReached || isLoadingUsers || unselectedUsers.length === 0}
                >
                  <SelectTrigger className="flex-1 bg-card text-xs">
                    <SelectValue placeholder={
                      isLoadingUsers
                        ? "Loading colleagues..."
                        : isCapacityReached
                        ? "Room capacity reached"
                        : unselectedUsers.length === 0
                        ? "All colleagues added"
                        : "Select colleagues to invite..."
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    {unselectedUsers.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.username}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {isCapacityReached && (
                <div className="flex items-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400">
                  <AlertCircle className="size-3.5 shrink-0" />
                  <span>
                    Maximum room capacity reached (1 host + {maxAttendees} attendee{maxAttendees === 1 ? "" : "s"}).
                  </span>
                </div>
              )}

              {/* Selected attendee chips */}
              {attendeeUserIds.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {attendeeUserIds.map((id) => {
                    const user = availableUsers.find((u) => u.id === id);
                    const name = user?.username ?? "Colleague";
                    return (
                      <span
                        key={id}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card py-1 pr-1.5 pl-2.5 text-xs font-medium text-foreground shadow-2xs"
                      >
                        <UserPlus className="size-3 text-primary" />
                        <span>{name}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveAttendee(id)}
                          className="flex size-4 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                          title={`Remove ${name}`}
                        >
                          <X className="size-3" />
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            <p className="text-[11px] text-muted-foreground">
              Select a room above to invite attendees and check seating limits.
            </p>
          )}
        </div>

        <div className="pt-2">
          <Button
            type="submit"
            disabled={isSubmitting}
            size="lg"
            className="w-full gap-2 bg-gradient-to-r from-primary to-indigo-600 font-semibold text-primary-foreground shadow-sm shadow-primary/25 hover:opacity-95"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                <span>Confirming Booking...</span>
              </>
            ) : (
              <span>Confirm Booking</span>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
