# BookingSystem — Real-Time Room & Facility Booking Platform

A room/facility reservation system: users browse available rooms, book time slots, and see live
availability updates as other users book or cancel. Built as an OJT learning project, layered on
.NET, PostgreSQL, Redis, Hangfire, event-driven messaging (SNS/SQS via Moto), SignalR, and
Next.js.

## Repository layout

- `src/` — .NET solution (`BookingSystem.slnx`)
  - `Booking.Domain` — entities, interfaces, DTOs (no external dependencies)
  - `Booking.Infrastructure` — EF Core persistence, SNS/SQS clients, caching, hubs
  - `Booking.Api` — ASP.NET Core Web API (controllers, auth, health)
  - `Booking.Worker` — background host (SQS consumer, Hangfire scheduled jobs)
  - `test/` — `Booking.UnitTests`, `Booking.IntegrationTests`
  - `docker-compose.yml` — local infra (Postgres, Redis, Moto)
- `ui/Booking.UI` — Next.js frontend
- `doc/research/` — short write-ups for OJT topics not merged into the app (Sidecar pattern,
  DynamoDB, AWS-cloud services, AI/process topics)

## Quick start (development)

Prereqs: Docker, .NET 10 SDK, Node.js 20.

### 1) Infrastructure (Docker)

```powershell
cd src
docker compose up -d
```

### 2) Backend (API + Worker)

```powershell
dotnet run --project src/Booking.Api
dotnet run --project src/Booking.Worker
```

- API health: `http://localhost:5133/health`

### 3) Frontend (UI)

```powershell
cd ui/Booking.UI
npm install
npm run dev
```

- UI: `http://localhost:3000`

## Branching convention (Git Flow, lightweight)

- `main` — stable, always deployable
- `develop` — integration branch; feature work merges here first
- `feature/*` — short-lived branches off `develop`, one per task/topic
- Merge to `main` only from `develop` at sprint milestones

## Tech stack

- Backend: C# 13, .NET 10, EF Core, Hangfire, AWSSDK (SNS/SQS via Moto), SignalR
- Frontend: React 19, Next.js, TypeScript, Tailwind CSS
- Infra: PostgreSQL, Redis, Moto (AWS emulator)
- Testing: xUnit, WireMock.Net
