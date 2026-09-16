import { useState, useEffect, type FormEvent } from "react";
import {
  AlertCircle,
  Loader2,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  Shield,
  UserPlus,
  X
} from "lucide-react";
import { ApiError } from "../lib/apiClient";
import { registerUser, promoteUser } from "../lib/api";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Button } from "./ui/button";

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export function UserModal({ isOpen, onClose, onSuccess }: UserModalProps) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"Admin" | "Employee">("Employee");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setUsername("");
      setEmail("");
      setPassword("");
      setRole("Employee");
      setShowPassword(false);
      setError(null);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const trimmedUsername = username.trim();
      const trimmedEmail = email.trim();
      
      const response = await registerUser({ 
        username: trimmedUsername, 
        email: trimmedEmail, 
        password 
      });
      
      if (role === "Admin" && response.userId) {
        await promoteUser(response.userId);
      }
      
      onSuccess(`User "${trimmedUsername}" created successfully.`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <UserPlus className="size-5 text-primary" />
            <h2 className="text-xl font-semibold tracking-tight">Create User</h2>
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
            </div>

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
                  placeholder="????????"
                  className="bg-card pr-9"
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground focus:outline-none"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <div>
              <Label className="flex items-center gap-1.5 text-xs font-semibold text-foreground mb-1.5">
                <Shield className="size-3.5 text-muted-foreground" />
                <span>Account Role</span>
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRole("Employee")}
                  className={`flex flex-col items-start gap-1 rounded-xl border p-2 text-left transition-all ${
                    role === "Employee"
                      ? "border-primary bg-primary/5 text-foreground ring-1 ring-primary"
                      : "border-border bg-card text-muted-foreground hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-center gap-1 text-xs font-semibold text-foreground">
                    <User className="size-3.5 text-primary" />
                    <span>Employee</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setRole("Admin")}
                  className={`flex flex-col items-start gap-1 rounded-xl border p-2 text-left transition-all ${
                    role === "Admin"
                      ? "border-indigo-500 bg-indigo-500/5 text-foreground ring-1 ring-indigo-500"
                      : "border-border bg-card text-muted-foreground hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-center gap-1 text-xs font-semibold text-foreground">
                    <Shield className="size-3.5 text-indigo-500" />
                    <span>Administrator</span>
                  </div>
                </button>
              </div>
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
                  <span>Creating...</span>
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
      </div>
    </div>
  );
}
