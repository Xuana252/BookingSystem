import { createContext, useEffect, useRef, useState, type ReactNode } from "react";
import { createReservationHubConnection } from "../lib/signalr";
import { getCurrentUserId, isAuthenticated } from "../lib/auth";
import { getNotifications, markAllNotificationsAsRead, markNotificationAsRead } from "../lib/api";

export interface LiveNotification {
  id: string;
  message: string;
  receivedAt: string;
  isRead: boolean;
}

export interface ReservationHubContextValue {
  notifications: LiveNotification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
  /** Registers a callback for RoomAvailabilityChanged and returns an unsubscribe function. */
  onRoomAvailabilityChanged: (handler: (roomId: string) => void) => () => void;
}

// Optional client cache helper to keep instantaneous sync across quick tab switches
function getOptimisticReadIds(): Set<string> {
  const userId = getCurrentUserId();
  if (!userId) {
    return new Set();
  }
  try {
    const raw = localStorage.getItem(`bookingsystem.read_notifications.${userId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return new Set(parsed);
      }
      return new Set(parsed.ids ?? []);
    }
  } catch {
    // Ignore parse errors
  }
  return new Set();
}

function recordOptimisticReadId(id: string): void {
  const userId = getCurrentUserId();
  if (!userId) {
    return;
  }
  try {
    const ids = getOptimisticReadIds();
    ids.add(id);
    localStorage.setItem(
      `bookingsystem.read_notifications.${userId}`,
      JSON.stringify({ ids: Array.from(ids).slice(-500) })
    );
  } catch {
    // Ignore storage quota errors
  }
}

// The consuming hook lives in ../hooks/useReservationHub.ts, not here — a file exporting only
// components keeps Vite/React Fast Refresh working for this one.
export const ReservationHubContext = createContext<ReservationHubContextValue | null>(null);

// Mounted once per authenticated session, inside Layout (see components/Layout.tsx) — Layout
// only renders on routes reachable after login, and remounts fresh on navigation back to "/"
// after a successful login, so checking isAuthenticated() once here (rather than reacting to
// login/logout events) is enough to connect at the right time and disconnect via the effect's
// cleanup when navigating away (e.g. logging out).
export function ReservationHubProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<LiveNotification[]>([]);
  const roomChangeHandlers = useRef(new Set<(roomId: string) => void>());

  useEffect(() => {
    if (!isAuthenticated()) {
      return;
    }

    let isMounted = true;

    // Load past notifications from database
    getNotifications()
      .then((items) => {
        if (!isMounted) {
          return;
        }
        const optimisticReadIds = getOptimisticReadIds();
        setNotifications((prev) => {
          const existingIds = new Set(prev.map((n) => n.id));
          const past: LiveNotification[] = items
            .filter((item) => !existingIds.has(item.id))
            .map((item) => ({
              id: item.id,
              message: item.message,
              receivedAt: item.sentAt ?? item.createdAt,
              isRead: item.isRead || optimisticReadIds.has(item.id),
            }));
          return [...prev, ...past];
        });
      })
      .catch((err: unknown) => {
        console.warn("[ReservationHub] Could not load past notifications:", err);
      });

    const connection = createReservationHubConnection();

    connection.on("NotificationReceived", (message: string) => {
      setNotifications((prev) => [
        { id: crypto.randomUUID(), message, receivedAt: new Date().toISOString(), isRead: false },
        ...prev,
      ]);
    });

    connection.on("RoomAvailabilityChanged", (roomId: string) => {
      roomChangeHandlers.current.forEach((handler) => handler(roomId));
    });

    connection.start().catch((err: unknown) => {
      console.error("[ReservationHub] Failed to connect.", err);
    });

    return () => {
      isMounted = false;
      connection.stop().catch(() => {
        // Nothing to recover — the component (and its subscribers) is unmounting anyway.
      });
    };
  }, []);

  function markAsRead(id: string) {
    recordOptimisticReadId(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );

    // Persist to backend database
    markNotificationAsRead(id).catch((err: unknown) => {
      console.warn("[ReservationHub] Could not mark notification as read on server:", err);
    });
  }

  function markAllAsRead() {
    notifications.forEach((n) => recordOptimisticReadId(n.id));
    setNotifications((prev) =>
      prev.map((n) => (n.isRead ? n : { ...n, isRead: true }))
    );

    // Persist to backend database
    markAllNotificationsAsRead().catch((err: unknown) => {
      console.warn("[ReservationHub] Could not mark all notifications as read on server:", err);
    });
  }

  function clearNotifications() {
    setNotifications([]);
  }

  function onRoomAvailabilityChanged(handler: (roomId: string) => void) {
    roomChangeHandlers.current.add(handler);
    return () => roomChangeHandlers.current.delete(handler);
  }

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <ReservationHubContext.Provider
      value={{
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        clearNotifications,
        onRoomAvailabilityChanged,
      }}
    >
      {children}
    </ReservationHubContext.Provider>
  );
}
