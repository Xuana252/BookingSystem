import { X, Users, MapPin, CheckCircle2 } from "lucide-react";
import type { Room } from "../lib/types";

interface RoomDetailModalProps {
  room: Room;
  onClose: () => void;
  onBookClick: (roomId: string) => void;
}

// Generate a consistent pseudo-random image for the room
function getRoomImage(roomId: string) {
  // Use a hash of the ID to pick a stock meeting room image
  const num = (roomId.charCodeAt(0) + roomId.charCodeAt(roomId.length - 1)) % 10;
  return `https://images.unsplash.com/photo-${[
    '1497366216548-37526070297c',
    '1497366754045-8eea104d41fa',
    '1527192491265-7e15c55b1ed2',
    '1505409859467-3a796fd5798a',
    '1416339442236-8ceb46efe2ce',
    '1600508774634-11f8b5f3bce5',
    '1554118811-1e0d58224f24',
    '1606857521015-7f9fcf423740',
    '1522071820081-009f0129c71c',
    '1536376072261-38c75010e6c9',
  ][num]}?auto=format&fit=crop&q=80&w=800&h=400`;
}

export function RoomDetailModal({ room, onClose, onBookClick }: RoomDetailModalProps) {
  const imageUrl = getRoomImage(room.id);
  const amenities = room.amenities ?? [];

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm animate-in fade-in" 
        onClick={onClose} 
      />
      
      {/* Modal */}
      <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-border bg-card shadow-2xl animate-in zoom-in-95 duration-200">
        
        {/* Cover Image */}
        <div className="relative h-48 w-full bg-muted">
           <img src={imageUrl} alt={room.name} className="h-full w-full object-cover" />
           <button 
             onClick={onClose}
             className="absolute top-4 right-4 flex size-8 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md hover:bg-black/60 transition-colors"
           >
             <X className="size-4" />
           </button>
           
           {!room.isActive && (
             <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-xs">
                <span className="rounded-full bg-amber-500 px-4 py-1.5 font-bold text-white shadow-lg">Under Maintenance</span>
             </div>
           )}
        </div>

        <div className="p-6">
           <div className="flex justify-between items-start mb-4">
              <div>
                 <h2 className="text-2xl font-black text-foreground">{room.name}</h2>
                 <div className="flex items-center gap-4 mt-2 text-sm font-medium text-muted-foreground">
                    <span className="flex items-center gap-1.5"><MapPin className="size-4 text-primary" /> {room.location}</span>
                    <span className="flex items-center gap-1.5"><Users className="size-4 text-primary" /> {room.capacity} seats</span>
                 </div>
              </div>
           </div>

           <div className="mt-6">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Amenities</h3>
              {amenities.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                   {amenities.map((amenity, i) => (
                      <span key={i} className="flex items-center gap-1.5 rounded-lg border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary">
                         <CheckCircle2 className="size-3.5" /> {amenity}
                      </span>
                   ))}
                </div>
              ) : (
                <div className="text-sm italic text-muted-foreground">Standard room setup. No special amenities listed.</div>
              )}
           </div>

           <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-border">
              <button 
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-muted-foreground hover:bg-muted transition-colors"
              >
                Close
              </button>
              <button 
                onClick={() => {
                  onClose();
                  onBookClick(room.id);
                }}
                disabled={!room.isActive}
                className="px-6 py-2 rounded-lg bg-primary text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Book this Room
              </button>
           </div>
        </div>
      </div>
    </>
  );
}
