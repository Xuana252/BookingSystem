import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  CheckCircle2,
  Filter,
  Loader2,
  MapPin,
  Plus,
  Power,
  PowerOff,
  RefreshCw,
  Search,
  ShieldAlert,
  Users,
  Wrench,
} from "lucide-react";
import { isAdmin } from "../lib/auth";
import { ApiError } from "../lib/apiClient";
import { activateRoom, deactivateRoom, getAllRooms } from "../lib/api";
import type { Room } from "../lib/types";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";

type StatusFilter = "all" | "active" | "inactive";

export function ManageRoomsPage() {
  const location = useLocation();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(
    (location.state as { successMessage?: string } | null)?.successMessage ?? null
  );
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  useEffect(() => {
    if (location.state && typeof location.state === "object" && "successMessage" in location.state) {
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const loadRooms = useCallback(async () => {
    try {
      setError(null);
      const data = await getAllRooms();
      setRooms(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load rooms.");
    }
  }, []);

  useEffect(() => {
    setIsLoading(true);
    loadRooms().finally(() => setIsLoading(false));
  }, [loadRooms]);

  async function handleToggleStatus(room: Room) {
    setActionLoadingId(room.id);
    setError(null);
    setSuccessMessage(null);
    try {
      if (room.isActive) {
        await deactivateRoom(room.id);
        setSuccessMessage(`Room "${room.name}" deactivated.`);
      } else {
        await activateRoom(room.id);
        setSuccessMessage(`Room "${room.name}" reactivated.`);
      }
      await loadRooms();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update room status.");
    } finally {
      setActionLoadingId(null);
    }
  }

  const filteredRooms = useMemo(() => {
    return rooms.filter((room) => {
      const matchesSearch =
        room.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        room.location.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && room.isActive) ||
        (statusFilter === "inactive" && !room.isActive);

      return matchesSearch && matchesStatus;
    });
  }, [rooms, searchQuery, statusFilter]);

  const stats = useMemo(() => {
    const total = rooms.length;
    const active = rooms.filter((r) => r.isActive).length;
    const inactive = total - active;
    return { total, active, inactive };
  }, [rooms]);

  if (!isAdmin()) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          <ShieldAlert className="size-6" />
        </div>
        <h2 className="text-lg font-semibold text-foreground">Access Restricted</h2>
        <p className="mt-1 text-xs text-muted-foreground">Only system administrators are authorized to manage rooms.</p>
        <Link
          to="/"
          className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
        >
          <ArrowLeft className="size-3.5" />
          <span>Return to calendar</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <Link
            to="/"
            className="mb-1 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" />
            <span>Back to calendar</span>
          </Link>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Room Management</h1>
          <p className="text-xs text-muted-foreground">
            Control room availability, set spaces to maintenance, and add new conference rooms.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setIsLoading(true);
              loadRooms().finally(() => setIsLoading(false));
            }}
            disabled={isLoading}
            className="gap-1.5"
          >
            <RefreshCw className={`size-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>

          <Link
            to="/admin/rooms/new"
            className="inline-flex h-7 items-center justify-center gap-1.5 rounded-md bg-gradient-to-r from-primary to-indigo-600 px-2.5 text-[0.8rem] font-medium text-primary-foreground shadow-sm shadow-primary/25 hover:opacity-95"
          >
            <Plus className="size-4" />
            <span>Create Room</span>
          </Link>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="flex items-center gap-3.5 rounded-xl border border-border bg-card p-4 shadow-xs">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Building2 className="size-5" />
          </div>
          <div>
            <div className="text-2xl font-bold tracking-tight text-foreground">{stats.total}</div>
            <div className="text-xs text-muted-foreground">Total Rooms Configured</div>
          </div>
        </div>

        <div className="flex items-center gap-3.5 rounded-xl border border-border bg-card p-4 shadow-xs">
          <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="size-5" />
          </div>
          <div>
            <div className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
              {stats.active}
            </div>
            <div className="text-xs text-muted-foreground">Active & Bookable</div>
          </div>
        </div>

        <div className="flex items-center gap-3.5 rounded-xl border border-border bg-card p-4 shadow-xs">
          <div className="flex size-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <Wrench className="size-5" />
          </div>
          <div>
            <div className="text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400">
              {stats.inactive}
            </div>
            <div className="text-xs text-muted-foreground">Under Maintenance / Inactive</div>
          </div>
        </div>
      </div>

      {/* Maintenance alert notice */}
      <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/40 p-3.5 text-xs text-muted-foreground">
        <Wrench className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
        <div className="space-y-0.5">
          <span className="font-semibold text-foreground">Maintenance Mode Notice:</span> Deactivating a room removes
          it from the public booking calendar so new bookings cannot be scheduled. All past and existing reservation
          records are safely preserved.
        </div>
      </div>

      {successMessage && (
        <div className="flex items-center gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs text-emerald-700 dark:text-emerald-400">
          <CheckCircle2 className="size-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3.5 text-xs text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3 sm:flex-row sm:items-center sm:justify-between shadow-xs">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search rooms by name or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-muted/40"
          />
        </div>

        <div className="flex items-center gap-1 self-start rounded-lg border border-border bg-muted p-1 sm:self-auto">
          <Filter className="ml-1 mr-1 size-3.5 text-muted-foreground" />
          {(
            [
              { id: "all", label: `All (${stats.total})` },
              { id: "active", label: `Active (${stats.active})` },
              { id: "inactive", label: `Maintenance (${stats.inactive})` },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                statusFilter === tab.id
                  ? "bg-card text-foreground font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Rooms List / Grid */}
      {isLoading ? (
        <div className="flex min-h-[300px] flex-col items-center justify-center rounded-xl border border-border bg-card p-8 text-muted-foreground">
          <Loader2 className="mb-2 size-6 animate-spin text-primary" />
          <span className="text-xs">Loading rooms directory...</span>
        </div>
      ) : filteredRooms.length === 0 ? (
        <div className="flex min-h-[250px] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card p-8 text-center text-muted-foreground">
          <Building2 className="mb-2 size-8 text-muted-foreground/60" />
          <p className="text-sm font-medium text-foreground">No rooms match your filter</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {searchQuery ? "Try refining your search query." : "No rooms have been added in this category yet."}
          </p>
          {!searchQuery && (
            <Link
              to="/admin/rooms/new"
              className="mt-4 inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium shadow-xs hover:bg-muted"
            >
              <Plus className="size-3.5" />
              <span>Create Room</span>
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredRooms.map((room) => {
            const isPending = actionLoadingId === room.id;
            return (
              <div
                key={room.id}
                className={`relative flex flex-col justify-between rounded-2xl border bg-card p-5 shadow-xs transition-all ${
                  room.isActive
                    ? "border-border hover:border-border/80"
                    : "border-amber-500/30 bg-amber-500/5 hover:border-amber-500/50 dark:bg-amber-950/10"
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex size-10 shrink-0 items-center justify-center rounded-xl text-base font-bold shadow-xs ${
                          room.isActive
                            ? "bg-primary/10 text-primary dark:bg-primary/20"
                            : "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                        }`}
                      >
                        {room.name[0]?.toUpperCase() ?? "R"}
                      </div>
                      <div className="min-w-0">
                        <h3 className="truncate font-semibold text-foreground text-sm">{room.name}</h3>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="size-3 shrink-0" />
                          <span className="truncate">{room.location}</span>
                        </div>
                      </div>
                    </div>

                    <Badge
                      variant={room.isActive ? "default" : "secondary"}
                      className={`shrink-0 gap-1 text-[10px] ${
                        room.isActive
                          ? "bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-400 border-emerald-500/20"
                          : "bg-amber-500/15 text-amber-700 hover:bg-amber-500/20 dark:text-amber-400 border-amber-500/20"
                      }`}
                    >
                      {room.isActive ? (
                        <>
                          <CheckCircle2 className="size-3" />
                          <span>Active</span>
                        </>
                      ) : (
                        <>
                          <Wrench className="size-3" />
                          <span>Maintenance</span>
                        </>
                      )}
                    </Badge>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-border/80 pt-3 text-xs">
                    <span className="text-muted-foreground">Seating Capacity</span>
                    <Badge variant="indigo" className="gap-1 font-semibold">
                      <Users className="size-3" />
                      <span>{room.capacity} seats</span>
                    </Badge>
                  </div>
                </div>

                {/* Card Action */}
                <div className="mt-4 pt-3 border-t border-border/60">
                  <Button
                    variant={room.isActive ? "outline" : "default"}
                    size="sm"
                    disabled={isPending}
                    onClick={() => handleToggleStatus(room)}
                    className={`w-full gap-2 text-xs font-medium transition-colors ${
                      room.isActive
                        ? "text-amber-700 hover:bg-amber-500/10 hover:text-amber-800 dark:text-amber-400 dark:hover:bg-amber-500/20"
                        : "bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600"
                    }`}
                  >
                    {isPending ? (
                      <>
                        <Loader2 className="size-3.5 animate-spin" />
                        <span>Updating...</span>
                      </>
                    ) : room.isActive ? (
                      <>
                        <PowerOff className="size-3.5" />
                        <span>Set to Maintenance</span>
                      </>
                    ) : (
                      <>
                        <Power className="size-3.5" />
                        <span>Bring Back Online</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
