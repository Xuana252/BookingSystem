# BookingSystem — Real-Time Room & Facility Booking Platform

A room/facility reservation system: users browse available rooms, book time slots, and see live
availability updates as other users book or cancel. Built as an OJT learning project, layered on
.NET, PostgreSQL, Redis, Hangfire, event-driven messaging (SNS/SQS via Moto), SignalR, and React.

See [`doc/plan.md`](doc/plan.md) for the full sprint-by-sprint build plan and current status.

## Repository layout

- `src/` — .NET solution (`BookingSystem.slnx`), layered Domain -> Application -> Infrastructure -> Api/Worker
  - `Booking.Domain` — entities, repository/publisher interfaces, events, config (no external dependencies)
  - `Booking.Application` — use-case services (validation, orchestration), request/response DTOs. Depends only on Domain.
  - `Booking.Infrastructure` — EF Core persistence (repositories), SNS/SQS clients, caching, hubs. Implements Domain interfaces.
  - `Booking.Api` — ASP.NET Core Web API (thin controllers calling Application services, auth, health)
  - `Booking.Worker` — background host (SQS consumer, Hangfire scheduled jobs)
  - `test/` — `Booking.UnitTests`, `Booking.IntegrationTests`
  - `docker-compose.yml` — local infra (Postgres, Redis, Moto)
- `ui/Booking.UI` — React (Vite) frontend
- `doc/plan.md` — sprint-by-sprint build plan, key architectural decisions, current status
- `doc/notes/` — one file per OJT tracker topic, following `doc/notes/_TEMPLATE.md`: summary, key
  concepts, cheatsheet, and — critically — where (if anywhere) it's actually applied in this
  project. Covers both applied topics (Docker, PostgreSQL, xUnit, ...) and research-only ones
  (Sidecar pattern, Spec Kit, ...).
- `doc/phase-outputs/` — one summary per sprint phase (what was built, verification results, demo steps)

## Quick start (development)

Prereqs: Docker, .NET 10 SDK, Node.js 20.

### 1) Infrastructure (Docker)

```powershell
cd src
docker compose up -d postgres redis moto moto-init splunk fluent-bit
```

### 2) Backend (API + Worker)

```powershell
dotnet run --project src/Booking.Api
dotnet run --project src/Booking.Worker
```

- API health: `http://localhost:5133/health`
- Interactive API reference (Scalar, dev only): `http://localhost:5133/scalar/v1`

### 3) Frontend (UI)

```powershell
cd ui/Booking.UI
npm install
npm run dev
```

- UI: `http://localhost:5173` (Vite default)

### Fully dockerized (alternative)

`api`, `worker`, and `ui` are also real `docker-compose.yml` services (each with its own
Dockerfile) — to run the whole stack as containers instead of local processes:

```powershell
cd src
docker compose up -d --build
```

- UI: `http://localhost:5173` (nginx-served production build, not Vite's dev server)
- API: `http://localhost:8080`

## Branching convention (Git Flow, lightweight)

- `main` — stable, always deployable
- `develop` — integration branch; feature work merges here first
- `feature/*` — short-lived branches off `develop`, one per task/topic
- Merge to `main` only from `develop` at sprint milestones

## Tech stack

- Backend: C# 13, .NET 10, EF Core, Hangfire, AWSSDK (SNS/SQS via Moto), SignalR
- Frontend: React 19, Vite, TypeScript, Tailwind CSS
- Infra: PostgreSQL, Redis, Moto (AWS emulator), Splunk + Fluent Bit (log shipping)
- Testing: xUnit, WireMock.Net
