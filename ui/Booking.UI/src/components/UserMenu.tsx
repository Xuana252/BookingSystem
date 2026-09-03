import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { clearToken, getCurrentUsername } from "../lib/auth";

export function UserMenu() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const username = getCurrentUsername();

  function handleLogout() {
    clearToken();
    navigate("/login");
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen((open) => !open)}
        aria-label="Account menu"
        className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-sm font-medium text-indigo-700 hover:bg-indigo-50"
      >
        {username ? username[0]!.toUpperCase() : "?"}
      </button>

      {isOpen && (
        <div className="absolute right-0 z-10 mt-2 w-48 rounded border border-slate-200 bg-white shadow-lg">
          <div className="truncate border-b border-slate-100 px-3 py-2 text-sm font-medium text-slate-900">
            {username ?? "Account"}
          </div>
          <button onClick={handleLogout} className="w-full px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-50">
            Log out
          </button>
        </div>
      )}
    </div>
  );
}
