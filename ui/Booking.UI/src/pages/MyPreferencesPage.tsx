import { useEffect, useState } from "react";
import { Bell, Globe, CalendarX, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
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
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    getMyPreferences().then(res => {
      setPrefs(res);
      setLoading(false);
    });
  }, []);

  const handleSave = () => {
    if (prefs) {
      setSaveStatus("saving");
      updateMyPreferences(prefs).then(res => {
        setPrefs(res);
        setSaveStatus("success");
        setTimeout(() => setSaveStatus("idle"), 3000);
      }).catch(err => {
        setSaveStatus("error");
        setErrorMessage(err.message || "Failed to save preferences.");
        setTimeout(() => setSaveStatus("idle"), 5000);
      });
    }
  };

  if (loading || !prefs) return <div>Loading preferences...</div>;

  return (
    <div className="space-y-10 max-w-[900px] mx-auto pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="border-b border-border/50 pb-6 flex items-center justify-between sticky top-0 bg-background/95 backdrop-blur z-10 pt-4 -mt-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">My Preferences</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your personal settings, notifications, and regional defaults.</p>
        </div>
        
        <div className="flex items-center gap-3">
          {saveStatus === "success" && (
            <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 animate-in fade-in slide-in-from-right-4">
              <CheckCircle2 className="size-4" />
              Saved successfully!
            </span>
          )}
          {saveStatus === "error" && (
            <span className="text-sm font-medium text-destructive flex items-center gap-1.5 animate-in fade-in slide-in-from-right-4">
              <AlertCircle className="size-4" />
              {errorMessage}
            </span>
          )}
          <Button 
            onClick={handleSave} 
            disabled={saveStatus === "saving"}
            className="shadow-sm gap-2"
          >
            {saveStatus === "saving" ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </div>
      </div>
      
      <div className="space-y-10">
        
        {/* Notifications Section */}
        <div className="grid md:grid-cols-3 gap-6 md:gap-8 border-b border-border/30 pb-10">
          <div className="md:col-span-1 space-y-1.5">
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Bell className="size-4" />
              </div>
              Notifications
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed pr-6">
              Choose what events you want to be notified about via email.
            </p>
          </div>
          <div className="md:col-span-2">
            <div className="rounded-xl border border-border bg-card shadow-sm p-1">
              <div className="flex items-center justify-between p-4 hover:bg-accent/30 rounded-lg transition-colors">
                <div className="space-y-0.5 pr-4">
                  <Label className="text-sm font-semibold cursor-pointer">Email Alerts</Label>
                  <p className="text-xs text-muted-foreground">Receive emails when your meetings are modified, cancelled, or when you are invited to a new booking.</p>
                </div>
                <Switch 
                  checked={prefs.emailAlertsEnabled}
                  onCheckedChange={(checked) => setPrefs({...prefs, emailAlertsEnabled: checked})}
                />
              </div>
            </div>
          </div>
        </div>
        
        {/* Scheduling Section */}
        <div className="grid md:grid-cols-3 gap-6 md:gap-8 border-b border-border/30 pb-10">
          <div className="md:col-span-1 space-y-1.5">
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <CalendarX className="size-4" />
              </div>
              Scheduling Rules
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed pr-6">
              Control how the system handles overlapping invitations and calendar conflicts.
            </p>
          </div>
          <div className="md:col-span-2">
            <div className="rounded-xl border border-border bg-card shadow-sm p-1">
              <div className="flex items-center justify-between p-4 hover:bg-accent/30 rounded-lg transition-colors">
                <div className="space-y-0.5 pr-4">
                  <Label className="text-sm font-semibold cursor-pointer">Auto-Decline Conflicts</Label>
                  <p className="text-xs text-muted-foreground">Automatically decline new invitations when they overlap with your existing confirmed bookings.</p>
                </div>
                <Switch 
                  checked={prefs.autoDeclineConflicts}
                  onCheckedChange={(checked) => setPrefs({...prefs, autoDeclineConflicts: checked})}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Regional Section */}
        <div className="grid md:grid-cols-3 gap-6 md:gap-8 pb-4">
          <div className="md:col-span-1 space-y-1.5">
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Globe className="size-4" />
              </div>
              Regional
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed pr-6">
              Set your locale and timezone to ensure booking times are displayed correctly.
            </p>
          </div>
          <div className="md:col-span-2">
            <div className="rounded-xl border border-border bg-card shadow-sm p-5 space-y-4">
              <div className="space-y-3">
                <div>
                  <Label className="text-sm font-semibold">Primary Time Zone</Label>
                  <p className="text-xs text-muted-foreground mt-0.5 mb-3">All meeting times will be displayed in this time zone by default.</p>
                </div>
                <Select 
                  value={prefs.timeZoneId} 
                  onValueChange={(val) => setPrefs({...prefs, timeZoneId: val || ""})}
                >
                  <SelectTrigger className="w-full max-w-[300px] bg-muted/50 border-border/80 h-10">
                    <SelectValue placeholder="Select timezone" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UTC">UTC (Universal)</SelectItem>
                    <SelectItem value="America/Los_Angeles">Pacific Time (US & Canada)</SelectItem>
                    <SelectItem value="America/New_York">Eastern Time (US & Canada)</SelectItem>
                    <SelectItem value="Europe/London">London</SelectItem>
                    <SelectItem value="Europe/Paris">Central European Time</SelectItem>
                    <SelectItem value="Asia/Tokyo">Tokyo</SelectItem>
                    <SelectItem value="Australia/Sydney">Sydney</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>
        
      </div>
    </div>
  );
}
