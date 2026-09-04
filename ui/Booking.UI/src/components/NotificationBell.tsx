import { useEffect, useRef, useState } from "react";
import { Bell, Inbox, Trash2 } from "lucide-react";
import { useReservationHub } from "../hooks/useReservationHub";

export function NotificationBell() {
  const { notifications, clearNotifications } = useReservationHub();
  const [isOpen, setIsOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  return (
    <div className="relative" ref={bellRef}>
      <button
        onClick={() => setIsOpen((open) => !open)}
        aria-label="Notifications"
        className="relative flex size-8.5 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-all hover:bg-muted hover:text-foreground focus:outline-none"
      >
        <Bell className="size-4" />
        {notifications.length > 0 && (
          <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground shadow-xs ring-2 ring-background">
            {notifications.length > 9 ? "9+" : notifications.length}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-2 w-80 animate-in fade-in-0 zoom-in-95 duration-100 rounded-xl border border-border bg-popover text-popover-foreground shadow-2xl">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground">Notifications</span>
              {notifications.length > 0 && (
                <span className="rounded-full bg-primary/10 px-2 py-0.2 text-[10px] font-semibold text-primary">
                  {notifications.length}
                </span>
              )}
            </div>
            {notifications.length > 0 && (
              <button
                onClick={clearNotifications}
                className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-destructive"
              >
                <Trash2 className="size-3" />
                <span>Clear</span>
              </button>
            )}
          </div>

          <ul className="max-h-80 overflow-y-auto divide-y divide-border p-1">
            {notifications.length === 0 ? (
              <li className="flex flex-col items-center justify-center px-4 py-8 text-center text-muted-foreground">
                <div className="flex size-10 items-center justify-center rounded-full bg-muted/60 text-muted-foreground/60 mb-2">
                  <Inbox className="size-5" />
                </div>
                <p className="text-xs font-medium">All caught up!</p>
                <p className="text-[11px] text-muted-foreground/80 mt-0.5">No notifications right now.</p>
              </li>
            ) : (
              notifications.map((notification) => (
                <li key={notification.id} className="rounded-lg p-2.5 transition-colors hover:bg-muted/40">
                  <p className="text-xs font-medium text-foreground leading-relaxed">{notification.message}</p>
                  <div className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
                    <span>{new Date(notification.receivedAt).toLocaleTimeString()}</span>
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
