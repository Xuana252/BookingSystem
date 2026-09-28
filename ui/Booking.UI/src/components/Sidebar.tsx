import { useState, useEffect } from "react";
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
  Sliders,
  Menu
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { getCurrentUsername, isAdmin } from "../lib/auth";
import { Badge } from "./ui/badge";
import { getAvatar } from "../lib/avatar";

export function Sidebar() {
  const admin = isAdmin();
  const username = getCurrentUsername();
  
  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem("sidebarCollapsed") === "true";
  });

  useEffect(() => {
    localStorage.setItem("sidebarCollapsed", String(collapsed));
  }, [collapsed]);

  function navItemClass({ isActive }: { isActive: boolean }): string {
    return `relative group flex items-center ${
      collapsed ? "justify-center w-10 h-10 mx-auto" : "gap-3 w-full px-3 py-2"
    } rounded-lg text-sm transition-colors duration-150 ${
      isActive
        ? "text-primary font-semibold before:absolute before:-left-2 before:top-1/2 before:-translate-y-1/2 before:h-6 before:w-[3px] before:rounded-r-full before:bg-primary"
        : "text-muted-foreground font-medium hover:bg-sidebar-accent/50 hover:text-foreground"
    }`;
  }

  return (
    <aside className={`relative hidden shrink-0 flex-col justify-between border-r border-sidebar-border bg-sidebar sm:flex transition-all duration-300 ${collapsed ? 'w-14' : 'w-60'}`}>
      
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Top Toggle Area */}
        <div className={`flex items-center ${collapsed ? "justify-center" : "px-4 justify-between"} h-14 shrink-0 border-b border-border/30`}>
          {!collapsed && <span className="text-[11px] font-bold tracking-wider text-muted-foreground/70 uppercase">Navigation</span>}
          <button 
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground transition-colors focus:outline-none"
            aria-label="Toggle Sidebar"
          >
            <Menu className="size-4" />
          </button>
        </div>

        {/* Scrollable Nav Area */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden py-4 px-2 space-y-6">
          <nav className="space-y-1">
            <NavLink to="/" end className={navItemClass} title="Calendar">
              <CalendarDays className="size-4 shrink-0 transition-transform group-hover:scale-110" />
              {!collapsed && <span>Calendar</span>}
            </NavLink>
            <NavLink to="/my-bookings" className={navItemClass} title="My Bookings">
              <Calendar className="size-4 shrink-0 transition-transform group-hover:scale-110" />
              {!collapsed && <span>My Bookings</span>}
            </NavLink>
            <NavLink to="/directory" className={navItemClass} title="Team Directory">
              <Contact className="size-4 shrink-0 transition-transform group-hover:scale-110" />
              {!collapsed && <span>Team Directory</span>}
            </NavLink>
            <NavLink to="/preferences" className={navItemClass} title="My Preferences">
              <Sliders className="size-4 shrink-0 transition-transform group-hover:scale-110" />
              {!collapsed && <span>My Preferences</span>}
            </NavLink>
            <NavLink to="/insights" className={navItemClass} title="My Insights">
              <PieChart className="size-4 shrink-0 transition-transform group-hover:scale-110" />
              {!collapsed && <span>My Insights</span>}
            </NavLink>
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent("toggle-ai-chat"))}
              title="AI Concierge"
              className={`w-full relative group flex items-center ${collapsed ? "justify-center w-10 h-10 mx-auto" : "justify-between px-3 py-2"} rounded-lg text-sm font-medium text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground transition-all duration-150 cursor-pointer`}
            >
              <div className="flex items-center gap-3">
                <Sparkles className="size-4 shrink-0 text-indigo-500 transition-transform group-hover:scale-110" />
                {!collapsed && <span>AI Concierge</span>}
              </div>
              {!collapsed && (
                <span className="rounded-full bg-indigo-500/15 border border-indigo-500/25 px-1.5 py-0.2 text-[9px] font-bold text-indigo-500 dark:text-indigo-400">
                  AI
                </span>
              )}
            </button>
          </nav>

          {admin && (
            <div>
              <div className={`px-2 pb-2 text-[10px] font-semibold tracking-wider text-muted-foreground/70 uppercase transition-all duration-300 ${collapsed ? "opacity-0 h-0 overflow-hidden" : "opacity-100"}`}>
                {!collapsed && "Admin"}
              </div>
              <nav className="space-y-1">
                <NavLink to="/admin/analytics" className={navItemClass} title="Analytics">
                  <PieChart className="size-4 shrink-0 transition-transform group-hover:scale-110" />
                  {!collapsed && <span>Analytics</span>}
                </NavLink>
                <NavLink to="/admin/rooms" className={navItemClass} title="Manage Rooms">
                  <Building2 className="size-4 shrink-0 transition-transform group-hover:scale-110" />
                  {!collapsed && <span>Manage Rooms</span>}
                </NavLink>
                <NavLink to="/admin/users" className={navItemClass} title="Manage Users">
                  <Users className="size-4 shrink-0 transition-transform group-hover:scale-110" />
                  {!collapsed && <span>Manage Users</span>}
                </NavLink>
                <NavLink to="/admin/settings" className={navItemClass} title="Global Settings">
                  <Settings className="size-4 shrink-0 transition-transform group-hover:scale-110" />
                  {!collapsed && <span>Global Settings</span>}
                </NavLink>
                <NavLink to="/admin/logs" className={navItemClass} title="Audit Logs">
                  <ShieldAlert className="size-4 shrink-0 transition-transform group-hover:scale-110" />
                  {!collapsed && <span>Audit Logs</span>}
                </NavLink>
                <NavLink to="/admin/maintenance" className={navItemClass} title="Maintenance">
                  <Wrench className="size-4 shrink-0 transition-transform group-hover:scale-110" />
                  {!collapsed && <span>Maintenance</span>}
                </NavLink>
              </nav>
            </div>
          )}
        </div>
      </div>

      {/* Footer info card */}
      <div className={`p-2 shrink-0 border-t border-border/30`}>
        <div className={`rounded-xl bg-card border border-sidebar-border shadow-xs transition-all duration-300 ${collapsed ? "p-1.5 flex justify-center" : "p-2.5"}`}>
          <div className={`flex items-center ${collapsed ? "justify-center" : "gap-2.5"}`}>
            <div className={`flex shrink-0 items-center justify-center rounded-lg bg-white overflow-hidden shadow-xs ring-1 ring-border ${collapsed ? "size-6" : "size-8"}`}>
              <img src={getAvatar(username)} alt={username || "User"} className="h-full w-full object-cover" />
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-semibold text-foreground">
                  {username ?? "User"}
                </div>
                <Badge
                  variant={admin ? "indigo" : "secondary"}
                  className="mt-0.5 text-[9px] py-0 px-1 h-3.5 leading-none"
                >
                  {admin ? "Administrator" : "Employee"}
                </Badge>
              </div>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
