import { Link, Outlet } from "react-router-dom";
import { NotificationBell } from "./NotificationBell";
import { UserMenu } from "./UserMenu";
import { Sidebar } from "./Sidebar";
import { ReservationHubProvider } from "../contexts/ReservationHubContext";
import { isAuthenticated } from "../lib/auth";

export function Layout() {
  return (
    <ReservationHubProvider>
      <div className="h-screen max-h-screen bg-slate-50 overflow-hidden grid grid-rows-[auto_1fr]">
        <header className="flex items-center justify-between border-b border-indigo-700 bg-indigo-600 px-6 py-2">
          <Link to="/" className="text-lg font-semibold text-white">
            BookingSystem
          </Link>
          {isAuthenticated() && (
            <div className="flex items-center gap-3">
              <NotificationBell />
              <UserMenu />
            </div>
          )}
        </header>
        <div className="flex overflow-hidden">
          {isAuthenticated() && <Sidebar />}
          <main className="min-w-0 flex-1 overflow-auto mx-auto max-w-[1980px] px-4 py-4">
            <Outlet />
          </main>
        </div>
      </div>
    </ReservationHubProvider>
  );
}
