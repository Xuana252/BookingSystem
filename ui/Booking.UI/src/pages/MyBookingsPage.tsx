import { useEffect, useState } from "react";
import { Loader2, Calendar, Clock, MapPin, XCircle, SearchX, ArrowRight } from "lucide-react";
import { getReservations, getRooms, cancelReservation } from "../lib/api";
import { getCurrentUserId } from "../lib/auth";
import { type Reservation, type Room, ReservationStatus } from "../lib/types";
import { ApiError } from "../lib/apiClient";
import { BookingDetailModal } from "../components/BookingDetailModal";
import { Link } from "react-router-dom";
import { Button } from "../components/ui/button";
import { isSameLocalDay } from "../lib/dates";

export function MyBookingsPage() {
  const currentUserId = getCurrentUserId();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"upcoming" | "past">("upcoming");
  
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [roomsResult, reservationsResult] = await Promise.all([getRooms(false), getReservations()]);
      setRooms(roomsResult);
      setReservations(reservationsResult);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load bookings");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  async function handleCancel(reservationId: string) {
    setCancellingId(reservationId);
    try {
      await cancelReservation(reservationId);
      setSelectedReservation(null);
      await loadData();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not cancel that reservation.");
    } finally {
      setCancellingId(null);
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center">
        <Loader2 className="size-10 animate-spin text-primary/60 mb-4" />
        <p className="text-sm font-medium text-muted-foreground animate-pulse">Gathering your itinerary...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-destructive p-6 border border-destructive/20 bg-destructive/5 rounded-2xl max-w-md text-center shadow-sm">
          <XCircle className="size-10 mx-auto mb-3 text-destructive/80" />
          <h3 className="font-bold text-lg mb-1">Oops, something went wrong</h3>
          <p className="text-sm opacity-90">{error}</p>
        </div>
      </div>
    );
  }

  const now = new Date();
  
  // Filter for my bookings (host or attendee)
  const myBookings = reservations.filter(r => 
    r.userId === currentUserId || r.attendees?.some(a => a.userId === currentUserId)
  );

  const upcoming = myBookings.filter(r => new Date(r.endTime) > now && r.status === ReservationStatus.Confirmed).sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  const past = myBookings.filter(r => new Date(r.endTime) <= now || r.status === ReservationStatus.Cancelled).sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

  const renderBookingCard = (reservation: Reservation, isHero = false) => {
    const room = rooms.find(r => r.id === reservation.roomId);
    const isMine = reservation.userId === currentUserId;
    const start = new Date(reservation.startTime);
    const end = new Date(reservation.endTime);
    const isToday = isSameLocalDay(start, now);
    const isPast = activeTab === "past";
    const isCancelled = reservation.status === ReservationStatus.Cancelled;
    
    // Avatar placeholders
    const avatars = [
      { id: reservation.userId, name: reservation.username, isHost: true },
      ...(reservation.attendees || []).map(a => ({ id: a.userId, name: a.username, isHost: false }))
    ];
    const displayAvatars = avatars.slice(0, 4);
    const extraAvatars = avatars.length - 4;

    return (
      <div 
        key={reservation.id} 
        onClick={() => setSelectedReservation(reservation)}
        className={`group relative overflow-hidden rounded-2xl border ${isHero ? 'border-primary/20 bg-primary/5 shadow-md shadow-primary/5' : 'border-border bg-card shadow-sm'} transition-all hover:-translate-y-1 hover:shadow-lg hover:border-primary/30 cursor-pointer flex flex-col`}
      >
        {/* Top Banner Accent */}
        <div className={`h-1.5 w-full ${isCancelled ? 'bg-rose-500/50' : isMine ? 'bg-gradient-to-r from-primary to-indigo-500' : 'bg-gradient-to-r from-amber-400 to-amber-600'}`} />
        
        {/* Live Indicator (Today only) */}
        {!isPast && !isCancelled && isToday && (
          <div className="absolute top-4 right-4 flex items-center gap-1.5">
            <span className="relative flex size-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-rose-500" />
            </span>
            <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider">Today</span>
          </div>
        )}

        {isCancelled && (
           <div className="absolute top-4 right-4 text-[10px] font-bold text-rose-500 uppercase tracking-wider flex items-center gap-1">
             <XCircle className="size-3" /> Cancelled
           </div>
        )}

        <div className={`p-5 flex-1 flex flex-col ${isCancelled ? 'opacity-70 grayscale-[30%]' : ''}`}>
          <div className="flex items-start gap-4">
            {/* Calendar Date Block */}
            <div className="flex flex-col items-center justify-center rounded-xl bg-muted/60 px-3 py-2 text-center shadow-inner ring-1 ring-inset ring-foreground/5 min-w-[3.5rem]">
               <span className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest">{start.toLocaleDateString(undefined, { month: 'short'})}</span>
               <span className="text-xl font-black text-foreground leading-none mt-0.5">{start.getDate()}</span>
            </div>
            
            <div className="flex-1 pr-10">
               <h4 className={`font-bold ${isHero ? 'text-lg' : 'text-base'} text-foreground group-hover:text-primary transition-colors line-clamp-1`}>
                 {room?.name ?? "Unknown Room"}
               </h4>
               <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                 <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                   <Clock className="size-3.5 text-foreground/40" />
                   {start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                 </div>
                 <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                   <MapPin className="size-3.5 text-foreground/40" />
                   <span className="truncate max-w-[120px]">{room?.location ?? "N/A"}</span>
                 </div>
               </div>
            </div>
          </div>
          
          <div className="mt-auto pt-5">
            <div className="flex items-center justify-between border-t border-border/60 pt-4">
              <div className="flex items-center gap-2">
                 {/* Role Badge */}
                 <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase ${isMine ? 'bg-primary/10 text-primary' : 'bg-amber-500/10 text-amber-600'}`}>
                   {isMine ? 'Hosting' : 'Attending'}
                 </span>
                 
                 {/* Attendees Stack */}
                 <div className="flex -space-x-1.5 ml-1">
                   {displayAvatars.map((a, i) => (
                      <div 
                        key={i} 
                        title={`${a.name} ${a.isHost ? '(Host)' : ''}`}
                        className={`flex size-6 items-center justify-center rounded-full border-2 border-card text-[9px] font-bold ${a.isHost ? 'bg-primary text-primary-foreground z-10' : 'bg-muted text-muted-foreground z-0'}`}
                      >
                         {a.name.substring(0, 2).toUpperCase()}
                      </div>
                   ))}
                   {extraAvatars > 0 && (
                      <div className="flex size-6 items-center justify-center rounded-full border-2 border-card bg-muted text-[9px] font-bold text-muted-foreground z-0">
                         +{extraAvatars}
                      </div>
                   )}
                 </div>
              </div>
              
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/5 text-primary opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0">
                 <ArrowRight className="size-3.5" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto pb-12">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-foreground">My Itinerary</h1>
          <p className="text-sm font-medium text-muted-foreground mt-1.5 max-w-xl">
            Keep track of the meetings you are hosting or attending. Click on any card to view details or manage your reservation.
          </p>
        </div>
        
        {/* Quick Stats */}
        <div className="flex items-center gap-3 bg-card border border-border rounded-xl p-1 shadow-sm">
           <div className="flex flex-col items-center justify-center px-4 py-1.5 rounded-lg bg-primary/10 text-primary">
              <span className="text-xl font-bold leading-none">{upcoming.length}</span>
              <span className="text-[10px] font-bold uppercase tracking-wider mt-1 opacity-80">Upcoming</span>
           </div>
           <div className="w-px h-8 bg-border" />
           <div className="flex flex-col items-center justify-center px-4 py-1.5 text-muted-foreground">
              <span className="text-xl font-bold leading-none">{past.length}</span>
              <span className="text-[10px] font-bold uppercase tracking-wider mt-1 opacity-70">Past</span>
           </div>
        </div>
      </div>

      {/* Modern Tabs */}
      <div className="flex items-center gap-2 border-b border-border">
        <button 
          onClick={() => setActiveTab("upcoming")}
          className={`px-4 py-2.5 text-sm font-bold border-b-2 transition-colors ${activeTab === 'upcoming' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          Upcoming Meetings
        </button>
        <button 
          onClick={() => setActiveTab("past")}
          className={`px-4 py-2.5 text-sm font-bold border-b-2 transition-colors ${activeTab === 'past' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          Past & Cancelled
        </button>
      </div>

      {/* Main Content Area */}
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        {activeTab === "upcoming" ? (
          upcoming.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-4 text-center border-2 border-dashed border-border rounded-3xl bg-card/50">
              <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-4">
                <SearchX className="size-8" />
              </div>
              <h3 className="text-xl font-bold mb-2">Your calendar is clear</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-sm">
                You don't have any upcoming meetings scheduled. Time to focus on deep work!
              </p>
              <Link to="/">
                <Button className="font-bold shadow-md shadow-primary/20">
                  <Calendar className="size-4 mr-2" />
                  Book a Room Now
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Highlight Hero Card for the most immediate meeting */}
              {upcoming.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2">
                    <span className="size-1.5 rounded-full bg-primary animate-pulse" />
                    Up Next
                  </h3>
                  <div className="md:w-2/3 lg:w-1/2">
                    {renderBookingCard(upcoming[0], true)}
                  </div>
                </div>
              )}
              
              {/* Grid for the rest */}
              {upcoming.length > 1 && (
                <div>
                  <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4">Later On</h3>
                  <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                    {upcoming.slice(1).map(r => renderBookingCard(r))}
                  </div>
                </div>
              )}
            </div>
          )
        ) : (
          /* Past Tab */
          past.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
               <p className="font-medium text-sm">No historical bookings found.</p>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {past.map(r => renderBookingCard(r))}
            </div>
          )
        )}
      </div>

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
    </div>
  );
}
