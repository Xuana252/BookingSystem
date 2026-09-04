import { Building2, Calendar, Clock, Loader2, MapPin, Trash2, User, X } from "lucide-react";
import { Modal } from "./Modal";
import type { Reservation, Room } from "../lib/types";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";

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
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Building2 className="size-4" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">{room?.name ?? "Room Reservation"}</h2>
            {room && (
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <span>{room.capacity} seats capacity</span>
              </div>
            )}
          </div>
        </div>
        <button
          onClick={onClose}
          aria-label="Close"
          className="flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground focus:outline-none"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="mt-4 space-y-3">
        <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/60 p-3">
          <Calendar className="size-4 text-primary shrink-0" />
          <div className="text-xs">
            <div className="font-semibold text-foreground">
              {new Date(reservation.startTime).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
            </div>
            <div className="text-muted-foreground">Scheduled Date</div>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/60 p-3">
          <Clock className="size-4 text-primary shrink-0" />
          <div className="text-xs">
            <div className="font-semibold text-foreground">
              {formatTime(reservation.startTime)} – {formatTime(reservation.endTime)}
            </div>
            <div className="text-muted-foreground">Reserved Time Slot</div>
          </div>
        </div>

        {room?.location && (
          <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/60 p-3">
            <MapPin className="size-4 text-primary shrink-0" />
            <div className="text-xs">
              <div className="font-semibold text-foreground">{room.location}</div>
              <div className="text-muted-foreground">Location / Floor</div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between rounded-lg border border-border bg-muted/60 p-3">
          <div className="flex items-center gap-2.5">
            <div
              className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white shadow-xs ${
                isMine ? "bg-primary" : "bg-rose-500"
              }`}
            >
              {reservation.username[0]?.toUpperCase() ?? <User className="size-3.5" />}
            </div>
            <div className="text-xs">
              <div className="font-semibold text-foreground">{reservation.username}</div>
              <div className="text-muted-foreground">{isMine ? "Organizer (You)" : "Organizer"}</div>
            </div>
          </div>
          {isMine && <Badge variant="indigo">Your Booking</Badge>}
        </div>
      </div>

      {isMine && (
        <div className="mt-5 border-t border-border pt-4">
          <Button
            onClick={onCancel}
            disabled={isCancelling}
            variant="destructive"
            size="lg"
            className="w-full gap-2 font-semibold"
          >
            {isCancelling ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                <span>Cancelling Reservation...</span>
              </>
            ) : (
              <>
                <Trash2 className="size-4" />
                <span>Cancel Reservation</span>
              </>
            )}
          </Button>
        </div>
      )}
    </Modal>
  );
}
