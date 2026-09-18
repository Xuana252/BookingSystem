import { useEffect, useState } from "react";
import { CalendarDays } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { getSystemSettings, updateSystemSettings } from "../lib/api";
import type { SystemSettings } from "../lib/types";

export function AdminSettingsPage() {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSystemSettings().then(res => {
      setSettings(res);
      setLoading(false);
    });
  }, []);

  const handleSave = () => {
    if (settings) {
      updateSystemSettings(settings).then(res => {
        setSettings(res);
        alert("Settings saved successfully!");
      });
    }
  };

  if (loading || !settings) return <div>Loading settings...</div>;

  return (
    <div className="space-y-6 max-w-[900px] mx-auto">
      <div className="flex flex-col sm:flex-row justify-between gap-4 border-b border-border/50 pb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Global Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">Configure system-wide booking rules and policies.</p>
        </div>
      </div>
      
      <div className="grid gap-6">
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="border-b border-border/40 bg-muted/20 px-4 py-3 flex items-center gap-2">
            <CalendarDays className="size-4 text-muted-foreground" />
            <h2 className="text-sm font-medium">Booking Rules</h2>
          </div>
          <div className="p-4 space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Max Booking Lead Time</Label>
                <Select 
                  value={settings.maxBookingLeadTimeDays.toString()} 
                  onValueChange={(val) => setSettings({...settings, maxBookingLeadTimeDays: parseInt(val || "0")})}
                >
                  <SelectTrigger className="w-full bg-muted">
                    <SelectValue placeholder="Select timeframe" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 Days</SelectItem>
                    <SelectItem value="60">60 Days</SelectItem>
                    <SelectItem value="90">90 Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Auto-cancel (No-show)</Label>
                <Select 
                  value={settings.autoCancelMinutes.toString()} 
                  onValueChange={(val) => setSettings({...settings, autoCancelMinutes: parseInt(val || "0")})}
                >
                  <SelectTrigger className="w-full bg-muted">
                    <SelectValue placeholder="Select rule" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">After 10 Minutes</SelectItem>
                    <SelectItem value="15">After 15 Minutes</SelectItem>
                    <SelectItem value="0">Never</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4 mt-4">
              <div className="space-y-2">
                <Label>Business Hours Start</Label>
                <Input 
                  type="time" 
                  className="w-full bg-muted" 
                  value={settings.businessHoursStart}
                  onChange={(e) => setSettings({...settings, businessHoursStart: e.target.value + ":00"})}
                />
              </div>
              <div className="space-y-2">
                <Label>Business Hours End</Label>
                <Input 
                  type="time" 
                  className="w-full bg-muted" 
                  value={settings.businessHoursEnd}
                  onChange={(e) => setSettings({...settings, businessHoursEnd: e.target.value + ":00"})}
                />
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4 mt-4">
              <div className="space-y-2">
                <Label>Max Meeting Duration</Label>
                <Select 
                  value={settings.maxDurationHours.toString()} 
                  onValueChange={(val) => setSettings({...settings, maxDurationHours: parseInt(val || "1")})}
                >
                  <SelectTrigger className="w-full bg-muted">
                    <SelectValue placeholder="Select hours" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 Hour</SelectItem>
                    <SelectItem value="2">2 Hours</SelectItem>
                    <SelectItem value="4">4 Hours</SelectItem>
                    <SelectItem value="8">8 Hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Default Time Zone</Label>
                <Select 
                  value={settings.timeZoneId} 
                  onValueChange={(val) => setSettings({...settings, timeZoneId: val || ""})}
                >
                  <SelectTrigger className="w-full bg-muted">
                    <SelectValue placeholder="Select timezone" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="America/New_York">Eastern Time</SelectItem>
                    <SelectItem value="America/Chicago">Central Time</SelectItem>
                    <SelectItem value="America/Denver">Mountain Time</SelectItem>
                    <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                    <SelectItem value="UTC">UTC</SelectItem>
                    <SelectItem value="Asia/Ho_Chi_Minh">Indochina Time</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex justify-end pt-2">
          <Button onClick={handleSave}>Save Settings</Button>
        </div>
      </div>
    </div>
  );
}
