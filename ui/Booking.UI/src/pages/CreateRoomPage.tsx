import { useState, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  MapPin,
  Plus,
  ShieldAlert,
  Tag,
  Users,
} from "lucide-react";
import { isAdmin } from "../lib/auth";
import { ApiError } from "../lib/apiClient";
import { createRoom } from "../lib/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";

export function CreateRoomPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [capacity, setCapacity] = useState(6);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isAdmin()) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive mb-3">
          <ShieldAlert className="size-6" />
        </div>
        <h2 className="text-lg font-semibold text-foreground">Access Restricted</h2>
        <p className="mt-1 text-xs text-muted-foreground">Only system administrators are authorized to add or configure rooms.</p>
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

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await createRoom({ name, location, capacity });
      navigate("/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            to="/"
            className="mb-1 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" />
            <span>Back to overview</span>
          </Link>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Create Conference Room</h1>
          <p className="text-xs text-muted-foreground">Add a new meeting room or facility to the schedule</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-5">
        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-sm md:col-span-3"
        >
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
              <AlertCircle className="size-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <Label htmlFor="name" className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <Tag className="size-3.5 text-muted-foreground" />
              <span>Room Name</span>
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Apollo Conference Hall"
              className="mt-1.5 bg-card"
              required
            />
          </div>

          <div>
            <Label htmlFor="location" className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <MapPin className="size-3.5 text-muted-foreground" />
              <span>Location / Floor</span>
            </Label>
            <Input
              id="location"
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              placeholder="e.g. Floor 3, East Wing"
              className="mt-1.5 bg-card"
              required
            />
          </div>

          <div>
            <Label htmlFor="capacity" className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <Users className="size-3.5 text-muted-foreground" />
              <span>Seating Capacity</span>
            </Label>
            <Input
              id="capacity"
              type="number"
              min={1}
              value={capacity}
              onChange={(event) => setCapacity(Number(event.target.value))}
              className="mt-1.5 bg-card"
              required
            />
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              disabled={isSubmitting}
              size="lg"
              className="w-full gap-2 bg-gradient-to-r from-primary to-indigo-600 font-semibold text-primary-foreground shadow-sm shadow-primary/25 hover:opacity-95"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>Creating Room...</span>
                </>
              ) : (
                <>
                  <Plus className="size-4" />
                  <span>Create Room</span>
                </>
              )}
            </Button>
          </div>
        </form>

        {/* Live Preview Card */}
        <div className="space-y-4 md:col-span-2">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Live Preview
          </div>
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-base font-bold text-primary dark:bg-primary/20">
                {name ? name[0]!.toUpperCase() : "?"}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold text-foreground">
                  {name || "Room Name"}
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="size-3" />
                  <span className="truncate">{location || "Location pending"}</span>
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs">
              <span className="text-muted-foreground">Capacity</span>
              <Badge variant="indigo" className="gap-1">
                <Users className="size-3" />
                <span>{capacity || 0} seats</span>
              </Badge>
            </div>

            <div className="mt-3 flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-2.5 py-1.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="size-3.5 shrink-0" />
              <span>Available for scheduling</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
