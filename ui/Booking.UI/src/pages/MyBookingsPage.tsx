import { useEffect, useState } from "react";
import { Loader2, Calendar, Clock, MapPin, XCircle, SearchX, ArrowRight, ArrowLeft } from "lucide-react";
import { getReservations, getRooms, cancelReservation, checkInReservation } from "../lib/api";
import { getCurrentUserId } from "../lib/auth";
import { type Reservation, type Room, ReservationStatus } from "../lib/types";
import { ApiError } from "../lib/apiClient";
import { BookingDetailModal } from "../components/BookingDetailModal";
import { Link } from "react-router-dom";
import { Button } from "../components/ui/button";
import { isSameLocalDay } from "../lib/dates";
import { getAvatar } from "../lib/avatar";

export function MyBookingsPage() {
  const currentUserId = getCurrentUserId();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"upcoming" | "past">("upcoming");
  
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [checkingInId, setCheckingInId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 30000); // Update every 30s
    return () => clearInterval(timer);
  }, []);

  const loadData = async () => {
    try {
      const [roomsRes, reservationsRes] = await Promise.all([
        getRooms(false),
        getReservations()
      ]);
      setRooms(roomsRes);
      
      const sorted = reservationsRes.sort((a, b) => 
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
      );
      setReservations(sorted);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load bookings");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCancel = async (id: string) => {
    try {
      setCancellingId(id);
      await cancelReservation(id);
      await loadData();
      if (selectedReservation?.id === id) {
        setSelectedReservation(prev => prev ? {...prev, status: ReservationStatus.Cancelled} : null);
      }
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Failed to cancel booking");
    } finally {
      setCancellingId(null);
    }
  };

  const handleCheckIn = async (id: string) => {
    try {
      setCheckingInId(id);
      await checkInReservation(id);
      await loadData();
      if (selectedReservation?.id === id) {
        setSelectedReservation(prev => prev ? {...prev, checkedInAt: new Date().toISOString()} : null);
      }
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Failed to check in");
    } finally {
      setCheckingInId(null);
    }
  };

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
  
  // Basic filtering for tabs
  const upcoming = reservations.filter(r => new Date(r.endTime) >= currentTime && r.status !== ReservationStatus.Cancelled);
  const past = reservations.filter(r => new Date(r.endTime) < currentTime || r.status === ReservationStatus.Cancelled);

  const renderBookingCard = (reservation: Reservation, isHero = false) => {
    const room = rooms.find(r => r.id === reservation.roomId);
    const isMine = reservation.userId === currentUserId;
    const start = new Date(reservation.startTime);
    const end = new Date(reservation.endTime);
    const isToday = isSameLocalDay(start, currentTime);
    const isPast = activeTab === "past";
    const isCancelled = reservation.status === ReservationStatus.Cancelled;
    
    // Check if it is currently happening
    const isOngoing = currentTime >= start && currentTime <= end && !isCancelled;
    let progress = 0;
    if (isOngoing) {
       const totalDuration = end.getTime() - start.getTime();
       const elapsed = currentTime.getTime() - start.getTime();
       progress = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
    }
    
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
        className={`group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card p-5 shadow-sm transition-colors hover:border-primary/40 hover:bg-accent/30 cursor-pointer ${isCancelled ? 'opacity-60' : ''} ${isOngoing ? 'ring-1 ring-emerald-500/50' : ''}`}
      >
        <div className="flex items-start justify-between gap-4 mb-3">
          <div>
            <h4 className="font-semibold text-foreground text-base line-clamp-1">
              {room?.name ?? "Unknown Room"}
            </h4>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
              <Calendar className="size-3.5" />
              <span>{start.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric'})}</span>
              <span className="text-border mx-1">•</span>
              <Clock className="size-3.5" />
              <span>{start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>
          
          <div className="flex flex-col items-end gap-2 shrink-0">
            {isCancelled ? (
              <span className="inline-flex items-center rounded-md bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700 ring-1 ring-inset ring-rose-600/10 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-500/20">
                Cancelled
              </span>
            ) : isOngoing ? (
              <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/10 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20 animate-in fade-in">
                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Now
              </span>
            ) : isToday ? (
              <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary ring-1 ring-inset ring-primary/20">
                Today
              </span>
            ) : null}
          </div>
        </div>
        
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-4">
          <MapPin className="size-3.5" />
          <span className="truncate">{room?.location ?? "Location N/A"}</span>
        </div>

        {/* Live Reservation Progress Bar */}
        {isOngoing && (
          <div className="mb-4 space-y-1.5 animate-in fade-in slide-in-from-top-2">
             <div className="flex justify-between text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
               <span>Meeting Progress</span>
               <span>{Math.round(progress)}%</span>
             </div>
             <div className="h-1.5 w-full overflow-hidden rounded-full bg-emerald-500/20">
               <div 
                 className="h-full bg-emerald-500 transition-all duration-1000 ease-linear"
                 style={{ width: `${progress}%` }}
               />
             </div>
          </div>
        )}
        
        <div className="mt-auto flex items-center justify-between border-t border-border pt-4">
          <div className="flex items-center gap-2">
             <span className="inline-flex items-center rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
               {isMine ? 'Host' : 'Attendee'}
             </span>
             
             {reservation.checkedInAt && (
               <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/10 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20">
                 Checked In
               </span>
             )}
          </div>
          
          {/* Attendees Stack */}
          <div className="flex -space-x-1.5">
            {displayAvatars.map((a, i) => (
               <div 
                 key={i} 
                 title={`${a.name} ${a.isHost ? '(Host)' : ''}`}
                 className={`flex size-6 items-center justify-center rounded-full border-2 border-card text-[9px] font-bold overflow-hidden ${a.isHost ? 'bg-primary text-primary-foreground z-10' : 'bg-muted text-muted-foreground z-0'}`}
               >
                  <img src={getAvatar(a.name)} alt={a.name} className="h-full w-full object-cover" />
               </div>
            ))}
            {extraAvatars > 0 && (
               <div className="flex size-6 items-center justify-center rounded-full border-2 border-card bg-muted text-[9px] font-bold text-muted-foreground z-0">
                  +{extraAvatars}
               </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto pb-12">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border/50 pb-6">
        <div>
          <Link
            to="/"
            className="mb-1 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" />
            <span>Back to calendar</span>
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">My Bookings</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-xl">
            Keep track of the meetings you are hosting or attending. Click on any booking to view details or manage your reservation.
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
          isCheckingIn={checkingInId === selectedReservation.id}
          error={actionError}
          onCancel={() => handleCancel(selectedReservation.id)}
          onCheckIn={() => handleCheckIn(selectedReservation.id)}
          onClose={() => {
            setSelectedReservation(null);
            setActionError(null);
          }}
        />
      )}
    </div>
  );
}
