import { Link, Outlet } from "react-router-dom";
import { Calendar, Radio } from "lucide-react";
import { NotificationBell } from "./NotificationBell";
import { UserMenu } from "./UserMenu";
import { Sidebar } from "./Sidebar";
import { BookingChatbot } from "./BookingChatbot";
import { ReservationHubProvider } from "../contexts/ReservationHubContext";
import { isAuthenticated } from "../lib/auth";

export function Layout() {
  const authenticated = isAuthenticated();

  return (
    <ReservationHubProvider>
      <div className="flex h-screen max-h-screen flex-col overflow-hidden bg-background text-foreground transition-colors">
        {/* Modern Header */}
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between border-b border-violet-800 bg-violet-900 px-4 sm:px-6 shadow-md">
          <div className="flex items-center gap-3">
            <Link to="/" className="group flex items-center gap-2.5 focus:outline-none">
              <div className="flex size-9 items-center justify-center transition-transform group-hover:scale-105">
                <img src="/logo.svg" alt="BookSpace Logo" className="h-full w-full object-contain" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="text-base font-bold tracking-tight text-white">
                    Book<span className="text-violet-300">Space</span>
                  </span>
                </div>
              </div>
            </Link>
          </div>

          {authenticated && (
            <div className="flex items-center gap-3">
              <div className="hidden items-center gap-1.5 rounded-full border border-violet-700/50 bg-violet-800/50 px-2.5 py-1 text-[11px] font-medium text-violet-200 md:flex">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
                </span>
                <Radio className="size-3 text-emerald-400" />
                <span>Live Sync</span>
              </div>

              <div className="h-4 w-px bg-violet-800 hidden sm:block" />

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

        {/* AI Booking Concierge Chatbot */}
        {authenticated && <BookingChatbot />}
      </div>
    </ReservationHubProvider>
  );
}
