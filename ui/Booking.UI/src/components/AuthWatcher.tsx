import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { onUnauthorized } from "../lib/auth";

// Renders nothing — just bridges auth.ts's plain-DOM-event notifyUnauthorized() (fired by
// apiClient on a 401 for a request that carried a token) into an actual react-router navigation.
// Has to live inside <BrowserRouter> to use useNavigate, which is why this isn't handled in
// apiClient.ts directly.
export function AuthWatcher() {
  const navigate = useNavigate();

  useEffect(() => onUnauthorized(() => navigate("/login")), [navigate]);

  return null;
}
