import type { FormEvent } from "react";
import { AlertCircle, Building2, Calendar, CalendarPlus, Clock, Loader2, X } from "lucide-react";
import { Modal } from "./Modal";
import type { Room } from "../lib/types";
import { BUSINESS_HOURS_END_TIME, BUSINESS_HOURS_START_TIME, toDateInputValue } from "../lib/dates";
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
  formError: string | null;
  isSubmitting: boolean;
  onRoomIdChange: (value: string) => void;
  onDateChange: (value: string) => void;
  onStartTimeChange: (value: string) => void;
  onEndTimeChange: (value: string) => void;
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
  formError,
  isSubmitting,
  onRoomIdChange,
  onDateChange,
  onStartTimeChange,
  onEndTimeChange,
  onSubmit,
  onClose,
}: BookingFormModalProps) {
  const duration = calculateDuration(startTime, endTime);

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
          <Select value={roomId} onValueChange={(value) => onRoomIdChange(value ?? "")} required>
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
