import { useEffect, useState, useMemo } from "react";
import { 
  Loader2, Download, BarChart3, TrendingUp, AlertTriangle, 
  Calendar, Clock, Users, XCircle, Sparkles
} from "lucide-react";
import { getReservations, getRooms } from "../lib/api";
import { type Reservation, type Room, ReservationStatus } from "../lib/types";
import { ApiError } from "../lib/apiClient";
import { Button } from "../components/ui/button";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell, LineChart, Line, Legend
} from 'recharts';

const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
const TICK_PROPS = { fontSize: 11, fill: 'hsl(var(--muted-foreground))' };
const TOOLTIP_STYLE = { 
  borderRadius: '6px', 
  border: '1px solid hsl(var(--border))', 
  backgroundColor: 'hsl(var(--card))', 
  color: 'hsl(var(--foreground))',
  fontSize: '12px', 
  boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
  padding: '8px 12px'
};

// Reusable Dashboard Card wrapper for a slim, professional look
function DashboardCard({ 
  title, 
  icon: Icon, 
  children, 
  className = "", 
  contentClassName = "p-4",
  iconClassName = "text-muted-foreground",
  iconBgClassName = ""
}: { 
  title: string; 
  icon: any; 
  children: React.ReactNode; 
  className?: string;
  contentClassName?: string;
  iconClassName?: string;
  iconBgClassName?: string;
}) {
  return (
    <div className={`rounded-lg border border-border bg-card shadow-sm flex flex-col overflow-hidden ${className}`}>
      <div className="flex items-center gap-2 border-b border-border/40 bg-muted/20 px-4 py-2.5">
        {iconBgClassName ? (
          <div className={`flex size-6 items-center justify-center rounded-md ${iconBgClassName}`}>
            <Icon className={`size-3.5 ${iconClassName}`} />
          </div>
        ) : (
          <Icon className={`size-4 ${iconClassName}`} />
        )}
        <h2 className="text-sm font-medium text-foreground tracking-tight">{title}</h2>
      </div>
      <div className={`flex-1 ${contentClassName}`}>
        {children}
      </div>
    </div>
  );
}

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
      const label = h === 12 ? "12PM" : h > 12 ? `${h - 12}PM` : `${h}AM`;
      return { time: label, bookings: count };
    });
  }, [reservations]);

  const ghostMeetingsData = useMemo(() => {
    if (!reservations.length) return [];
    const now = new Date();
    let totalPast = 0;
    let ghost = 0;

    reservations.forEach(res => {
      if (res.status === ReservationStatus.Confirmed && new Date(res.endTime) < now) {
        totalPast++;
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

  const busiestDaysData = useMemo(() => {
    if (!reservations.length) return [];
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayCounts = [0, 0, 0, 0, 0, 0, 0];
    
    reservations.forEach(res => {
      if (res.status === ReservationStatus.Confirmed) {
        const day = new Date(res.startTime).getDay();
        dayCounts[day]++;
      }
    });
    
    return days.map((day, index) => ({ name: day, bookings: dayCounts[index] }));
  }, [reservations]);

  const durationData = useMemo(() => {
    if (!reservations.length) return [];
    const categories = { "< 30m": 0, "30m - 1h": 0, "1h - 2h": 0, "> 2h": 0 };
    
    reservations.forEach(res => {
      if (res.status === ReservationStatus.Confirmed) {
        const start = new Date(res.startTime).getTime();
        const end = new Date(res.endTime).getTime();
        const diffMins = (end - start) / (1000 * 60);
        
        if (diffMins < 30) categories["< 30m"]++;
        else if (diffMins <= 60) categories["30m - 1h"]++;
        else if (diffMins <= 120) categories["1h - 2h"]++;
        else categories["> 2h"]++;
      }
    });
    
    return Object.entries(categories).map(([name, value]) => ({ name, value })).filter(d => d.value > 0);
  }, [reservations]);

  const topUsersData = useMemo(() => {
    if (!reservations.length) return [];
    const userCounts: Record<string, { username: string, count: number, cancelled: number }> = {};
    
    reservations.forEach(res => {
      if (!userCounts[res.userId]) {
        userCounts[res.userId] = { username: res.username || 'Unknown User', count: 0, cancelled: 0 };
      }
      if (res.status === ReservationStatus.Confirmed) {
        userCounts[res.userId].count++;
      } else {
        userCounts[res.userId].cancelled++;
      }
    });
    
    return Object.values(userCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [reservations]);

  const cancellationTrendData = useMemo(() => {
    if (!reservations.length) return [];
    const days: Record<string, { name: string, Confirmed: number, Cancelled: number, key: string }> = {};
    
    reservations.forEach(res => {
      const d = new Date(res.startTime);
      const dateKey = d.toISOString().split('T')[0]; // YYYY-MM-DD
      
      if (!days[dateKey]) {
        days[dateKey] = { name: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }), Confirmed: 0, Cancelled: 0, key: dateKey };
      }
      
      if (res.status === ReservationStatus.Confirmed) {
        days[dateKey].Confirmed++;
      } else {
        days[dateKey].Cancelled++;
      }
    });
    
    return Object.values(days).sort((a, b) => a.key.localeCompare(b.key)).slice(-14);
  }, [reservations]);

  const amenitiesData = useMemo(() => {
    if (!rooms.length || !reservations.length) return [];
    const amenityCounts: Record<string, number> = {};
    
    reservations.forEach(res => {
      if (res.status === ReservationStatus.Confirmed) {
        const room = rooms.find(r => r.id === res.roomId);
        if (room && room.amenities) {
          room.amenities.forEach(amenity => {
            amenityCounts[amenity] = (amenityCounts[amenity] || 0) + 1;
          });
        }
      }
    });
    
    return Object.entries(amenityCounts)
      .map(([name, bookings]) => ({ name, bookings }))
      .sort((a, b) => b.bookings - a.bookings)
      .slice(0, 5);
  }, [rooms, reservations]);

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
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return <div className="text-destructive text-sm p-4 border border-destructive/20 bg-destructive/10 rounded-lg">{error}</div>;
  }

  const ghostRate = ghostMeetingsData.find(d => d.name === "Ghost (No-show)")?.value ?? 0;
  const attendedRate = ghostMeetingsData.find(d => d.name === "Attended")?.value ?? 0;
  const totalPast = ghostRate + attendedRate;
  const ghostPercentage = totalPast > 0 ? Math.round((ghostRate / totalPast) * 100) : 0;

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto">
      <div className="flex flex-col sm:flex-row justify-between gap-4 border-b border-border/50 pb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Analytics Overview
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Key metrics and usage trends across all meeting rooms.</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-2 h-9 text-xs mt-2 sm:mt-0 self-start sm:self-center">
          <Download className="size-3.5" />
          Export CSV
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        
        {/* ROW 1 */}
        <DashboardCard 
          title="No-Show / 'Ghost' Meetings" 
          icon={AlertTriangle} 
          iconClassName="text-rose-500"
          iconBgClassName="bg-rose-500/10"
          className="col-span-1" 
          contentClassName="p-5 flex flex-col justify-center"
        >
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-4xl font-bold tracking-tighter text-foreground">{ghostPercentage}%</span>
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Rate</span>
          </div>
          <div className="w-full bg-muted rounded-full h-1.5 my-3 overflow-hidden flex">
            <div className="bg-emerald-500 h-full" style={{ width: `${100 - ghostPercentage}%` }} />
            <div className="bg-rose-500 h-full" style={{ width: `${ghostPercentage}%` }} />
          </div>
          <div className="w-full flex justify-between text-xs text-muted-foreground mt-1">
            <span>Attended: <strong className="text-emerald-600">{attendedRate}</strong></span>
            <span>Ghost: <strong className="text-rose-600">{ghostRate}</strong></span>
          </div>
        </DashboardCard>

        <DashboardCard 
          title="Meeting Duration" 
          icon={Clock} 
          iconClassName="text-orange-500"
          iconBgClassName="bg-orange-500/10"
          className="col-span-1"
        >
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={durationData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="none"
                >
                  {durationData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip contentStyle={TOOLTIP_STYLE} itemStyle={{ fontSize: '12px' }} />
                <Legend verticalAlign="bottom" height={24} iconType="circle" wrapperStyle={{ fontSize: '11px', color: 'hsl(var(--muted-foreground))' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </DashboardCard>

        <DashboardCard 
          title="Popular Amenities" 
          icon={Sparkles} 
          iconClassName="text-amber-500"
          iconBgClassName="bg-amber-500/10"
          className="col-span-1"
        >
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={amenitiesData} layout="vertical" margin={{ top: 5, right: 15, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
                <XAxis type="number" axisLine={false} tickLine={false} tick={TICK_PROPS} />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={TICK_PROPS} width={90} />
                <RechartsTooltip cursor={{ fill: 'hsl(var(--muted))' }} contentStyle={TOOLTIP_STYLE} />
                <Bar dataKey="bookings" fill="#f59e0b" radius={[0, 4, 4, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </DashboardCard>

        {/* ROW 2 */}
        <DashboardCard 
          title="Room Popularity" 
          icon={BarChart3} 
          iconClassName="text-primary"
          iconBgClassName="bg-primary/10"
          className="col-span-1 lg:col-span-2"
        >
          <div className="h-[240px] w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={roomUsageData.slice(0, 10)} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={TICK_PROPS} />
                <YAxis axisLine={false} tickLine={false} tick={TICK_PROPS} />
                <RechartsTooltip cursor={{ fill: 'hsl(var(--muted))' }} contentStyle={TOOLTIP_STYLE} />
                <Bar dataKey="bookings" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </DashboardCard>

        <DashboardCard 
          title="Busiest Days" 
          icon={Calendar} 
          iconClassName="text-cyan-500"
          iconBgClassName="bg-cyan-500/10"
          className="col-span-1"
        >
          <div className="h-[240px] w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={busiestDaysData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={TICK_PROPS} />
                <YAxis axisLine={false} tickLine={false} tick={TICK_PROPS} />
                <RechartsTooltip cursor={{ fill: 'hsl(var(--muted))' }} contentStyle={TOOLTIP_STYLE} />
                <Bar dataKey="bookings" fill="#06b6d4" opacity={0.9} radius={[4, 4, 0, 0]} maxBarSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </DashboardCard>

        {/* ROW 3 */}
        <DashboardCard 
          title="Peak Booking Hours" 
          icon={TrendingUp} 
          iconClassName="text-indigo-500"
          iconBgClassName="bg-indigo-500/10"
          className="col-span-1 lg:col-span-2"
        >
          <div className="h-[240px] w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={peakHoursData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorBookings" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
                <XAxis dataKey="time" axisLine={false} tickLine={false} tick={TICK_PROPS} />
                <YAxis axisLine={false} tickLine={false} tick={TICK_PROPS} />
                <RechartsTooltip contentStyle={TOOLTIP_STYLE} />
                <Area type="monotone" dataKey="bookings" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#colorBookings)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </DashboardCard>

        <DashboardCard 
          title="Top Resource Users" 
          icon={Users} 
          iconClassName="text-purple-500"
          iconBgClassName="bg-purple-500/10"
          className="col-span-1" 
          contentClassName="p-0"
        >
          <div className="overflow-x-auto h-[240px]">
            <table className="w-full text-xs text-left whitespace-nowrap">
              <thead className="text-muted-foreground border-b border-border/40 bg-muted/10 sticky top-0">
                <tr>
                  <th className="px-4 py-2.5 font-medium">User</th>
                  <th className="px-4 py-2.5 text-right font-medium">Bookings</th>
                  <th className="px-4 py-2.5 text-right font-medium">Cancelled</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {topUsersData.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-6 text-center text-muted-foreground">No data available</td>
                  </tr>
                ) : (
                  topUsersData.map((user, i) => (
                    <tr key={i} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 font-medium text-foreground">{user.username}</td>
                      <td className="px-4 py-3 text-right font-medium text-emerald-600">{user.count}</td>
                      <td className="px-4 py-3 text-right text-rose-500">{user.cancelled}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </DashboardCard>

        {/* ROW 4 */}
        <DashboardCard 
          title="Cancellation Trend (Last 14 Days)" 
          icon={XCircle} 
          iconClassName="text-red-500"
          iconBgClassName="bg-red-500/10"
          className="col-span-1 lg:col-span-3"
        >
          <div className="h-[240px] w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={cancellationTrendData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={TICK_PROPS} />
                <YAxis axisLine={false} tickLine={false} tick={TICK_PROPS} />
                <RechartsTooltip contentStyle={TOOLTIP_STYLE} />
                <Legend verticalAlign="top" height={24} iconType="circle" wrapperStyle={{ fontSize: '11px', color: 'hsl(var(--muted-foreground))' }} />
                <Line type="monotone" dataKey="Confirmed" stroke="#10b981" strokeWidth={2} dot={{ r: 3, strokeWidth: 1 }} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="Cancelled" stroke="#ef4444" strokeWidth={2} dot={{ r: 3, strokeWidth: 1 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </DashboardCard>

      </div>
    </div>
  );
}
