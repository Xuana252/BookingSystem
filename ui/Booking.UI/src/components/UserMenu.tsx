import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, Monitor, Moon, Sun, User, Calendar, Sliders, LifeBuoy, PieChart } from "lucide-react";
import { clearToken, getCurrentUsername, isAdmin } from "../lib/auth";
import { useTheme } from "../hooks/useTheme";
import { Badge } from "./ui/badge";
import { getAvatar } from "../lib/avatar";

export function UserMenu() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const username = getCurrentUsername();
  const admin = isAdmin();
  const { theme, setTheme } = useTheme();

  function handleLogout() {
    clearToken();
    navigate("/login");
  }

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen((open) => !open)}
        aria-label="Account menu"
        className="relative flex size-8.5 items-center justify-center rounded-full bg-gradient-to-tr from-primary to-violet-500 p-0.5 text-white shadow-sm ring-2 ring-primary/20 transition-all hover:ring-primary/40 focus:outline-none"
      >
        <div className="flex size-full items-center justify-center rounded-full bg-white overflow-hidden">
          <img src={getAvatar(username)} alt={username || "User"} className="h-full w-full object-cover" />
        </div>
        <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full bg-emerald-500 border-2 border-background z-10" title="Online" />
      </button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-2 w-60 animate-in fade-in-0 zoom-in-95 duration-100 rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-2xl">
          {/* User profile header */}
          <div className="flex items-center gap-2.5 px-3 py-2.5 border-b border-border">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white overflow-hidden">
              <img src={getAvatar(username)} alt={username || "User"} className="h-full w-full object-cover" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-foreground">{username ?? "Account"}</div>
              <Badge variant={admin ? "indigo" : "secondary"} className="mt-0.5 text-[10px] px-1.5 py-0 h-4">
                {admin ? "Administrator" : "Employee"}
              </Badge>
            </div>
          </div>

          {/* Quick Links */}
          <div className="px-1 py-1.5 border-b border-border">
            <button
              onClick={() => {
                setIsOpen(false);
                navigate("/my-bookings");
              }}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Calendar className="size-3.5" />
              <span>My Bookings</span>
            </button>
            <button
              onClick={() => {
                setIsOpen(false);
                navigate("/insights");
              }}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <PieChart className="size-3.5" />
              <span>My Insights</span>
            </button>
            <button
              onClick={() => {
                setIsOpen(false);
                navigate("/preferences");
              }}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Sliders className="size-3.5" />
              <span>My Preferences</span>
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <LifeBuoy className="size-3.5" />
              <span>Help & Support</span>
            </button>
          </div>

          {/* Theme switcher */}
          <div className="px-3 py-2.5 border-b border-border">
            <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
              Appearance
            </div>
            <div className="grid grid-cols-3 gap-1 rounded-lg bg-muted p-1 border border-border">
              <button
                type="button"
                onClick={() => setTheme("light")}
                className={`flex items-center justify-center gap-1.5 rounded-md py-1 text-xs font-medium transition-all ${
                  theme === "light"
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="Light theme"
              >
                <Sun className="size-3.5" />
                <span>Light</span>
              </button>
              <button
                type="button"
                onClick={() => setTheme("dark")}
                className={`flex items-center justify-center gap-1.5 rounded-md py-1 text-xs font-medium transition-all ${
                  theme === "dark"
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="Dark theme"
              >
                <Moon className="size-3.5" />
                <span>Dark</span>
              </button>
              <button
                type="button"
                onClick={() => setTheme("system")}
                className={`flex items-center justify-center gap-1.5 rounded-md py-1 text-xs font-medium transition-all ${
                  theme === "system"
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="System theme"
              >
                <Monitor className="size-3.5" />
                <span>Auto</span>
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="p-1">
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10"
            >
              <LogOut className="size-3.5" />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
