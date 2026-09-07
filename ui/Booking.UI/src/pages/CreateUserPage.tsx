import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  Shield,
  ShieldAlert,
  User,
  UserPlus,
} from "lucide-react";
import { isAdmin } from "../lib/auth";
import { ApiError } from "../lib/apiClient";
import { promoteUser, registerUser } from "../lib/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";

export function CreateUserPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"Employee" | "Admin">("Employee");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isAdmin()) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          <ShieldAlert className="size-6" />
        </div>
        <h2 className="text-lg font-semibold text-foreground">Access Restricted</h2>
        <p className="mt-1 text-xs text-muted-foreground">Only system administrators are authorized to create user accounts.</p>
        <Link
          to="/"
          className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
        >
          <ArrowLeft className="size-3.5" />
          <span>Return to calendar</span>
        </Link>
      </div>
    );
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const trimmedUsername = username.trim();
    const trimmedEmail = email.trim();

    if (!trimmedUsername || trimmedUsername.length < 3 || trimmedUsername.length > 50) {
      setError("Username must be between 3 and 50 characters.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setError("Please provide a valid email address.");
      return;
    }

    if (!password || password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Register user
      const response = await registerUser({
        username: trimmedUsername,
        email: trimmedEmail,
        password,
      });

      // 2. Promote to Admin if requested
      if (role === "Admin" && response.userId) {
        await promoteUser(response.userId);
      }

      navigate("/admin/users", {
        state: {
          successMessage: `User "${trimmedUsername}" created successfully (${role === "Admin" ? "Administrator" : "Employee"}).`,
        },
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create user account. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            to="/admin/users"
            className="mb-1 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" />
            <span>Back to user management</span>
          </Link>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Create User Account</h1>
          <p className="text-xs text-muted-foreground">Register a new employee or administrator account</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-5">
        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-xs md:col-span-3"
        >
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
              <AlertCircle className="size-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Username */}
          <div>
            <Label htmlFor="username" className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <User className="size-3.5 text-muted-foreground" />
              <span>Username</span>
            </Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. sarah_connor or jdoe"
              className="mt-1.5 bg-card"
              required
              minLength={3}
              maxLength={50}
              autoComplete="off"
            />
            <span className="mt-1 block text-[11px] text-muted-foreground">Between 3 and 50 characters.</span>
          </div>

          {/* Email */}
          <div>
            <Label htmlFor="email" className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <Mail className="size-3.5 text-muted-foreground" />
              <span>Email</span>
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. user@example.com"
              className="mt-1.5 bg-card"
              required
              autoComplete="off"
            />
          </div>

          {/* Password */}
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
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="bg-card pr-9"
                required
                minLength={8}
                autoComplete="new-password"
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
            <span className="mt-1 block text-[11px] text-muted-foreground">Minimum 8 characters.</span>
          </div>

          {/* Role Selection */}
          <div>
            <Label className="flex items-center gap-1.5 text-xs font-semibold text-foreground mb-1.5">
              <Shield className="size-3.5 text-muted-foreground" />
              <span>Account Role</span>
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRole("Employee")}
                className={`flex flex-col items-start gap-1 rounded-xl border p-2.5 text-left transition-all ${
                  role === "Employee"
                    ? "border-primary bg-primary/5 text-foreground ring-1 ring-primary"
                    : "border-border bg-card text-muted-foreground hover:bg-muted/50"
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                  <User className="size-3.5 text-primary" />
                  <span>Employee</span>
                </div>
                <span className="text-[10px] text-muted-foreground">Standard booking permissions</span>
              </button>

              <button
                type="button"
                onClick={() => setRole("Admin")}
                className={`flex flex-col items-start gap-1 rounded-xl border p-2.5 text-left transition-all ${
                  role === "Admin"
                    ? "border-indigo-500 bg-indigo-500/5 text-foreground ring-1 ring-indigo-500"
                    : "border-border bg-card text-muted-foreground hover:bg-muted/50"
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                  <Shield className="size-3.5 text-indigo-500" />
                  <span>Administrator</span>
                </div>
                <span className="text-[10px] text-muted-foreground">Full room & user management</span>
              </button>
            </div>
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              disabled={isSubmitting}
              size="lg"
              className="w-full gap-2 bg-gradient-to-r from-primary to-indigo-600 font-semibold text-primary-foreground shadow-sm shadow-primary/25 hover:opacity-95"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>Creating User...</span>
                </>
              ) : (
                <>
                  <UserPlus className="size-4" />
                  <span>Create User</span>
                </>
              )}
            </Button>
          </div>
        </form>

        {/* Live Preview Card */}
        <div className="space-y-4 md:col-span-2">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Live Preview
          </div>
          <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
            <div className="flex items-center gap-3">
              <div
                className={`flex size-10 shrink-0 items-center justify-center rounded-xl text-base font-bold text-white shadow-xs ${
                  role === "Admin" ? "bg-indigo-600" : "bg-primary"
                }`}
              >
                {username ? username[0]?.toUpperCase() : "U"}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold text-foreground">
                  {username || "Username"}
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Mail className="size-3" />
                  <span className="truncate">{email || "email@example.com"}</span>
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs">
              <span className="text-muted-foreground">Assigned Role</span>
              <Badge
                variant={role === "Admin" ? "indigo" : "secondary"}
                className="gap-1 text-[11px]"
              >
                {role === "Admin" ? (
                  <>
                    <Shield className="size-3 text-indigo-500" />
                    <span>Administrator</span>
                  </>
                ) : (
                  <>
                    <User className="size-3 text-muted-foreground" />
                    <span>Employee</span>
                  </>
                )}
              </Badge>
            </div>

            <div className="mt-3 flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-2.5 py-1.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="size-3.5 shrink-0" />
              <span>Active upon creation</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
