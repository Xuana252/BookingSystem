import { useState } from "react";
import { useReservationHub } from "../hooks/useReservationHub";

export function NotificationBell() {
  const { notifications, clearNotifications } = useReservationHub();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen((open) => !open)}
        aria-label="Notifications"
        className="relative rounded p-2 text-white hover:bg-white/10"
      >
        🔔
        {notifications.length > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-medium text-white">
            {notifications.length > 9 ? "9+" : notifications.length}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 z-10 mt-2 w-80 rounded border border-slate-200 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
            <span className="text-sm font-medium text-slate-900">Notifications</span>
            {notifications.length > 0 && (
              <button onClick={clearNotifications} className="text-xs text-slate-500 hover:text-slate-700">
                Clear
              </button>
            )}
          </div>
          <ul className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <li className="px-3 py-4 text-center text-sm text-slate-500">Nothing yet.</li>
            ) : (
              notifications.map((notification) => (
                <li key={notification.id} className="border-b border-slate-50 px-3 py-2 text-sm text-slate-700 last:border-0">
                  {notification.message}
                  <div className="mt-1 text-xs text-slate-400">
                    {new Date(notification.receivedAt).toLocaleTimeString()}
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
