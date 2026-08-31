import { NavLink } from "react-router-dom";
import { isAdmin } from "../lib/auth";

function navItemClass({ isActive }: { isActive: boolean }): string {
  return `flex items-center gap-2 rounded border-l-2 px-3 py-2 text-sm font-medium ${
    isActive ? "border-indigo-600 bg-indigo-50 text-indigo-700" : "border-transparent text-slate-600 hover:bg-slate-50"
  }`;
}

export function Sidebar() {
  return (
    <aside className="hidden w-56 shrink-0 border-r border-slate-200 bg-white px-3 py-6 sm:block">
      <nav className="space-y-1">
        <NavLink to="/" end className={navItemClass}>
          <span aria-hidden="true">🏠</span> Home
        </NavLink>
        {/* UX convenience only — hides the link for non-admins. The Api enforces the real
            boundary via [Authorize(Roles = "Admin")] on POST /api/rooms regardless. */}
        {isAdmin() && (
          <NavLink to="/rooms/new" className={navItemClass}>
            <span aria-hidden="true">➕</span> Create room
          </NavLink>
        )}
      </nav>
    </aside>
  );
}
