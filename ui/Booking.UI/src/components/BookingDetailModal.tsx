import { Modal } from "./Modal";
import type { Reservation, Room } from "../lib/types";

interface BookingDetailModalProps {
  reservation: Reservation;
  room: Room | undefined;
  isMine: boolean;
  isCancelling: boolean;
  onCancel: () => void;
  onClose: () => void;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function BookingDetailModal({ reservation, room, isMine, isCancelling, onCancel, onClose }: BookingDetailModalProps) {
  return (
    <Modal onClose={onClose}>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium text-slate-900">{room?.name ?? "Room"}</h2>
        <button onClick={onClose} aria-label="Close" className="text-slate-400 hover:text-slate-600">
          ✕
        </button>
      </div>

      <p className="mt-3 text-sm text-slate-600">
        {new Date(reservation.startTime).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
      </p>
      <p className="text-sm text-slate-600">
        {formatTime(reservation.startTime)} – {formatTime(reservation.endTime)}
      </p>
      <p className="mt-2 flex items-center gap-2 text-sm text-slate-600">
        <span
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-medium text-white ${
            isMine ? "bg-indigo-500" : "bg-red-500"
          }`}
          aria-hidden="true"
        >
          {reservation.username[0]?.toUpperCase() ?? "?"}
        </span>
        {isMine ? "Booked by you" : `Booked by ${reservation.username}`}
      </p>

      {isMine && (
        <button
          onClick={onCancel}
          disabled={isCancelling}
          className="mt-6 w-full rounded bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
        >
          {isCancelling ? "Cancelling..." : "Cancel booking"}
        </button>
      )}
    </Modal>
  );
}
