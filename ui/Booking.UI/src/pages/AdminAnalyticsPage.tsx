import { useEffect, useState, useMemo } from "react";
import { Loader2, Download, BarChart3, TrendingUp, AlertTriangle } from "lucide-react";
import { getReservations, getRooms } from "../lib/api";
import { type Reservation, type Room, ReservationStatus } from "../lib/types";
import { ApiError } from "../lib/apiClient";
import { Button } from "../components/ui/button";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  AreaChart, Area
} from 'recharts';

export function AdminAnalyticsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [roomsResult, reservationsResult] = await Promise.all([getRooms(true), getReservations()]);
        setRooms(roomsResult);
        setReservations(reservationsResult);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Failed to load data for analytics.");
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  // --- Data Processing for Charts ---
  const roomUsageData = useMemo(() => {
    if (!rooms.length || !reservations.length) return [];
    
    const usageCount: Record<string, number> = {};
    rooms.forEach(r => usageCount[r.id] = 0);
    
    reservations.forEach(res => {
      if (res.status === ReservationStatus.Confirmed && usageCount[res.roomId] !== undefined) {
        usageCount[res.roomId]++;
      }
    });

    return rooms
      .map(r => ({ name: r.name, bookings: usageCount[r.id] }))
      .sort((a, b) => b.bookings - a.bookings); // Most popular first
  }, [rooms, reservations]);

  const peakHoursData = useMemo(() => {
    if (!reservations.length) return [];
    
    const hourCounts: Record<number, number> = {};
    for (let i = 6; i <= 20; i++) hourCounts[i] = 0; // 6 AM to 8 PM

    reservations.forEach(res => {
      if (res.status !== ReservationStatus.Confirmed) return;
      const hour = new Date(res.startTime).getHours();
      if (hour >= 6 && hour <= 20) {
        hourCounts[hour]++;
      }
    });

    return Object.entries(hourCounts).map(([hour, count]) => {
      const h = parseInt(hour, 10);
      const label = h === 12 ? "12 PM" : h > 12 ? `${h - 12} PM` : `${h} AM`;
      return { time: label, bookings: count };
    });
  }, [reservations]);

  const ghostMeetingsData = useMemo(() => {
    if (!reservations.length) return [];
    // Since we don't have real check-in data, we simulate it based on past reservations
    const now = new Date();
    let totalPast = 0;
    let ghost = 0;

    reservations.forEach(res => {
      if (res.status === ReservationStatus.Confirmed && new Date(res.endTime) < now) {
        totalPast++;
        // Simulate a 15% ghost meeting rate pseudo-randomly based on ID
        const isGhost = (res.id.charCodeAt(0) % 100) < 15;
        if (isGhost) ghost++;
      }
    });

    const attended = totalPast - ghost;
    return [
      { name: "Attended", value: attended },
      { name: "Ghost (No-show)", value: ghost }
    ];
  }, [reservations]);

  // --- CSV Export ---
  const handleExportCSV = () => {
    if (!reservations.length) return;

    const headers = ["ID", "Room", "Host", "Start Time", "End Time", "Status", "Attendees Count"];
    const rows = reservations.map(res => {
      const room = rooms.find(r => r.id === res.roomId);
      const statusStr = res.status === ReservationStatus.Confirmed ? "Confirmed" : "Cancelled";
      return [
        res.id,
        `"${room?.name ?? 'Unknown'}"`,
        `"${res.username}"`,
        new Date(res.startTime).toISOString(),
        new Date(res.endTime).toISOString(),
        statusStr,
        res.attendees?.length ?? 0
      ].join(",");
    });

    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `booking_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return <div className="text-destructive p-4 border border-destructive/20 bg-destructive/10 rounded-lg">{error}</div>;
  }

  const ghostRate = ghostMeetingsData.find(d => d.name === "Ghost (No-show)")?.value ?? 0;
  const attendedRate = ghostMeetingsData.find(d => d.name === "Attended")?.value ?? 0;
  const totalPast = ghostRate + attendedRate;
  const ghostPercentage = totalPast > 0 ? Math.round((ghostRate / totalPast) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Analytics Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Monitor room utilization, peak hours, and system-wide booking data.
          </p>
        </div>
        <Button onClick={handleExportCSV} className="gap-2 shadow-md">
          <Download className="size-4" />
          Export to CSV
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Most Popular Rooms */}
        <div className="col-span-1 lg:col-span-2 rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <BarChart3 className="size-4" />
            </div>
            <h2 className="text-lg font-semibold">Room Popularity</h2>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={roomUsageData.slice(0, 10)} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="opacity-10" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} angle={-25} textAnchor="end" />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                <RechartsTooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                <Bar dataKey="bookings" fill="var(--color-primary, #6366f1)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-muted-foreground text-center mt-2">Top 10 most booked rooms across all time.</p>
        </div>

        {/* Ghost Meetings Insight */}
        <div className="col-span-1 rounded-xl border border-border bg-card p-5 shadow-sm flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex size-8 items-center justify-center rounded-lg bg-rose-500/10 text-rose-500">
              <AlertTriangle className="size-4" />
            </div>
            <h2 className="text-lg font-semibold">"Ghost" Meetings</h2>
          </div>
          
          <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
            <div className="text-5xl font-black text-rose-500 mb-2">{ghostPercentage}%</div>
            <p className="text-sm font-medium text-foreground mb-4">of scheduled meetings resulted in a no-show.</p>
            
            <div className="w-full bg-muted rounded-full h-3 mb-2 overflow-hidden flex">
               <div className="bg-emerald-500 h-full" style={{ width: `${100 - ghostPercentage}%` }} />
               <div className="bg-rose-500 h-full" style={{ width: `${ghostPercentage}%` }} />
            </div>
            <div className="w-full flex justify-between text-[11px] font-semibold text-muted-foreground">
               <span className="text-emerald-600">Attended ({attendedRate})</span>
               <span className="text-rose-600">No-show ({ghostRate})</span>
            </div>
          </div>
          
          <div className="mt-4 rounded-lg bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-400">
            <strong>Note:</strong> Check-in tracking is simulated for this dashboard until hardware sensors are deployed.
          </div>
        </div>

        {/* Peak Hours */}
        <div className="col-span-1 lg:col-span-3 rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <div className="flex size-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-500">
              <TrendingUp className="size-4" />
            </div>
            <h2 className="text-lg font-semibold">Peak Booking Hours</h2>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={peakHoursData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorBookings" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="opacity-10" />
                <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                <Area type="monotone" dataKey="bookings" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorBookings)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-muted-foreground text-center mt-4">Volume of reservations grouped by start time.</p>
        </div>
      </div>
    </div>
  );
}
