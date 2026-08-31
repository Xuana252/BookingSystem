import type { FormEvent } from "react";
import { Modal } from "./Modal";
import type { Room } from "../lib/types";

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
          <label htmlFor="roomId" className="block text-sm font-medium text-slate-700">
            Room
          </label>
          <select
            id="roomId"
            value={roomId}
            onChange={(event) => onRoomIdChange(event.target.value)}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
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

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="startTime" className="block text-sm font-medium text-slate-700">
              Start
            </label>
            <input
              id="startTime"
              type="datetime-local"
              value={startTime}
              onChange={(event) => onStartTimeChange(event.target.value)}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
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
              onChange={(event) => onEndTimeChange(event.target.value)}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              required
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {isSubmitting ? "Booking..." : "Book"}
        </button>
      </form>
    </Modal>
  );
}
