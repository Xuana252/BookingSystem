import { useState, useEffect, type FormEvent } from "react";
import {
  AlertCircle,
  Loader2,
  MapPin,
  Tag,
  Users,
  Coffee,
  Plus,
  X,
  Save,
  Building2
} from "lucide-react";
import { ApiError } from "../lib/apiClient";
import { createRoom, updateRoom } from "../lib/api";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import type { Room } from "../lib/types";

interface RoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
  roomToEdit?: Room | null;
}

export function RoomModal({ isOpen, onClose, onSuccess, roomToEdit }: RoomModalProps) {
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [capacity, setCapacity] = useState<number>(4);
  const [amenities, setAmenities] = useState<string[]>([]);
  const [newAmenity, setNewAmenity] = useState("");
  
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (roomToEdit) {
        setName(roomToEdit.name);
        setLocation(roomToEdit.location);
        setCapacity(roomToEdit.capacity);
        setAmenities(roomToEdit.amenities || []);
      } else {
        setName("");
        setLocation("");
        setCapacity(4);
        setAmenities([]);
      }
      setNewAmenity("");
      setError(null);
      setIsSubmitting(false);
    }
  }, [isOpen, roomToEdit]);

  if (!isOpen) return null;

  const handleAddAmenity = () => {
    if (!newAmenity.trim()) return;
    if (amenities.includes(newAmenity.trim())) return;
    setAmenities([...amenities, newAmenity.trim()]);
    setNewAmenity("");
  };

  const handleRemoveAmenity = (itemToRemove: string) => {
    setAmenities(amenities.filter((item) => item !== itemToRemove));
  };

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (roomToEdit) {
        await updateRoom(roomToEdit.id, { name, location, capacity, amenities });
        onSuccess(`Room "${name}" updated successfully.`);
      } else {
        await createRoom({ name, location, capacity, amenities });
        onSuccess(`Room "${name}" created successfully.`);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
      setIsSubmitting(false);
    }
  }

  const isEdit = !!roomToEdit;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Building2 className="size-5 text-primary" />
            <h2 className="text-xl font-semibold tracking-tight">{isEdit ? "Update Room" : "Create Room"}</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-muted-foreground hover:bg-muted/80 transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto pr-2 -mr-2 space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
              <AlertCircle className="size-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-4">
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

            <div>
              <Label className="flex items-center gap-1.5 text-xs font-semibold text-foreground mb-1.5">
                <Coffee className="size-3.5 text-muted-foreground" />
                <span>Amenities (Optional)</span>
              </Label>
              <div className="flex gap-2 mb-2">
                <Input 
                  placeholder="e.g. Whiteboard, TV" 
                  value={newAmenity} 
                  onChange={(e) => setNewAmenity(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddAmenity())}
                  className="bg-card"
                />
                <Button onClick={handleAddAmenity} type="button" variant="secondary" className="shrink-0 gap-1.5">
                  <Plus className="size-4" /> Add
                </Button>
              </div>
              {amenities.length > 0 && (
                <div className="flex flex-wrap gap-1.5 p-2 rounded-lg border bg-muted/20">
                  {amenities.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-1.5 rounded-full border bg-card pl-2.5 pr-1 py-0.5 text-xs font-medium">
                      <span>{item}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveAmenity(item)}
                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 p-0.5 rounded-full transition-colors"
                      >
                        <X className="size-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t mt-4">
            <Button variant="outline" type="button" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="gap-2 bg-gradient-to-r from-primary to-indigo-600 font-semibold text-primary-foreground shadow-sm shadow-primary/25 hover:opacity-95"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>{isEdit ? "Saving..." : "Creating..."}</span>
                </>
              ) : (
                <>
                  {isEdit ? <Save className="size-4" /> : <Plus className="size-4" />}
                  <span>{isEdit ? "Save Changes" : "Create Room"}</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
