import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  Calendar,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  Moon,
  Sun,
  User,
} from "lucide-react";
import { ApiError, apiClient } from "../lib/apiClient";
import { setToken } from "../lib/auth";
import type { AuthResponse } from "../lib/types";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { useTheme } from "../hooks/useTheme";

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

  function fillDemoAdmin() {
    setUsername("admin");
    setPassword("Admin@12345");
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-4 sm:p-6 transition-colors">
      {/* Ambient background glows */}
      <div className="pointer-events-none absolute -top-40 -right-40 size-96 rounded-full bg-primary/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -left-40 size-96 rounded-full bg-violet-600/15 blur-3xl" />

      {/* Theme toggle corner button */}
      <div className="absolute right-4 top-4 z-20 sm:right-6 sm:top-6">
        <button
          type="button"
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          className="flex size-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground shadow-xs transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Toggle theme"
          title={`Switch to ${resolvedTheme === "dark" ? "light" : "dark"} mode`}
        >
          {resolvedTheme === "dark" ? <Sun className="size-4 text-amber-400" /> : <Moon className="size-4" />}
        </button>
      </div>

      <div className="relative z-10 w-full max-w-sm space-y-6">
        {/* Brand header */}
        <div className="flex flex-col items-center text-center">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-primary via-indigo-600 to-violet-500 text-white shadow-lg shadow-primary/25 mb-3">
            <Calendar className="size-6" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Sign in to BookingSystem</h1>
          <p className="mt-1 text-xs text-muted-foreground">Enter your workplace credentials to manage reservations</p>
        </div>

        {/* Login form card */}
        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-2xl ring-1 ring-white/5"
        >
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
              <AlertCircle className="size-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <Label htmlFor="username" className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <User className="size-3.5 text-muted-foreground" />
              <span>Username</span>
            </Label>
            <Input
              id="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="e.g. admin or employee"
              className="mt-1.5 bg-background border-border"
              required
              autoComplete="username"
            />
          </div>

          <div>
            <Label htmlFor="password" className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <Lock className="size-3.5 text-muted-foreground" />
              <span>Password</span>
            </Label>
            <div className="relative mt-1.5">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                className="bg-background border-border pr-9"
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground focus:outline-none"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
            size="lg"
            className="w-full gap-2 bg-gradient-to-r from-primary to-indigo-600 font-semibold text-primary-foreground shadow-sm shadow-primary/25 hover:opacity-95"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                <span>Signing in...</span>
              </>
            ) : (
              <span>Sign in</span>
            )}
          </Button>

          {/* Demo account quick-fill pill */}
          <div className="border-t border-border pt-3">
            <button
              type="button"
              onClick={fillDemoAdmin}
              className="flex w-full items-center justify-between rounded-lg border border-dashed border-border bg-muted px-3 py-2 text-left text-xs transition-colors hover:border-primary/50 hover:bg-muted/80"
            >
              <div className="flex items-center gap-2 text-muted-foreground">
                <KeyRound className="size-3.5 text-primary" />
                <span>Use seeded Admin account</span>
              </div>
              <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                admin
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
