import { Link, Outlet } from "react-router-dom";
import { Calendar, Radio } from "lucide-react";
import { NotificationBell } from "./NotificationBell";
import { UserMenu } from "./UserMenu";
import { Sidebar } from "./Sidebar";
import { ReservationHubProvider } from "../contexts/ReservationHubContext";
import { isAuthenticated } from "../lib/auth";

export function Layout() {
  const authenticated = isAuthenticated();

  return (
    <ReservationHubProvider>
      <div className="flex h-screen max-h-screen flex-col overflow-hidden bg-background text-foreground transition-colors">
        {/* Modern Header */}
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between border-b border-border bg-card px-4 sm:px-6 shadow-xs">
          <div className="flex items-center gap-3">
            <Link to="/" className="group flex items-center gap-2.5 focus:outline-none">
              <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-tr from-primary via-indigo-600 to-violet-500 text-white shadow-md shadow-primary/20 transition-transform group-hover:scale-105">
                <Calendar className="size-4.5" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="text-base font-bold tracking-tight text-foreground">
                    Booking<span className="text-primary">System</span>
                  </span>
                  <span className="hidden rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary sm:inline-flex">
                    Pro
                  </span>
                </div>
              </div>
            </Link>
          </div>

          {authenticated && (
            <div className="flex items-center gap-3">
              <div className="hidden items-center gap-1.5 rounded-full border border-border/80 bg-muted/50 px-2.5 py-1 text-[11px] font-medium text-muted-foreground md:flex">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
                </span>
                <Radio className="size-3 text-emerald-600 dark:text-emerald-400" />
                <span>Live Sync</span>
              </div>

              <div className="h-4 w-px bg-border/80 hidden sm:block" />

              <NotificationBell />
              <UserMenu />
            </div>
          )}
        </header>

        {/* Content Area */}
        <div className="flex flex-1 overflow-hidden">
          {authenticated && <Sidebar />}
          <main className="min-w-0 flex-1 overflow-auto bg-background px-4 py-5 sm:px-6">
            <div className="mx-auto max-w-[1920px]">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </ReservationHubProvider>
  );
}
