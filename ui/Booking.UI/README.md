# Booking.UI

React (Vite + TypeScript + Tailwind CSS) frontend for BookingSystem. Plain SPA — no SSR,
file-based routing, or API routes; the Api (`src/Booking.Api`) is the only backend.

See the [repo root README](../../README.md) for the full quick-start (infra, backend, frontend
together) and [`doc/plan.md`](../../doc/plan.md) for the build plan.

## Local dev

```bash
npm install
npm run dev
```

Serves on `http://localhost:5173`. Points at the Api on `http://localhost:5133/api` by default
(see `src/lib/apiClient.ts`); override with a `VITE_API_BASE_URL` env var if needed.

## Layout

- `src/lib/apiClient.ts` — fetch wrapper, attaches the stored JWT as a Bearer token
- `src/lib/auth.ts` — token storage (localStorage)
- `src/pages/` — routed pages (`LoginPage`, `HomePage` so far — room calendar/booking flow land
  in a later phase)
- `src/components/Layout.tsx` — shared header/shell for authenticated pages
