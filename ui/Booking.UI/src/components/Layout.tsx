import { Link, Outlet } from "react-router-dom";

export function Layout() {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-6 py-4">
        <Link to="/" className="text-lg font-semibold text-slate-900">
          BookingSystem
        </Link>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
