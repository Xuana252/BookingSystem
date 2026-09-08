import { useEffect, useRef, useState } from "react";
import { Bell, Check, CheckCheck, Inbox, Trash2 } from "lucide-react";
import { useReservationHub } from "../hooks/useReservationHub";

function formatNotificationTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  if (isToday) {
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }
  return `${date.toLocaleDateString([], { month: "short", day: "numeric" })} · ${date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
}

export function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearNotifications } = useReservationHub();
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
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground shadow-xs ring-2 ring-background">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-2 w-84 animate-in fade-in-0 zoom-in-95 duration-100 rounded-xl border border-border bg-popover text-popover-foreground shadow-2xl">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground">Notifications</span>
              {unreadCount > 0 ? (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                  {unreadCount} new
                </span>
              ) : notifications.length > 0 ? (
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                  {notifications.length}
                </span>
              ) : null}
            </div>
            <div className="flex items-center gap-2.5">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  className="flex items-center gap-1 text-xs font-medium text-primary transition-colors hover:text-primary/80"
                  title="Mark all as read"
                >
                  <CheckCheck className="size-3.5" />
                  <span>Mark all read</span>
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  type="button"
                  onClick={clearNotifications}
                  className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-destructive"
                  title="Clear all notifications"
                >
                  <Trash2 className="size-3" />
                  <span>Clear</span>
                </button>
              )}
            </div>
          </div>

          <ul className="max-h-80 overflow-y-auto divide-y divide-border/60 p-1">
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
                <li
                  key={notification.id}
                  onClick={() => {
                    if (!notification.isRead) {
                      markAsRead(notification.id);
                    }
                  }}
                  className={`group relative flex items-start justify-between gap-2.5 rounded-lg p-2.5 transition-all ${
                    notification.isRead
                      ? "hover:bg-muted/40 opacity-75"
                      : "bg-primary/[0.04] hover:bg-primary/[0.08] cursor-pointer"
                  }`}
                >
                  <div className="flex items-start gap-2.5 min-w-0 flex-1">
                    <div className="mt-1.5 flex size-2 shrink-0 items-center justify-center">
                      {!notification.isRead && (
                        <span className="size-2 rounded-full bg-primary ring-2 ring-primary/20" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-xs leading-relaxed ${
                          notification.isRead ? "text-muted-foreground" : "font-medium text-foreground"
                        }`}
                      >
                        {notification.message}
                      </p>
                      <div className="mt-1 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        <span>{formatNotificationTime(notification.receivedAt)}</span>
                        {!notification.isRead && (
                          <span className="font-semibold text-primary">· New</span>
                        )}
                      </div>
                    </div>
                  </div>
                  {!notification.isRead && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        markAsRead(notification.id);
                      }}
                      title="Mark as read"
                      aria-label="Mark as read"
                      className="shrink-0 rounded-md p-1 text-muted-foreground/60 transition-colors hover:bg-primary/10 hover:text-primary"
                    >
                      <Check className="size-3.5" />
                    </button>
                  )}
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
