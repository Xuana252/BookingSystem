import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, Monitor, Moon, Sun, User } from "lucide-react";
import { clearToken, getCurrentUsername, isAdmin } from "../lib/auth";
import { useTheme } from "../hooks/useTheme";
import { Badge } from "./ui/badge";

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
        className="flex size-8.5 items-center justify-center rounded-full bg-gradient-to-tr from-primary to-violet-500 p-0.5 text-white shadow-sm ring-2 ring-primary/20 transition-all hover:ring-primary/40 focus:outline-none"
      >
        <span className="flex size-full items-center justify-center rounded-full bg-card text-xs font-bold text-foreground">
          {username ? username[0]!.toUpperCase() : "?"}
        </span>
      </button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-2 w-60 animate-in fade-in-0 zoom-in-95 duration-100 rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-2xl">
          {/* User profile header */}
          <div className="flex items-center gap-2.5 px-3 py-2.5 border-b border-border">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <User className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-foreground">{username ?? "Account"}</div>
              <Badge variant={admin ? "indigo" : "secondary"} className="mt-0.5 text-[10px] px-1.5 py-0 h-4">
                {admin ? "Administrator" : "Employee"}
              </Badge>
            </div>
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
