import { Link, Outlet } from "react-router-dom";
import { NotificationBell } from "./NotificationBell";
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
          {isAuthenticated() && <NotificationBell />}
        </header>
        <main>
          <Outlet />
        </main>
      </div>
    </ReservationHubProvider>
  );
}
