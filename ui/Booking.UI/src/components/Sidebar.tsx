import { NavLink } from "react-router-dom";
import { Building2, CalendarDays, PlusCircle, ShieldCheck, User, UserPlus, Users } from "lucide-react";
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
          </nav>
        </div>

        {admin && (
          <div>
            <div className="px-3 pb-2 text-[11px] font-semibold tracking-wider text-muted-foreground/70 uppercase">
              Admin Area
            </div>
            <nav className="space-y-1">
              <NavLink to="/admin/rooms" className={navItemClass}>
                <Building2 className="size-4 shrink-0 transition-transform group-hover:scale-110" />
                <span>Manage Rooms</span>
              </NavLink>
              <NavLink to="/admin/rooms/new" className={navItemClass}>
                <PlusCircle className="size-4 shrink-0 transition-transform group-hover:scale-110" />
                <span>Create Room</span>
              </NavLink>
              <NavLink to="/admin/users" className={navItemClass}>
                <Users className="size-4 shrink-0 transition-transform group-hover:scale-110" />
                <span>Manage Users</span>
              </NavLink>
              <NavLink to="/admin/users/new" className={navItemClass}>
                <UserPlus className="size-4 shrink-0 transition-transform group-hover:scale-110" />
                <span>Create User</span>
              </NavLink>
            </nav>
          </div>
        )}
      </div>

      {/* Footer info card */}
      <div className="rounded-xl border border-sidebar-border bg-card p-3 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            {admin ? <ShieldCheck className="size-4" /> : <User className="size-4" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs font-semibold text-foreground">{username ?? "User"}</div>
            <Badge variant={admin ? "indigo" : "secondary"} className="mt-0.5 text-[10px] py-0 px-1.5 h-4">
              {admin ? "Administrator" : "Employee"}
            </Badge>
          </div>
        </div>
      </div>
    </aside>
  );
}
