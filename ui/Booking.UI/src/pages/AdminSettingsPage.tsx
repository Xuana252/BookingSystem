import { useEffect, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Clock,
} from "lucide-react";
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
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "success" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    getSystemSettings().then((res) => {
      setSettings(res);
      setLoading(false);
    });
  }, []);

  const handleSave = () => {
    if (settings) {
      setSaveStatus("saving");
      updateSystemSettings(settings)
        .then((res) => {
          setSettings(res);
          setSaveStatus("success");
          setTimeout(() => setSaveStatus("idle"), 3000);
        })
        .catch((err) => {
          setSaveStatus("error");
          setErrorMessage(err.message || "Failed to save settings.");
          setTimeout(() => setSaveStatus("idle"), 5000);
        });
    }
  };
  const [activeTab, setActiveTab] = useState<"rules" | "hours">("rules");

  if (loading || !settings) return <div>Loading settings...</div>;

  return (
    <div className="space-y-8 max-w-[1000px] mx-auto pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="border-b border-border/50 pb-6 flex items-center justify-between sticky top-0 bg-background/95 backdrop-blur z-10 pt-4 -mt-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Global Settings
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure system-wide booking rules and policies.
          </p>
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
              "Save Settings"
            )}
          </Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-8 md:gap-12">
        {/* Sidebar Navigation */}
        <aside className="w-full md:w-56 shrink-0">
          <nav className="flex flex-col gap-1">
            <button
              onClick={() => setActiveTab("rules")}
              className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                activeTab === "rules"
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <CalendarDays className="size-4" />
              Booking Rules
            </button>
            <button
              onClick={() => setActiveTab("hours")}
              className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                activeTab === "hours"
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Clock className="size-4" />
              Business Hours & Region
            </button>
          </nav>
        </aside>

        {/* Main Tab Content */}
        <main className="flex-1 min-w-0">
          {activeTab === "rules" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  Booking Rules
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Set global constraints on how far in advance rooms can be
                  booked and automatic cancellation policies.
                </p>
              </div>
              <div className="rounded-xl border border-border bg-card shadow-sm p-6 space-y-6">
                <div className="grid sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">
                      Max Booking Lead Time
                    </Label>
                    <p className="text-[11px] text-muted-foreground mb-1">
                      How far into the future users can book.
                    </p>
                    <Select
                      value={settings.maxBookingLeadTimeDays.toString()}
                      onValueChange={(val) =>
                        setSettings({
                          ...settings,
                          maxBookingLeadTimeDays: parseInt(val || "0"),
                        })
                      }
                    >
                      <SelectTrigger className="w-full bg-muted/50 border-border/80 h-10">
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
                    <Label className="text-sm font-semibold">
                      Auto-cancel (No-show)
                    </Label>
                    <p className="text-[11px] text-muted-foreground mb-1">
                      Release rooms if the host doesn't check in.
                    </p>
                    <Select
                      value={settings.autoCancelMinutes.toString()}
                      onValueChange={(val) =>
                        setSettings({
                          ...settings,
                          autoCancelMinutes: parseInt(val || "0"),
                        })
                      }
                    >
                      <SelectTrigger className="w-full bg-muted/50 border-border/80 h-10">
                        <SelectValue placeholder="Select rule" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">After 10 Minutes</SelectItem>
                        <SelectItem value="15">After 15 Minutes</SelectItem>
                        <SelectItem value="0">Never (Disable)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold">
                    Check-in Window
                  </Label>
                  <p className="text-[11px] text-muted-foreground mb-1">
                    How early users can check in before meeting starts.
                  </p>
                  <Select
                    value={settings.checkinWindowMinutes?.toString() || "15"}
                    onValueChange={(val) =>
                      setSettings({
                        ...settings,
                        checkinWindowMinutes: parseInt(val || "15"),
                      })
                    }
                  >
                    <SelectTrigger className="w-full bg-muted/50 border-border/80 h-10">
                      <SelectValue placeholder="Select window" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5 Minutes</SelectItem>
                      <SelectItem value="15">15 Minutes</SelectItem>
                      <SelectItem value="30">30 Minutes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {activeTab === "hours" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  Business Hours & Region
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Define the working hours and maximum allowable meeting length
                  for your organization.
                </p>
              </div>
              <div className="rounded-xl border border-border bg-card shadow-sm p-6 space-y-6">
                <div className="grid sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">
                      Business Hours Start
                    </Label>
                    <p className="text-[11px] text-muted-foreground mb-1">
                      Earliest time a meeting can begin.
                    </p>
                    <Input
                      type="time"
                      className="w-full bg-muted/50 border-border/80 h-10"
                      value={settings.businessHoursStart}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          businessHoursStart: e.target.value + ":00",
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">
                      Business Hours End
                    </Label>
                    <p className="text-[11px] text-muted-foreground mb-1">
                      Latest time a meeting can end.
                    </p>
                    <Input
                      type="time"
                      className="w-full bg-muted/50 border-border/80 h-10"
                      value={settings.businessHoursEnd}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          businessHoursEnd: e.target.value + ":00",
                        })
                      }
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">
                      Max Meeting Duration
                    </Label>
                    <p className="text-[11px] text-muted-foreground mb-1">
                      Limit hoarding of conference rooms.
                    </p>
                    <Select
                      value={settings.maxDurationHours.toString()}
                      onValueChange={(val) =>
                        setSettings({
                          ...settings,
                          maxDurationHours: parseInt(val || "1"),
                        })
                      }
                    >
                      <SelectTrigger className="w-full bg-muted/50 border-border/80 h-10">
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
                    <Label className="text-sm font-semibold">
                      Default Time Zone
                    </Label>
                    <p className="text-[11px] text-muted-foreground mb-1">
                      Global headquarters timezone.
                    </p>
                    <Select
                      value={settings.timeZoneId}
                      onValueChange={(val) =>
                        setSettings({ ...settings, timeZoneId: val || "" })
                      }
                    >
                      <SelectTrigger className="w-full bg-muted/50 border-border/80 h-10">
                        <SelectValue placeholder="Select timezone" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="America/New_York">
                          Eastern Time
                        </SelectItem>
                        <SelectItem value="America/Chicago">
                          Central Time
                        </SelectItem>
                        <SelectItem value="America/Denver">
                          Mountain Time
                        </SelectItem>
                        <SelectItem value="America/Los_Angeles">
                          Pacific Time
                        </SelectItem>
                        <SelectItem value="UTC">UTC</SelectItem>
                        <SelectItem value="Asia/Ho_Chi_Minh">
                          Indochina Time
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
