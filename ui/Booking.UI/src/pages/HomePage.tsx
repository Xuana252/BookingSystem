import { Link, useNavigate } from "react-router-dom";
import { clearToken, isAuthenticated } from "../lib/auth";

export function HomePage() {
  const navigate = useNavigate();
  const authenticated = isAuthenticated();

  function handleLogout() {
    clearToken();
    navigate("/login");
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-semibold text-slate-900">BookingSystem</h1>
      <p className="mt-2 text-slate-600">
        Room calendar, booking flow, and live availability land in a later phase — this is just
        the frontend scaffold.
      </p>

      {authenticated ? (
        <button
          onClick={handleLogout}
          className="mt-6 rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Log out
        </button>
      ) : (
        <Link
          to="/login"
          className="mt-6 inline-block rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Sign in
        </Link>
      )}
    </div>
  );
}
