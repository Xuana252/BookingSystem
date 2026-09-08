const TOKEN_KEY = "bookingsystem.token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

const UNAUTHORIZED_EVENT = "bookingsystem:unauthorized";

// apiClient calls this when a request that *did* carry a token still comes back 401 — the
// session's token has expired or been invalidated server-side. Clears it and fires a DOM event
// rather than importing react-router here (this is a plain module, not a component) — AuthWatcher
// (mounted once in App.tsx, inside the router) is the one listener that turns this into an actual
// navigate("/login"). Deliberately not fired for an anonymous request's 401 (e.g. a wrong-password
// attempt on the login page itself) — see apiClient.ts's `token &&` guard.
export function notifyUnauthorized(): void {
  clearToken();
  window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
}

export function onUnauthorized(callback: () => void): () => void {
  window.addEventListener(UNAUTHORIZED_EVENT, callback);
  return () => window.removeEventListener(UNAUTHORIZED_EVENT, callback);
}

export function isAuthenticated(): boolean {
  return getToken() !== null;
}

export type UserRole = "Employee" | "Admin";

interface TokenPayload {
  sub?: string;
  unique_name?: string;
  role?: UserRole;
}

// No dedicated /api/users/me endpoint exists, and login's AuthResponse fields (userId,
// username) aren't persisted separately — decode straight from the token instead of adding
// either. JwtTokenGenerator issues "sub"/"unique_name" (see
// Booking.Infrastructure/Security/JwtTokenGenerator.cs); "sub" is also the claim the server-side
// ReservationHubUserIdProvider reads for SignalR's Clients.User(...) targeting.
function decodeToken(): TokenPayload | null {
  const token = getToken();
  if (!token) {
    return null;
  }

  try {
    const payload = token.split(".")[1];
    return JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/"))) as TokenPayload;
  } catch {
    return null;
  }
}

export function getCurrentUserId(): string | null {
  return decodeToken()?.sub ?? null;
}

export function getCurrentUsername(): string | null {
  return decodeToken()?.unique_name ?? null;
}

// Mirrors JwtTokenGenerator's "role" claim — see Booking.Api/Program.cs's
// RoleClaimType = "role" for why it's not the default ClaimTypes.Role. This is a UX
// convenience only (hides the Create Room nav item for non-admins); the Api enforces the real
// boundary via [Authorize(Roles = "Admin")] regardless of what the UI shows.
export function isAdmin(): boolean {
  return decodeToken()?.role === "Admin";
}
