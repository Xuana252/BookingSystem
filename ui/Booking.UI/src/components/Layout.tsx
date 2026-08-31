import { Link, Outlet } from "react-router-dom";
import { NotificationBell } from "./NotificationBell";
import { UserMenu } from "./UserMenu";
import { Sidebar } from "./Sidebar";
import { ReservationHubProvider } from "../contexts/ReservationHubContext";
import { isAuthenticated } from "../lib/auth";

export function Layout() {
  return (
    <ReservationHubProvider>
      <div className="min-h-screen bg-slate-50">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
          <Link to="/" className="text-lg font-semibold text-indigo-700">
            BookingSystem
          </Link>
          {isAuthenticated() && (
            <div className="flex items-center gap-3">
              <NotificationBell />
              <UserMenu />
            </div>
          )}
        </header>
        <div className="flex">
          {isAuthenticated() && <Sidebar />}
          <main className="min-w-0 flex-1">
            <Outlet />
          </main>
        </div>
      </div>
    </ReservationHubProvider>
  );
}
