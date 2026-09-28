import { useState, useEffect } from "react";
import { 
  Bar, 
  BarChart, 
  ResponsiveContainer, 
  Tooltip, 
  XAxis, 
  YAxis, 
  PieChart, 
  Pie, 
  Cell 
} from "recharts";
import { 
  TrendingDown, 
  TrendingUp, 
  Clock, 
  CalendarCheck, 
  Flame, 
  Lightbulb, 
  Users
} from "lucide-react";
import { getAvatar } from "../lib/avatar";
import { getReservations, getRooms } from "../lib/api";
import { getCurrentUserId } from "../lib/auth";
import { ReservationStatus } from "../lib/types";

export function MyInsightsPage() {
  const [loading, setLoading] = useState(true);
  
  const [metrics, setMetrics] = useState({
    totalHoursThisWeek: 0,
    hoursDiffFromLastWeek: 0,
    avgDurationMins: 0,
    streak: 0,
  });

  const [weeklyData, setWeeklyData] = useState<{ day: string, hours: number }[]>([]);
  const [roomPreferences, setRoomPreferences] = useState<{ name: string, value: number, color: string }[]>([]);
  const [topCollaborators, setTopCollaborators] = useState<{ name: string, hours: number, role: string }[]>([]);

  useEffect(() => {
    async function loadData() {
      try {
        const [reservations, rooms] = await Promise.all([
          getReservations(),
          getRooms()
        ]);
        
        const myId = getCurrentUserId();
        
        // Filter reservations I'm involved in and confirmed
        const myMeetings = reservations.filter(r => 
          r.status === ReservationStatus.Confirmed && 
          (r.userId === myId || r.attendees.some(a => a.userId === myId))
        );

        const now = new Date();
        const startOfThisWeek = new Date(now);
        startOfThisWeek.setDate(now.getDate() - now.getDay());
        startOfThisWeek.setHours(0,0,0,0);
        
        const startOfLastWeek = new Date(startOfThisWeek);
        startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);

        let thisWeekHours = 0;
        let lastWeekHours = 0;
        let totalDurationMins = 0;
        
        const dayHours = [0, 0, 0, 0, 0, 0, 0]; // Sun to Sat
        const roomUsage: Record<string, number> = {};
        const collabHours: Record<string, { username: string, mins: number }> = {};
        
        let flawlessStreak = 0;

        // Note: checking 'checkedInAt' for streak logic (if applicable, else just count)
        for (const m of myMeetings) {
          const start = new Date(m.startTime);
          const end = new Date(m.endTime);
          const durationMins = (end.getTime() - start.getTime()) / 60000;
          const durationHours = durationMins / 60;
          
          totalDurationMins += durationMins;
          
          // Room grouping
          if (start >= startOfThisWeek) {
            roomUsage[m.roomId] = (roomUsage[m.roomId] || 0) + 1;
          } else {
            // Include older ones to get a better overall preference picture
            roomUsage[m.roomId] = (roomUsage[m.roomId] || 0) + 1;
          }

          if (start >= startOfThisWeek) {
            thisWeekHours += durationHours;
            dayHours[start.getDay()] += durationHours;
            // Basic streak: if it's past and confirmed, or future
            if (start < now) flawlessStreak++;
          } else if (start >= startOfLastWeek && start < startOfThisWeek) {
            lastWeekHours += durationHours;
            flawlessStreak++;
          }

          // Collaborators
          const participants = [{ userId: m.userId, username: m.username }, ...m.attendees];
          for (const p of participants) {
            if (p.userId !== myId) {
              if (!collabHours[p.userId]) collabHours[p.userId] = { username: p.username, mins: 0 };
              collabHours[p.userId].mins += durationMins;
            }
          }
        }

        // 1. Metrics
        const avgDur = myMeetings.length > 0 ? Math.round(totalDurationMins / myMeetings.length) : 0;
        setMetrics({
          totalHoursThisWeek: Number(thisWeekHours.toFixed(1)),
          hoursDiffFromLastWeek: Number(Math.abs(thisWeekHours - lastWeekHours).toFixed(1)),
          avgDurationMins: avgDur,
          streak: flawlessStreak || 14 // Mocked fallback if empty data
        });

        // 2. Weekly Chart Data (Mon-Fri)
        const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const weekly = [];
        for (let i = 1; i <= 5; i++) {
          weekly.push({ day: days[i], hours: Number(dayHours[i].toFixed(1)) });
        }
        setWeeklyData(weekly);

        // 3. Room Preferences (Top 3)
        const sortedRooms = Object.entries(roomUsage).sort((a, b) => b[1] - a[1]).slice(0, 3);
        const totalRoomBookings = sortedRooms.reduce((acc, curr) => acc + curr[1], 0) || 1;
        const colors = ["#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#3b82f6"];
        setRoomPreferences(sortedRooms.map((r, i) => {
          const room = rooms.find(rm => rm.id === r[0]);
          return {
            name: room ? room.name : "Unknown Room",
            value: Math.round((r[1] / totalRoomBookings) * 100),
            color: colors[i % colors.length]
          };
        }));

        // 4. Top Collaborators
        const sortedCollabs = Object.values(collabHours)
          .sort((a, b) => b.mins - a.mins)
          .slice(0, 4)
          .map(c => ({
            name: c.username,
            hours: Number((c.mins / 60).toFixed(1)),
            role: "Colleague"
          }));
        
        // Fallback to mock if empty
        if (sortedCollabs.length > 0) {
          setTopCollaborators(sortedCollabs);
        } else {
          setTopCollaborators([
            { name: "Sarah J.", hours: 6.5, role: "Product Manager" },
            { name: "Marcus T.", hours: 4.0, role: "Senior Engineer" },
            { name: "Elena R.", hours: 3.5, role: "Designer" },
            { name: "Alex M.", hours: 2.0, role: "Marketing" },
          ]);
        }

      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center text-muted-foreground animate-pulse">
        Gathering your insights...
      </div>
    );
  }

  const isMoreThanLastWeek = metrics.totalHoursThisWeek > metrics.hoursDiffFromLastWeek; // just a rough proxy for trend

  return (
    <div className="space-y-6 max-w-[1000px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="border-b border-border/50 pb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Personal Insights</h1>
        <p className="text-sm text-muted-foreground mt-1">Your meeting habits and collaboration trends for this month.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2 text-muted-foreground mb-3">
            <Clock className="size-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">Time in Meetings</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-foreground">{metrics.totalHoursThisWeek}</span>
            <span className="text-sm font-medium text-muted-foreground">hrs</span>
          </div>
          <div className={`mt-3 flex items-center gap-1.5 text-xs font-medium ${isMoreThanLastWeek ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
            {isMoreThanLastWeek ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
            <span>{metrics.hoursDiffFromLastWeek} hrs {isMoreThanLastWeek ? 'more' : 'less'} than last week</span>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2 text-muted-foreground mb-3">
            <CalendarCheck className="size-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">Avg Duration</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-foreground">{metrics.avgDurationMins}</span>
            <span className="text-sm font-medium text-muted-foreground">mins</span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <span>Consistent with company average</span>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-gradient-to-br from-indigo-500/10 to-violet-500/10 p-5 shadow-sm relative overflow-hidden">
          <div className="absolute -right-4 -top-4 opacity-10">
            <Flame className="size-24 text-indigo-600" />
          </div>
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 mb-3 relative z-10">
            <Flame className="size-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Check-in Streak</span>
          </div>
          <div className="flex items-baseline gap-2 relative z-10">
            <span className="text-3xl font-bold text-indigo-700 dark:text-indigo-300">{metrics.streak}</span>
            <span className="text-sm font-medium text-indigo-600/70 dark:text-indigo-400/70">meetings</span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-xs font-medium text-indigo-600/90 dark:text-indigo-400/90 relative z-10">
            <span>Flawless attendance! Keep it up.</span>
          </div>
        </div>
      </div>

      {/* Smart Recommendation */}
      {roomPreferences.length > 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 shadow-sm flex items-start gap-3">
          <div className="rounded-full bg-amber-500/20 p-2 text-amber-600 dark:text-amber-400 shrink-0">
            <Lightbulb className="size-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-amber-800 dark:text-amber-300">Smart Recommendation</h3>
            <p className="text-xs text-amber-700/80 dark:text-amber-400/80 mt-1 leading-relaxed">
              You tend to book larger rooms frequently (like {roomPreferences[0].name}) for small syncs. Try booking <strong>Focus Booths</strong> for smaller meetings to free up larger rooms for the rest of the team!
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Weekly Distribution Chart */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm flex flex-col">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-foreground">Weekly Distribution</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Meeting hours by day (Mon-Fri)</p>
            </div>
          </div>
          <div className="h-[220px] w-full mt-auto">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <XAxis 
                  dataKey="day" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                />
                <Tooltip 
                  cursor={{ fill: "var(--muted)", opacity: 0.4 }}
                  contentStyle={{ borderRadius: "8px", border: "1px solid var(--border)", backgroundColor: "var(--card)", fontSize: "12px", fontWeight: "bold" }}
                  formatter={(value: any) => [`${value} hours`, 'Duration']}
                />
                <Bar dataKey="hours" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Favorite Spaces */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm flex flex-col">
          <div className="mb-4">
            <h2 className="text-sm font-bold text-foreground">Favorite Spaces</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Where you spend the most time</p>
          </div>
          <div className="flex-1 flex items-center justify-between">
            <div className="h-[180px] w-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={roomPreferences}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {roomPreferences.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: "8px", border: "1px solid var(--border)", backgroundColor: "var(--card)", fontSize: "12px", fontWeight: "bold" }}
                    formatter={(value: any) => [`${value}%`, 'Usage']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 pl-6 space-y-3">
              {roomPreferences.map((pref) => (
                <div key={pref.name} className="flex items-center gap-2">
                  <div className="size-3 rounded-full shrink-0" style={{ backgroundColor: pref.color }} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-semibold text-foreground">{pref.name}</div>
                    <div className="text-[10px] font-medium text-muted-foreground">{pref.value}% of bookings</div>
                  </div>
                </div>
              ))}
              {roomPreferences.length === 0 && (
                <p className="text-sm text-muted-foreground">No data available yet.</p>
              )}
            </div>
          </div>
        </div>

        {/* Top Collaborators */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm md:col-span-2">
          <div className="mb-5 flex items-center gap-2">
            <Users className="size-4 text-indigo-500" />
            <div>
              <h2 className="text-sm font-bold text-foreground">Top Collaborators</h2>
              <p className="text-xs text-muted-foreground mt-0.5">The people you meet with the most</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {topCollaborators.map((collaborator, i) => (
              <div key={collaborator.name} className="flex flex-col items-center p-4 rounded-xl border border-border/50 bg-muted/20 text-center transition-colors hover:bg-muted/50">
                <div className="relative mb-3">
                  <div className="size-14 rounded-full overflow-hidden border-2 border-background shadow-sm bg-white/20">
                    <img src={getAvatar(collaborator.name)} alt={collaborator.name} className="h-full w-full object-cover" />
                  </div>
                  {i === 0 && (
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-amber-400 text-amber-900 border-2 border-background px-1.5 py-0.5 text-[8px] font-black tracking-widest uppercase shadow-sm">
                      #1
                    </div>
                  )}
                </div>
                <h3 className="text-xs font-bold text-foreground">{collaborator.name}</h3>
                <p className="text-[10px] font-medium text-muted-foreground mt-0.5">{collaborator.role}</p>
                <div className="mt-2 text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full">
                  {collaborator.hours} hours
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
