import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  Calendar,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Moon,
  Sun,
  User,
  ArrowRight
} from "lucide-react";
import { ApiError, apiClient } from "../lib/apiClient";
import { setToken } from "../lib/auth";
import type { AuthResponse } from "../lib/types";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { useTheme } from "../hooks/useTheme";
import { getAvatar } from "../lib/avatar";

export function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const { resolvedTheme, setTheme } = useTheme();

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await apiClient.post<AuthResponse>("/auth/login", { username, password });
      setToken(response.token);
      navigate("/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Left side - Decorative */}
      <div className="hidden lg:flex w-1/2 flex-col justify-between bg-slate-950 p-12 text-white relative overflow-hidden">
        {/* Softened gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-violet-800 via-fuchsia-800 to-cyan-900 opacity-75 z-0" />
        {/* Overlay image */}
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80')] bg-cover bg-center mix-blend-overlay opacity-20 z-0" />
        
        {/* Timeline Preview Background */}
        <div className="absolute top-[20%] right-[-10%] w-[550px] flex flex-col gap-3 opacity-50 hover:opacity-100 transition-opacity duration-700 z-0 select-none cursor-default">
          
          {/* Header: Time axis */}
          <div className="flex text-[10px] font-bold text-white/40 border-b border-white/10 pb-2 pl-28">
            <div className="flex-1">09:00 AM</div>
            <div className="flex-1">10:00 AM</div>
            <div className="flex-1">11:00 AM</div>
            <div className="flex-1">12:00 PM</div>
          </div>

          {/* Row 1: Boardroom A */}
          <div className="flex items-center gap-4 group/row">
            <div className="w-24 text-right text-xs font-semibold text-white/80 group-hover/row:text-white transition-colors">Boardroom A</div>
            <div className="flex-1 relative h-14 bg-white/5 rounded-xl border border-white/10 backdrop-blur-sm overflow-hidden">
              {/* Booking block: "My Booking" (Primary Gradient) */}
              <div className="absolute top-2 bottom-2 left-[10%] w-[40%] bg-gradient-to-r from-indigo-500 to-violet-600 shadow-md ring-1 ring-white/20 rounded-lg px-2.5 flex items-center gap-2 animate-in slide-in-from-left-4 duration-1000 delay-100 hover:scale-[1.02] hover:brightness-110 transition-all cursor-pointer">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-black/20 text-[10px] font-bold text-white shadow-sm overflow-hidden">
                  <img src={getAvatar("You")} alt="You" className="h-full w-full object-cover" />
                </span>
                <span className="text-[11px] font-bold text-white truncate drop-shadow-sm">You</span>
              </div>
            </div>
          </div>

          {/* Row 2: Focus Booth */}
          <div className="flex items-center gap-4 group/row">
            <div className="w-24 text-right text-xs font-semibold text-white/80 group-hover/row:text-white transition-colors">Focus Booth 2</div>
            <div className="flex-1 relative h-14 bg-white/5 rounded-xl border border-white/10 backdrop-blur-sm overflow-hidden">
              {/* Booking block: "Someone Else" (Rose Gradient) */}
              <div className="absolute top-2 bottom-2 left-[50%] w-[25%] bg-gradient-to-r from-rose-500 to-red-600 shadow-md ring-1 ring-white/20 rounded-lg px-2.5 flex items-center gap-2 animate-in slide-in-from-left-4 duration-1000 delay-200 hover:scale-[1.02] hover:brightness-110 transition-all cursor-pointer">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-black/20 text-[10px] font-bold text-white shadow-sm overflow-hidden">
                  <img src={getAvatar("Elena")} alt="Elena" className="h-full w-full object-cover" />
                </span>
                <span className="text-[11px] font-bold text-white truncate drop-shadow-sm">Elena R.</span>
              </div>
            </div>
          </div>

          {/* Row 3: Creative Lab */}
          <div className="flex items-center gap-4 group/row">
            <div className="w-24 text-right text-xs font-semibold text-white/80 group-hover/row:text-white transition-colors">Creative Lab</div>
            <div className="flex-1 relative h-14 bg-white/5 rounded-xl border border-white/10 backdrop-blur-sm overflow-hidden">
              {/* Current time indicator line */}
              <div className="absolute left-[35%] top-0 bottom-0 w-px bg-red-400/80 z-10 shadow-[0_0_12px_rgba(248,113,113,1)]">
                <div className="absolute -top-1 -left-1 size-2 rounded-full bg-red-400"></div>
              </div>
              
              {/* Booking block: "Attending" (Amber Gradient) */}
              <div className="absolute top-2 bottom-2 left-[20%] w-[30%] bg-gradient-to-r from-amber-500 to-yellow-500 shadow-md ring-1 ring-white/20 rounded-lg px-2.5 flex items-center gap-2 animate-in slide-in-from-left-4 duration-1000 delay-300 hover:scale-[1.02] hover:brightness-110 transition-all cursor-pointer">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-black/20 text-[10px] font-bold text-white shadow-sm overflow-hidden">
                  <img src={getAvatar("Marcus")} alt="Marcus" className="h-full w-full object-cover" />
                </span>
                <span className="text-[11px] font-bold text-white truncate drop-shadow-sm">Marcus T.</span>
              </div>
            </div>
          </div>

          {/* Row 4: Client Lounge */}
          <div className="flex items-center gap-4 group/row">
            <div className="w-24 text-right text-xs font-semibold text-white/80 group-hover/row:text-white transition-colors">Client Lounge</div>
            <div className="flex-1 relative h-14 bg-white/5 rounded-xl border border-white/10 backdrop-blur-sm overflow-hidden">
              {/* Booking block: "Someone Else" (Rose Gradient) */}
              <div className="absolute top-2 bottom-2 left-[70%] w-[25%] bg-gradient-to-r from-rose-500 to-red-600 shadow-md ring-1 ring-white/20 rounded-lg px-2.5 flex items-center gap-2 animate-in slide-in-from-left-4 duration-1000 delay-500 hover:scale-[1.02] hover:brightness-110 transition-all cursor-pointer">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-black/20 text-[10px] font-bold text-white shadow-sm overflow-hidden">
                  <img src={getAvatar("Sarah")} alt="Sarah" className="h-full w-full object-cover" />
                </span>
                <span className="text-[11px] font-bold text-white truncate drop-shadow-sm">Sarah J.</span>
              </div>
            </div>
          </div>

          {/* Row 5: Main Auditorium */}
          <div className="flex items-center gap-4 group/row">
            <div className="w-24 text-right text-xs font-semibold text-white/80 group-hover/row:text-white transition-colors">Auditorium</div>
            <div className="flex-1 relative h-14 bg-white/5 rounded-xl border border-white/10 backdrop-blur-sm overflow-hidden">
              {/* Booking block: "Someone Else" (Rose Gradient) */}
              <div className="absolute top-2 bottom-2 left-[0%] w-[20%] bg-gradient-to-r from-rose-500 to-red-600 shadow-md ring-1 ring-white/20 rounded-lg px-2.5 flex items-center gap-2 animate-in slide-in-from-left-4 duration-1000 delay-700 hover:scale-[1.02] hover:brightness-110 transition-all cursor-pointer">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-black/20 text-[10px] font-bold text-white shadow-sm overflow-hidden">
                  <img src={getAvatar("Alex")} alt="Alex" className="h-full w-full object-cover" />
                </span>
                <span className="text-[11px] font-bold text-white truncate drop-shadow-sm">Alex M.</span>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-3 font-bold text-xl tracking-tight">
          <div className="flex size-10 items-center justify-center transition-transform hover:scale-105">
            <img src="/logo.svg" alt="BookSpace Logo" className="h-full w-full object-contain" />
          </div>
          BookSpace
        </div>

        <div className="relative z-10 max-w-md">
          <h1 className="text-4xl font-bold tracking-tight mb-5 text-white leading-tight drop-shadow-sm">
            Manage your workspace seamlessly
          </h1>
          <p className="text-white/90 text-lg mb-8 leading-relaxed drop-shadow-sm">
            The all-in-one platform to book rooms, manage reservations, and organize your team's day efficiently.
          </p>
          <div className="flex items-center gap-4 text-sm text-white/90">
            <div className="flex -space-x-2">
              <div className="size-8 rounded-full overflow-hidden border-2 border-white/30 bg-white/20">
                <img src={getAvatar("Alice")} alt="User 1" className="h-full w-full object-cover" />
              </div>
              <div className="size-8 rounded-full overflow-hidden border-2 border-white/30 bg-white/20">
                <img src={getAvatar("Bob")} alt="User 2" className="h-full w-full object-cover" />
              </div>
              <div className="size-8 rounded-full overflow-hidden border-2 border-white/30 bg-white/20">
                <img src={getAvatar("Charlie")} alt="User 3" className="h-full w-full object-cover" />
              </div>
            </div>
            <p className="drop-shadow-sm font-medium">Trusted by 10,000+ teams worldwide</p>
          </div>
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="flex w-full lg:w-1/2 items-center justify-center p-8 sm:p-12 relative">
        {/* Theme toggle corner button */}
        <div className="absolute right-4 top-4 z-20 sm:right-8 sm:top-8">
          <button
            type="button"
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            className="flex size-10 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Toggle theme"
            title={`Switch to ${resolvedTheme === "dark" ? "light" : "dark"} mode`}
          >
            {resolvedTheme === "dark" ? <Sun className="size-4 text-amber-500" /> : <Moon className="size-4" />}
          </button>
        </div>

        <div className="w-full max-w-[400px] space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex flex-col space-y-2 text-center lg:text-left">
            <div className="flex lg:hidden justify-center mb-4">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-500/20">
                <Calendar className="size-6" />
              </div>
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-foreground">Welcome back</h2>
            <p className="text-sm text-muted-foreground">
              Please enter your details to sign in to your account
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive animate-in fade-in slide-in-from-top-1">
                <AlertCircle className="size-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm font-medium">Username</Label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground group-focus-within:text-indigo-500 transition-colors">
                  <User className="size-4" />
                </div>
                <Input
                  id="username"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder="admin or employee"
                  className="pl-10 bg-muted/40 border-border focus-visible:bg-background h-11 transition-all"
                  required
                  autoComplete="username"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-medium">Password</Label>
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground group-focus-within:text-indigo-500 transition-colors">
                  <Lock className="size-4" />
                </div>
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••"
                  className="pl-10 pr-10 bg-muted/40 border-border focus-visible:bg-background h-11 transition-all"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground transition-colors hover:text-foreground focus:outline-none"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-11 text-base group bg-indigo-600 hover:bg-indigo-700 text-white transition-all shadow-md hover:shadow-lg shadow-indigo-500/20"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign in
                  <ArrowRight className="ml-2 size-4 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </Button>
          </form>
          
          <div className="text-center text-sm text-muted-foreground lg:text-left">
            Don't have an account? <span className="font-medium text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer">Contact IT Support</span>
          </div>
        </div>
      </div>
    </div>
  );
}
