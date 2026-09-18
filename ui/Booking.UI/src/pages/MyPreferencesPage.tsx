import { useEffect, useState } from "react";
import { Bell, Globe, CalendarX } from "lucide-react";
import { Button } from "../components/ui/button";
import { Label } from "../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Switch } from "../components/ui/switch";
import { getMyPreferences, updateMyPreferences } from "../lib/api";
import type { UserPreferences } from "../lib/types";

export function MyPreferencesPage() {
  const [prefs, setPrefs] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyPreferences().then(res => {
      setPrefs(res);
      setLoading(false);
    });
  }, []);

  const handleSave = () => {
    if (prefs) {
      updateMyPreferences(prefs).then(res => {
        setPrefs(res);
        alert("Preferences saved successfully!");
      });
    }
  };

  if (loading || !prefs) return <div>Loading preferences...</div>;

  return (
    <div className="space-y-6 max-w-[800px] mx-auto">
      <div className="border-b border-border/50 pb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">My Preferences</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your personal settings and notifications.</p>
        </div>
      </div>
      
      <div className="space-y-6">
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="border-b border-border/40 bg-muted/20 px-4 py-3 flex items-center gap-2">
            <Bell className="size-4 text-muted-foreground" />
            <h2 className="text-sm font-medium">Notifications</h2>
          </div>
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Email Alerts</Label>
                <p className="text-xs text-muted-foreground">Receive emails when your meetings are modified.</p>
              </div>
              <Switch 
                checked={prefs.emailAlertsEnabled}
                onCheckedChange={(checked) => setPrefs({...prefs, emailAlertsEnabled: checked})}
              />
            </div>
          </div>
        </div>
        
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="border-b border-border/40 bg-muted/20 px-4 py-3 flex items-center gap-2">
            <CalendarX className="size-4 text-muted-foreground" />
            <h2 className="text-sm font-medium">Scheduling</h2>
          </div>
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Auto-Decline Conflicts</Label>
                <p className="text-xs text-muted-foreground">Automatically decline invitations when you are already booked.</p>
              </div>
              <Switch 
                checked={prefs.autoDeclineConflicts}
                onCheckedChange={(checked) => setPrefs({...prefs, autoDeclineConflicts: checked})}
              />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="border-b border-border/40 bg-muted/20 px-4 py-3 flex items-center gap-2">
            <Globe className="size-4 text-muted-foreground" />
            <h2 className="text-sm font-medium">Regional</h2>
          </div>
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label className="text-sm font-medium">Time Zone</Label>
                <p className="text-xs text-muted-foreground">Set your default time zone for bookings.</p>
              </div>
              <Select 
                value={prefs.timeZoneId} 
                onValueChange={(val) => setPrefs({...prefs, timeZoneId: val || ""})}
              >
                <SelectTrigger className="w-[200px] bg-muted">
                  <SelectValue placeholder="Select timezone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UTC">UTC (Universal)</SelectItem>
                  <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                  <SelectItem value="America/New_York">Eastern Time</SelectItem>
                  <SelectItem value="Europe/London">London</SelectItem>
                  <SelectItem value="Asia/Tokyo">Tokyo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        
        <div className="flex justify-end pt-4">
          <Button onClick={handleSave}>Save Changes</Button>
        </div>
      </div>
    </div>
  );
}
