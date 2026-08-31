import { createContext, useEffect, useRef, useState, type ReactNode } from "react";
import { createReservationHubConnection } from "../lib/signalr";
import { isAuthenticated } from "../lib/auth";

export interface LiveNotification {
  id: string;
  message: string;
  receivedAt: string;
}

export interface ReservationHubContextValue {
  notifications: LiveNotification[];
  clearNotifications: () => void;
  /** Registers a callback for RoomAvailabilityChanged and returns an unsubscribe function. */
  onRoomAvailabilityChanged: (handler: (roomId: string) => void) => () => void;
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

    const connection = createReservationHubConnection();

    connection.on("NotificationReceived", (message: string) => {
      setNotifications((prev) => [
        { id: crypto.randomUUID(), message, receivedAt: new Date().toISOString() },
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
      connection.stop().catch(() => {
        // Nothing to recover — the component (and its subscribers) is unmounting anyway.
      });
    };
  }, []);

  function clearNotifications() {
    setNotifications([]);
  }

  function onRoomAvailabilityChanged(handler: (roomId: string) => void) {
    roomChangeHandlers.current.add(handler);
    return () => roomChangeHandlers.current.delete(handler);
  }

  return (
    <ReservationHubContext.Provider value={{ notifications, clearNotifications, onRoomAvailabilityChanged }}>
      {children}
    </ReservationHubContext.Provider>
  );
}
