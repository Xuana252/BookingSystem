import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { isAdmin } from "../lib/auth";
import { ApiError } from "../lib/apiClient";
import { createRoom } from "../lib/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";

export function CreateRoomPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [capacity, setCapacity] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Defense in depth, not the real boundary — the Sidebar already hides this route's link for
  // non-admins, and [Authorize(Roles = "Admin")] on POST /api/rooms is what actually enforces
  // it. This just avoids showing a form that would 403 on submit if someone navigates here
  // directly.
  if (!isAdmin()) {
    return (
      <div className="mx-auto max-w-lg px-4 py-10">
        <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">Admins only.</p>
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
    <div className="mx-auto max-w-lg px-4 py-10">
      <h1 className="text-xl font-semibold text-slate-900">Create room</h1>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4 rounded-lg border border-slate-200 bg-white p-6">
        {error && <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        <div>
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="mt-1"
            required
          />
        </div>

        <div>
          <Label htmlFor="location">Location</Label>
          <Input
            id="location"
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            className="mt-1"
            required
          />
        </div>

        <div>
          <Label htmlFor="capacity">Capacity</Label>
          <Input
            id="capacity"
            type="number"
            min={1}
            value={capacity}
            onChange={(event) => setCapacity(Number(event.target.value))}
            className="mt-1"
            required
          />
        </div>

        <Button type="submit" disabled={isSubmitting} size="lg" className="w-full">
          {isSubmitting ? "Creating..." : "Create room"}
        </Button>
      </form>
    </div>
  );
}
