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

// Mock Data for the charts
const weeklyData = [
  { day: "Mon", hours: 4.5 },
  { day: "Tue", hours: 3.0 },
  { day: "Wed", hours: 6.5 },
  { day: "Thu", hours: 2.0 },
  { day: "Fri", hours: 1.5 },
];

const roomPreferences = [
  { name: "Focus Booths", value: 45, color: "#8b5cf6" }, // violet-500
  { name: "Boardrooms", value: 35, color: "#ec4899" }, // pink-500
  { name: "Creative Labs", value: 20, color: "#f59e0b" }, // amber-500
];

const topCollaborators = [
  { name: "Sarah J.", hours: 6.5, role: "Product Manager" },
  { name: "Marcus T.", hours: 4.0, role: "Senior Engineer" },
  { name: "Elena R.", hours: 3.5, role: "Designer" },
  { name: "Alex M.", hours: 2.0, role: "Marketing" },
];

export function MyInsightsPage() {
  const [loading, setLoading] = useState(true);

  // Simulate data fetching
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center text-muted-foreground animate-pulse">
        Gathering your insights...
      </div>
    );
  }

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
            <span className="text-3xl font-bold text-foreground">17.5</span>
            <span className="text-sm font-medium text-muted-foreground">hrs</span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
            <TrendingDown className="size-3.5" />
            <span>2.5 hrs less than last week</span>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2 text-muted-foreground mb-3">
            <CalendarCheck className="size-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">Avg Duration</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-foreground">45</span>
            <span className="text-sm font-medium text-muted-foreground">mins</span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-xs font-medium text-rose-600 dark:text-rose-400">
            <TrendingUp className="size-3.5" />
            <span>5 mins longer than avg</span>
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
            <span className="text-3xl font-bold text-indigo-700 dark:text-indigo-300">14</span>
            <span className="text-sm font-medium text-indigo-600/70 dark:text-indigo-400/70">meetings</span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-xs font-medium text-indigo-600/90 dark:text-indigo-400/90 relative z-10">
            <span>Flawless attendance! Keep it up.</span>
          </div>
        </div>
      </div>

      {/* Smart Recommendation */}
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 shadow-sm flex items-start gap-3">
        <div className="rounded-full bg-amber-500/20 p-2 text-amber-600 dark:text-amber-400 shrink-0">
          <Lightbulb className="size-4" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-amber-800 dark:text-amber-300">Smart Recommendation</h3>
          <p className="text-xs text-amber-700/80 dark:text-amber-400/80 mt-1 leading-relaxed">
            You tend to book 20-person boardrooms for meetings with only 2-3 attendees. Try booking <strong>Focus Booths</strong> for smaller syncs to free up larger rooms for the rest of the team!
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Weekly Distribution Chart */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm flex flex-col">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-foreground">Weekly Distribution</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Meeting hours by day</p>
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
                  formatter={(value: number) => [`${value} hours`, 'Duration']}
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
                    formatter={(value: number) => [`${value}%`, 'Usage']}
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
