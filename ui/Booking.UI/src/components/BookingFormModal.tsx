import type { FormEvent } from "react";
import { Modal } from "./Modal";
import type { Room } from "../lib/types";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

interface BookingFormModalProps {
  rooms: Room[];
  roomId: string;
  startTime: string;
  endTime: string;
  formError: string | null;
  isSubmitting: boolean;
  onRoomIdChange: (value: string) => void;
  onStartTimeChange: (value: string) => void;
  onEndTimeChange: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
  onClose: () => void;
}

export function BookingFormModal({
  rooms,
  roomId,
  startTime,
  endTime,
  formError,
  isSubmitting,
  onRoomIdChange,
  onStartTimeChange,
  onEndTimeChange,
  onSubmit,
  onClose,
}: BookingFormModalProps) {
  return (
    <Modal onClose={onClose}>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium text-slate-900">Book a room</h2>
        <button onClick={onClose} aria-label="Close" className="text-slate-400 hover:text-slate-600">
          ✕
        </button>
      </div>

      <form onSubmit={onSubmit} className="mt-4 space-y-4">
        {formError && <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>}

        <div>
          <Label htmlFor="roomId">Room</Label>
          <Select value={roomId} onValueChange={(value) => onRoomIdChange(value ?? "")} required>
            <SelectTrigger id="roomId" className="mt-1 w-full">
              {/* Base UI's Select.Value doesn't infer a label from the matching SelectItem's
                  children the way Radix does — it just stringifies the raw value unless given
                  a render function, so without this it showed the room's raw GUID. */}
              <SelectValue placeholder="Select a room">
                {(value: string | null) => {
                  const room = rooms.find((r) => r.id === value);
                  return room ? `${room.name} (${room.capacity})` : null;
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {rooms.map((room) => (
                <SelectItem key={room.id} value={room.id}>
                  {room.name} ({room.capacity})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="startTime">Start</Label>
            <Input
              id="startTime"
              type="datetime-local"
              value={startTime}
              onChange={(event) => onStartTimeChange(event.target.value)}
              className="mt-1"
              required
            />
          </div>

          <div>
            <Label htmlFor="endTime">End</Label>
            <Input
              id="endTime"
              type="datetime-local"
              value={endTime}
              onChange={(event) => onEndTimeChange(event.target.value)}
              className="mt-1"
              required
            />
          </div>
        </div>

        <Button type="submit" disabled={isSubmitting} size="lg" className="w-full">
          {isSubmitting ? "Booking..." : "Book"}
        </Button>
      </form>
    </Modal>
  );
}
