import { useState } from "react";
import { Plus, X, Loader2, Webhook } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { updateRoomWebhooks } from "../lib/api";
import { ApiError } from "../lib/apiClient";
import type { Room } from "../lib/types";

interface WebhooksModalProps {
  room: Room;
  onClose: () => void;
  onSuccess: (updatedUrls: string[]) => void;
}

export function WebhooksModal({ room, onClose, onSuccess }: WebhooksModalProps) {
  const [urls, setUrls] = useState<string[]>(room.webhookUrls || []);
  const [newUrl, setNewUrl] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAdd = () => {
    if (!newUrl.trim()) return;
    if (urls.includes(newUrl.trim())) return;
    setUrls([...urls, newUrl.trim()]);
    setNewUrl("");
  };

  const handleRemove = (urlToRemove: string) => {
    setUrls(urls.filter((url) => url !== urlToRemove));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    try {
      await updateRoomWebhooks(room.id, urls);
      onSuccess(urls);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update webhooks.");
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Webhook className="size-5 text-indigo-500" />
            <h2 className="text-xl font-semibold tracking-tight">Manage Webhooks</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-muted-foreground hover:bg-muted/80 transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>

        <div>
          <p className="text-sm text-muted-foreground mb-4">
            Configure MS Teams or Slack webhook URLs for <strong>{room.name}</strong>. Notifications will be sent when this room is booked.
          </p>
          
          <div className="flex gap-2 mb-6">
            <Input 
              placeholder="https://your-webhook-url..." 
              value={newUrl} 
              onChange={(e) => setNewUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            />
            <Button onClick={handleAdd} type="button" variant="secondary" className="shrink-0 gap-1.5">
              <Plus className="size-4" /> Add
            </Button>
          </div>

          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
            {urls.length === 0 ? (
              <p className="text-sm italic text-muted-foreground py-4 text-center border border-dashed rounded-lg">No webhooks configured.</p>
            ) : (
              urls.map((url, idx) => (
                <div key={idx} className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 p-2.5 text-sm">
                  <span className="truncate flex-1 font-mono text-xs">{url}</span>
                  <button
                    onClick={() => handleRemove(url)}
                    className="text-destructive hover:bg-destructive/10 p-1.5 rounded transition-colors"
                    title="Remove"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {error && (
          <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive border border-destructive/20">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving} className="gap-1.5 min-w-[100px]">
            {isSaving && <Loader2 className="size-3.5 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}
