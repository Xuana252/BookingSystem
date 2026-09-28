import { useMemo } from "react";
import { CalendarX2, Clock, MapPin, Users } from "lucide-react";
import { ReservationStatus } from "../lib/types";
import type { Reservation, Room } from "../lib/types";
import { startOfDay } from "../lib/dates";
import { getAvatar } from "../lib/avatar";

interface AgendaViewProps {
  reservations: Reservation[];
  rooms: Room[];
  currentUserId: string;
  startDate: Date;
  onBlockClick: (reservation: Reservation) => void;
}

export function AgendaView({ reservations, rooms, currentUserId, startDate, onBlockClick }: AgendaViewProps) {
  const grouped = useMemo(() => {
    // Show reservations from the start of the selected date onwards
    const active = reservations.filter(r => new Date(r.endTime) >= startOfDay(startDate));
    
    // Sort chronologically
    active.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

    // Group by day string timestamp
    const groups = new Map<string, Reservation[]>();
    for (const res of active) {
      const d = startOfDay(new Date(res.startTime)).getTime().toString();
      if (!groups.has(d)) groups.set(d, []);
      groups.get(d)!.push(res);
    }
    
    return Array.from(groups.entries()).map(([dateStr, items]) => ({
      date: new Date(Number(dateStr)),
      items
    }));
  }, [reservations, startDate]);

  if (grouped.length === 0) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center rounded-xl border border-border/70 bg-card p-10 text-muted-foreground shadow-sm">
        <CalendarX2 className="size-10 mb-4 opacity-20" />
        <p className="text-sm font-medium">No upcoming reservations</p>
        <p className="text-xs mt-1">Try selecting a different date or clearing filters.</p>
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-12">
      {grouped.map(group => {
        const isToday = group.date.getTime() === startOfDay(new Date()).getTime();
        const dateLabel = isToday 
          ? "Today" 
          : group.date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
        
        return (
          <div key={group.date.getTime()} className="space-y-4">
            <div className="sticky -top-5 z-10 bg-background/95 backdrop-blur-sm py-2 border-b border-border/50">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <span className={isToday ? "text-primary font-bold" : "text-foreground"}>{dateLabel}</span>
                {isToday && (
                  <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-bold text-primary uppercase tracking-wider">
                    Current
                  </span>
                )}
              </h3>
            </div>
            
            <div className="space-y-3">
              {group.items.map(res => {
                const room = rooms.find(r => r.id === res.roomId);
                // If a room is filtered out but has a reservation, room will be undefined. 
                // We should only show it if the room is in the filtered list (which is passed as props).
                if (!room) return null;

                const isMine = res.userId === currentUserId;
                const isAttending = !isMine && Boolean(res.attendees?.some(a => a.userId === currentUserId));
                const isCancelled = res.status === ReservationStatus.Cancelled;
                
                const formatTime = (iso: string) => new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

                return (
                  <button
                    key={res.id}
                    onClick={() => onBlockClick(res)}
                    className={`w-full text-left flex flex-col sm:flex-row sm:items-center gap-4 rounded-xl border p-4 transition-all hover:shadow-md ${
                      isCancelled ? "bg-muted/30 border-border/50 opacity-70" :
                      isMine ? "bg-primary/5 border-primary/20 hover:border-primary/40" :
                      isAttending ? "bg-amber-500/5 border-amber-500/20 hover:border-amber-500/40" :
                      "bg-card border-border shadow-sm hover:border-primary/30 hover:bg-muted/10"
                    }`}
                  >
                    {/* Time block */}
                    <div className="sm:w-32 shrink-0 space-y-1">
                      <div className="text-sm font-bold text-foreground">{formatTime(res.startTime)}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
                        <Clock className="size-3.5 text-muted-foreground/70" />
                        {formatTime(res.endTime)}
                      </div>
                    </div>

                    {/* Room & Host info */}
                    <div className="flex-1 min-w-0 py-1">
                      <div className="flex items-center gap-2 mb-1.5">
                        <h4 className={`text-base font-semibold truncate ${isCancelled ? "line-through text-muted-foreground" : "text-foreground"}`}>
                          {room.name}
                        </h4>
                        {isCancelled && <span className="rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] font-bold text-destructive">CANCELLED</span>}
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                        {room.location && (
                          <span className="flex items-center gap-1.5">
                            <MapPin className="size-3.5" />
                            {room.location}
                          </span>
                        )}
                        <span className="flex items-center gap-1.5 font-medium">
                          <span className="size-5 overflow-hidden rounded-full border border-border/80 shadow-xs">
                            <img src={getAvatar(res.username)} alt="" className="size-full object-cover" />
                          </span>
                          {res.username} {isMine && <span className="text-primary">(You)</span>}
                        </span>
                      </div>
                    </div>

                    {/* Attendees */}
                    {res.attendees && res.attendees.length > 0 && (
                      <div className="shrink-0 flex items-center gap-2 text-xs font-medium text-muted-foreground bg-muted/60 border border-border/50 px-3 py-1.5 rounded-lg">
                        <Users className="size-3.5 text-primary" />
                        <span>{res.attendees.length} invited</span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
