import {
  Building2,
  Calendar,
  CalendarDays,
  PieChart,
  ShieldCheck,
  Sparkles,
  User,
  Users,
  Settings,
  ShieldAlert,
  Wrench,
  Contact,
  Sliders
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { getCurrentUsername, isAdmin } from "../lib/auth";
import { Badge } from "./ui/badge";

function navItemClass({ isActive }: { isActive: boolean }): string {
  return `group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150 ${
    isActive
      ? "border border-sidebar-border bg-sidebar-accent font-semibold text-primary shadow-xs"
      : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground"
  }`;
}

export function Sidebar() {
  const admin = isAdmin();
  const username = getCurrentUsername();

  return (
    <aside className="hidden w-60 shrink-0 flex-col justify-between border-r border-sidebar-border bg-sidebar px-3 py-5 sm:flex">
      <div className="space-y-5">
        <div>
          <div className="px-3 pb-2 text-[11px] font-semibold tracking-wider text-muted-foreground/70 uppercase">
            Navigation
          </div>
          <nav className="space-y-1">
            <NavLink to="/" end className={navItemClass}>
              <CalendarDays className="size-4 shrink-0 transition-transform group-hover:scale-110" />
              <span>Calendar</span>
            </NavLink>
            <NavLink to="/my-bookings" className={navItemClass}>
              <Calendar className="size-4 shrink-0 transition-transform group-hover:scale-110" />
              <span>My Bookings</span>
            </NavLink>
            <NavLink to="/directory" className={navItemClass}>
              <Contact className="size-4 shrink-0 transition-transform group-hover:scale-110" />
              <span>Team Directory</span>
            </NavLink>
            <NavLink to="/preferences" className={navItemClass}>
              <Sliders className="size-4 shrink-0 transition-transform group-hover:scale-110" />
              <span>My Preferences</span>
            </NavLink>
            <button
              type="button"
              onClick={() =>
                window.dispatchEvent(new CustomEvent("toggle-ai-chat"))
              }
              className="w-full group flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground transition-all duration-150 cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <Sparkles className="size-4 shrink-0 text-indigo-500 transition-transform group-hover:scale-110" />
                <span>AI Concierge</span>
              </div>
              <span className="rounded-full bg-indigo-500/15 border border-indigo-500/25 px-1.5 py-0.2 text-[9px] font-bold text-indigo-500 dark:text-indigo-400">
                AI
              </span>
            </button>
          </nav>
        </div>

        {admin && (
          <div>
            <div className="px-3 pb-2 text-[11px] font-semibold tracking-wider text-muted-foreground/70 uppercase">
              Admin Area
            </div>
            <nav className="space-y-1">
              <NavLink to="/admin/analytics" className={navItemClass}>
                <PieChart className="size-4 shrink-0 transition-transform group-hover:scale-110" />
                <span>Analytics</span>
              </NavLink>
              <NavLink to="/admin/rooms" className={navItemClass}>
                <Building2 className="size-4 shrink-0 transition-transform group-hover:scale-110" />
                <span>Manage Rooms</span>
              </NavLink>
              <NavLink to="/admin/users" className={navItemClass}>
                <Users className="size-4 shrink-0 transition-transform group-hover:scale-110" />
                <span>Manage Users</span>
              </NavLink>
              <NavLink to="/admin/settings" className={navItemClass}>
                <Settings className="size-4 shrink-0 transition-transform group-hover:scale-110" />
                <span>Global Settings</span>
              </NavLink>
              <NavLink to="/admin/logs" className={navItemClass}>
                <ShieldAlert className="size-4 shrink-0 transition-transform group-hover:scale-110" />
                <span>Audit Logs</span>
              </NavLink>
              <NavLink to="/admin/maintenance" className={navItemClass}>
                <Wrench className="size-4 shrink-0 transition-transform group-hover:scale-110" />
                <span>Maintenance</span>
              </NavLink>
            </nav>
          </div>
        )}
      </div>

      {/* Footer info card */}
      <div className="rounded-xl border border-sidebar-border bg-card p-3 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            {admin ? (
              <ShieldCheck className="size-4" />
            ) : (
              <User className="size-4" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs font-semibold text-foreground">
              {username ?? "User"}
            </div>
            <Badge
              variant={admin ? "indigo" : "secondary"}
              className="mt-0.5 text-[10px] py-0 px-1.5 h-4"
            >
              {admin ? "Administrator" : "Employee"}
            </Badge>
          </div>
        </div>
      </div>
    </aside>
  );
}
