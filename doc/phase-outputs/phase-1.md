# Phase 1 Output — Sprint 1: Foundations

**Sprint window:** 2026-08-04 → 2026-08-17 (present 2026-08-18)
**Status:** Complete
**Tracker mapping:** Architecture (Microservice/Event pattern), C#/.NET 10, Docker, PostgreSQL,
xUnit, Moto (AWS mocking), Git Flow, Final Project — Backend (API + Worker) foundation

## Goal (from plan)

`docker compose up` brings up local infra; API skeleton responds; SNS/SQS producer(Api)/
consumer(Worker) event-pattern POC works.

## How to demo it (end result)

```powershell
cd src
docker compose up -d

# in separate terminals
dotnet run --project Booking.Api
dotnet run --project Booking.Worker
```

- Interactive API reference: `http://localhost:5133/scalar/v1`
- Health check: `http://localhost:5133/health`
- Create a Room → a User → a Reservation through Scalar, then switch to the Worker's terminal to
  show the event arriving live.

---

## Task-by-task breakdown

### 1. Repo scaffold

**What:** Git Flow branching (`main`/`develop`/`feature/*`), `.gitignore` (.NET + Node + Docker),
`.editorconfig`, `.gitattributes` (forces LF on shell scripts so Windows checkouts don't break the
Linux-container `moto-init` script), initial `README.md`.

**Output:** `.gitignore`, `.editorconfig`, `.gitattributes`, `README.md`, initial commit on
`main`, `develop` branch created.

### 2. .NET solution skeleton

**What:** Scaffolded `src/BookingSystem.slnx` targeting `net10.0`, with central package
management (`Directory.Packages.props`) and four projects: `Booking.Domain`,
`Booking.Infrastructure`, `Booking.Api` (ASP.NET Core Web API), `Booking.Worker` (Worker Service),
plus `test/Booking.UnitTests` (xUnit). Removed template noise (`WeatherForecast`, default
`Class1.cs`/`Worker.cs`).

**Output:** `src/BookingSystem.slnx`, `src/Directory.Packages.props`, 4 projects + 1 test project,
all building clean.

**Verification:** `dotnet build` — 0 errors.

### 3. Domain entities

**What:** `User`, `Room`, `Reservation` entities in `Booking.Domain/Entities`. Named the core
entity `Reservation`, not `Booking` — a class literally named `Booking` inside the `Booking.*`
namespace tree causes a real `CS0118` compiler error anywhere it's referenced from code that is
itself in a `Booking.X` namespace, confirmed with a throwaway repro before committing to it.

**Output:** `Booking.Domain/Entities/{User,Room,Reservation}.cs`.

### 4. EF Core + Postgres persistence

**What:** `BookingDbContext`, entity-type configurations (`UserConfiguration`,
`RoomConfiguration`, `ReservationConfiguration`), a design-time `IDesignTimeDbContextFactory` so
`dotnet ef` works without a startup project, and the initial migration.

**Output:** `Booking.Infrastructure/Persistence/{BookingDbContext,BookingDbContextFactory}.cs`,
`Persistence/Configurations/*.cs`, `Persistence/Migrations/20260809045459_InitialCreate.*`.

**Verification:** `dotnet ef database update` applied cleanly; confirmed via
`docker exec local-postgres psql -U dev -d devdb -c "\dt"` that `Users`, `Rooms`, `Reservations`,
and `__EFMigrationsHistory` tables exist.

### 5. Docker Compose infra

**What:** Built on top of the docker-compose.yml the user had already started (kept `postgres:16`
as-is). Added a `redis:7.2-alpine` service, a health check for the `moto` service, and a
`moto-init` one-shot container running `src/moto-init/init-all.sh`, which provisions the
`booking-events` SNS topic, `booking-events-queue` SQS queue, a `booking-events-dlq` dead-letter
queue, and subscribes the queue to the topic.

**Output:** `src/docker-compose.yml`, `src/moto-init/init-all.sh`.

**Verification:** `docker compose up -d postgres redis moto moto-init` — all three long-running
containers report `healthy`; `moto-init` log confirms the topic/queue/DLQ/subscription were
created (or skipped if already present, idempotent).

### 6. Event-pattern POC (SNS → SQS)

**What:** `EventEnvelope`/`EventTypes` in Domain; `SnsEventPublisher` (Infrastructure) publishing
on reservation creation; `SqsConsumerWorker` (Worker) — a long-polling `BackgroundService` that
unwraps the SNS notification envelope and logs each event.

**Output:** `Booking.Domain/Events/{EventEnvelope,EventTypes}.cs`,
`Booking.Infrastructure/Messaging/SnsEventPublisher.cs`, `Booking.Worker/SqsConsumerWorker.cs`.

**Verification:** live run — `POST /api/reservations` → Api log shows
`[SnsEventPublisher] Published bookingsystem.reservation.created.v1`; Worker's terminal (polling
independently) shows `[SqsConsumerWorker] Received bookingsystem.reservation.created.v1 | ...`
with the exact reservation payload moments later.

### 7. xUnit test harness

**What:** `Reservation.IsValidTimeRange(start, end)` extracted as a real, reusable validation
method (not just inline controller logic), with unit tests covering end-after-start,
end-equals-start, and end-before-start.

**Output:** `test/Booking.UnitTests/Entities/ReservationTests.cs`.

**Verification:** `dotnet test` — 3/3 passing.

### 8. Phase 1 verification pass

**What:** Full-stack sanity pass tying every piece above together: build, infra, migration,
live API calls, event flow, tests — all in one go, as the trainer would see it.

**Output:** n/a (verification only) — see "How to demo it" above.

**Verification:** `dotnet build` clean · `docker compose ps` all healthy · `GET /health` → 200 ·
`dotnet test` 3/3 · full Room → User → Reservation → SNS → SQS → Worker flow confirmed live.

### 9. Security fix: vulnerable OpenAPI package

**What:** The default ASP.NET Core Web API template pulls `Microsoft.AspNetCore.OpenApi`, which
transitively brought `Microsoft.OpenApi` 2.0.0 — a known high-severity DoS vulnerability
([GHSA-v5pm-xwqc-g5wc](https://github.com/advisories/GHSA-v5pm-xwqc-g5wc), stack overflow on a
crafted OpenAPI document with circular schema references). Initially removed OpenAPI generation
entirely to sidestep it; later re-added it deliberately pinned to the patched `2.11.0` (staying on
the 2.x line — 3.x has breaking API changes incompatible with the source generator).

**Output:** `Directory.Packages.props` pin + explanatory comment.

**Verification:** `dotnet build` / `dotnet restore` — no `NU1903` vulnerability warning.

### 10. Scalar interactive API reference (demo aid)

**What:** Added `Scalar.AspNetCore` + `Microsoft.AspNetCore.OpenApi` (patched version) so the API
has a browsable, clickable reference instead of raw curl — meant specifically for the Phase 1
trainer demo.

**Output:** `Program.cs` — `AddOpenApi()` / `MapOpenApi()` / `MapScalarApiReference()` (dev only).

**Verification:** `GET /scalar/v1` → 200, renders "Booking.Api | v1" with Reservations/Rooms/Users
operations listed and interactive; `GET /openapi/v1.json` → 200 with all three controllers
documented.

### 11. Booking.Application layer

**What:** Introduced a real use-case/orchestration layer — `Booking.Application` — sitting between
Domain and Infrastructure (`Domain → Application → Infrastructure → Api/Worker`). Added
`IRoomRepository`/`IUserRepository`/`IReservationRepository` interfaces to Domain, implemented in
Infrastructure. `RoomService`/`UserService`/`ReservationService` in Application now hold the
validation + orchestration logic (previously inline in the controllers); controllers were thinned
down to DTO binding + HTTP status mapping only — a cleaner layered architecture than putting that
logic directly in the controllers.

**Output:** `Booking.Application/{DTOs,Interfaces,Services}/*.cs`,
`Booking.Domain/Interfaces/{IRoomRepository,IUserRepository,IReservationRepository}.cs`,
`Booking.Infrastructure/Persistence/Repositories/*.cs`, thinned `Booking.Api/Controllers/*.cs`.

**Verification:** `dotnet build` clean · `dotnet test` 3/3 · re-ran the full live demo flow
(Room → User → Reservation → SNS → SQS → Worker, plus the 400-on-invalid-range case) after the
refactor — identical behavior to before.

### 12. SQS polling resilience

**What:** `SqsConsumerWorker`'s `ReceiveMessageAsync` call is now wrapped in try/catch with a 5s
backoff on failure, instead of letting an unhandled exception stop the whole `BackgroundService`
(and, by default, the host). Per-message processing (`HandleMessage` + delete) is its own unit:
a message that fails to process is left undeleted for redelivery/eventual dead-lettering via the
queue's existing `RedrivePolicy`, instead of always being deleted regardless of outcome.

**Output:** `Booking.Worker/SqsConsumerWorker.cs`.

**Verification:** live fault injection, not just a build check — stopped `local-moto` mid-poll:
the Worker logged 6+ consecutive `retrying in 5s` errors over ~2 minutes, same process, never
crashed. Restarting Moto revealed it keeps SNS/SQS state in-memory only (`QueueDoesNotExistException`
after restart, since `moto-init` is one-shot and doesn't rerun automatically) — re-ran `moto-init`
manually, and the *same still-running Worker instance* picked up a brand-new reservation event
without needing to be restarted.

### 13. Application service unit tests

**What:** Added `Moq` and unit tests for `RoomService`/`UserService`/`ReservationService`, mocking
`IRoomRepository`/`IUserRepository`/`IReservationRepository`/`IEventPublisher` so each service is
tested in isolation from EF Core and the AWS SDK. Covers `GetAllAsync` delegation, `CreateAsync`
persisting the requested fields, and for `ReservationService` specifically: a valid reservation
both persists *and* publishes `ReservationCreated` (`Times.Once`), while an invalid time range
throws without touching the repository or publisher at all (`Times.Never`).

**Output:** `test/Booking.UnitTests/Services/{RoomServiceTests,UserServiceTests,
ReservationServiceTests}.cs`.

**Verification:** `dotnet test` — 10/10 passing (3 existing `Reservation` tests + 7 new).

### 14. Dockerize Api and Worker

**What:** `Dockerfile`s for `Booking.Api` (multi-stage `sdk:10.0` → `aspnet:10.0`) and
`Booking.Worker` (`sdk:10.0` → plain `runtime:10.0`, since it has no ASP.NET Core dependency),
plus `api`/`worker` services in `docker-compose.yml` so the whole stack — infra *and* app — can
run via `docker compose up`. Build context is `src/` so each Dockerfile can `COPY` its sibling
`ProjectReference`s; csproj files are restored before the rest of the source is copied, so
`dotnet restore` is its own cached layer. Containerized `api`/`worker` get
`ConnectionStrings__DefaultConnection`/`Aws__EndpointUrl`/etc. overridden via `environment:` to
use in-network service names (`postgres`, `moto`) instead of the `localhost` defaults in
`appsettings.json` (which remain correct for running via `dotnet run` on the host). Also added
`Database.Migrate()` on Api startup so the fully-dockerized stack self-provisions its schema, the
same way `moto-init` self-provisions SNS/SQS, instead of requiring a manual `dotnet ef database
update` from the host first.

**Output:** `src/Booking.Api/Dockerfile`, `src/Booking.Worker/Dockerfile`, `src/.dockerignore`,
`src/docker-compose.yml` (`api`/`worker` services), `Booking.Api/Program.cs` (startup migration).

**Verification:** `dotnet build` clean. `docker compose build` (user-run) completed successfully
for both `api` and `worker` images — no build errors. Full containerized runtime flow (both
services actually starting, talking to `postgres`/`moto` over the compose network, and completing
a live demo end-to-end) not yet separately confirmed — worth one `docker compose up -d --build`
pass through the demo flow when convenient.

---

## Notable decisions (cross-cutting)

- Entity named `Reservation`, not `Booking` (see Task 3).
- `FluentAssertions` pinned to `7.2.2` — 8.0+ requires a paid commercial license, which isn't
  appropriate to introduce into a company project without that being an explicit decision.
- `Microsoft.OpenApi` pinned to `2.11.0` — patched version, same major line as the source
  generator expects (see Task 9).
- `Booking.Application` added after the initial Phase 1 cut (see Task 11) — not part of the
  original plan, but a deliberate architectural improvement once the gap was noticed.
- Moto keeps SNS/SQS state in-memory only — a container restart wipes it, and `moto-init` won't
  automatically rerun to reprovision it (see Task 12).
