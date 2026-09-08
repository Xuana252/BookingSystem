import { Building2, Calendar, Clock, Loader2, MapPin, Trash2, User, Users, X } from "lucide-react";
import { Modal } from "./Modal";
import type { Reservation, Room } from "../lib/types";
import { getCurrentUserId } from "../lib/auth";
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
  const currentUserId = getCurrentUserId();
  const isAttending = !isMine && Boolean(reservation.attendees?.some((a) => a.userId === currentUserId));
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
          {isAttending && (
            <Badge className="border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-400 font-semibold">
              You are Attending
            </Badge>
          )}
        </div>

        {reservation.attendees && reservation.attendees.length > 0 && (
          <div className="rounded-lg border border-border bg-muted/60 p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <Users className="size-3.5 text-primary" />
                <span>Invited Attendees ({reservation.attendees.length})</span>
              </div>
              <Badge variant="secondary" className="text-[10px]">
                {1 + reservation.attendees.length} / {room?.capacity ?? "?"} seats
              </Badge>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {reservation.attendees.map((attendee) => {
                const isCurrent = attendee.userId === currentUserId;
                return (
                  <span
                    key={attendee.userId}
                    className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs shadow-2xs ${
                      isCurrent
                        ? "border border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-300 font-medium"
                        : "border border-border bg-card text-foreground"
                    }`}
                  >
                    <span
                      className={`flex size-4 items-center justify-center rounded-full text-[9px] font-bold ${
                        isCurrent
                          ? "bg-amber-500/20 text-amber-700 dark:text-amber-300"
                          : "bg-primary/10 text-primary"
                      }`}
                    >
                      {attendee.username[0]?.toUpperCase() ?? "U"}
                    </span>
                    <span>{attendee.username}</span>
                    {isCurrent && (
                      <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
                        (You)
                      </span>
                    )}
                  </span>
                );
              })}
            </div>
          </div>
        )}
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
