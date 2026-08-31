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

export function isAuthenticated(): boolean {
  return getToken() !== null;
}

// No dedicated /api/users/me endpoint exists, and login's AuthResponse.userId isn't persisted
// separately — decode it straight from the token instead of adding either. JwtTokenGenerator
// issues "sub" (see Booking.Infrastructure/Security/JwtTokenGenerator.cs), same claim the
// server-side ReservationHubUserIdProvider reads for SignalR's Clients.User(...) targeting.
export function getCurrentUserId(): string | null {
  const token = getToken();
  if (!token) {
    return null;
  }

  try {
    const payload = token.split(".")[1];
    const decoded = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/"))) as { sub?: string };
    return decoded.sub ?? null;
  } catch {
    return null;
  }
}
