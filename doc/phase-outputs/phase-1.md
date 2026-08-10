# Phase 1 Output — Sprint 1: Foundations

**Sprint window:** 2026-08-04 → 2026-08-17 (present 2026-08-18)
**Status:** Complete
**Tracker mapping:** Architecture (Microservice/Event pattern), C#/.NET 10, Docker, PostgreSQL,
xUnit, Moto (AWS mocking), Git Flow, Final Project — Backend (API + Worker) foundation

## Goal (from plan)

`docker compose up` brings up local infra; API skeleton responds; SNS/SQS producer(Api)/
consumer(Worker) event-pattern POC works.

## What was built

- **Repo scaffold**: Git Flow branching (`main`/`develop`/`feature/*`), `.gitignore`,
  `.editorconfig`, `.gitattributes` (forces LF on shell scripts so Windows checkouts don't break
  the Linux-container `moto-init` script).
- **.NET 10 solution** (`src/BookingSystem.slnx`), layered:
  `Booking.Domain` → `Booking.Application` → `Booking.Infrastructure` → `Booking.Api`/`.Worker`.
  - `Booking.Domain` — `User`, `Room`, `Reservation` entities; `IRoomRepository`/
    `IUserRepository`/`IReservationRepository`/`IEventPublisher` interfaces; `EventEnvelope`/
    `EventTypes`; `AwsSettings`.
  - `Booking.Application` — `RoomService`/`UserService`/`ReservationService` (validation +
    orchestration), request DTOs. Depends only on Domain — no EF Core or AWS SDK references.
  - `Booking.Infrastructure` — `BookingDbContext` + EF Core configs/migration, `RoomRepository`/
    `UserRepository`/`ReservationRepository`, `SnsEventPublisher`.
  - `Booking.Api` — thin controllers (`Rooms`, `Users`, `Reservations`) calling Application
    services; Scalar interactive API reference at `/scalar/v1` (dev only).
  - `Booking.Worker` — `SqsConsumerWorker`, a long-polling `BackgroundService` that unwraps the
    SNS notification envelope and logs each event.
  - `test/Booking.UnitTests` — validation tests for `Reservation.IsValidTimeRange`.
- **Persistence**: EF Core + Npgsql, initial migration (`InitialCreate`) creating `Users`,
  `Rooms`, `Reservations` tables.
- **Docker Compose** (`src/docker-compose.yml`): Postgres 16, Redis 7.2, Moto (SNS/SQS/DynamoDB
  emulator) with a health check, and a `moto-init` one-shot container that provisions the
  `booking-events` SNS topic, `booking-events-queue` SQS queue, a `booking-events-dlq`
  dead-letter queue, and subscribes the queue to the topic.
- **Event-pattern POC**: `POST /api/reservations` saves to Postgres, then publishes a
  `ReservationCreated` event to SNS. The Worker's SQS consumer picks it up, unwraps the SNS
  envelope, and logs the full payload.

## Verification results

- `dotnet build` — clean, 0 errors (only a benign pre-existing `LIB` env var warning unrelated to
  the project).
- `dotnet test` — 3/3 passing (`Reservation.IsValidTimeRange`: end-after-start, end-equals-start,
  end-before-start).
- `docker compose up -d` — Postgres, Redis, and Moto all report `healthy`; `moto-init` completes
  and provisions the SNS topic + SQS queue + DLQ + subscription.
- Live demo run (via the Scalar UI, not just curl):
  1. `POST /api/rooms` → 201, room persisted.
  2. `POST /api/users` → 201, user persisted.
  3. `POST /api/reservations` (valid range) → 201; Api log shows the INSERT and
     `[SnsEventPublisher] Published bookingsystem.reservation.created.v1`.
  4. `POST /api/reservations` (end before start) → 400, validated by
     `Reservation.IsValidTimeRange` in the Application layer.
  5. Worker log (separate terminal, polling independently) shows
     `[SqsConsumerWorker] Received bookingsystem.reservation.created.v1 | ...` with the full
     reservation payload matching what the Api just created — confirming the Api → SNS → SQS →
     Worker path end-to-end.
- A known high-severity vulnerability (`GHSA-v5pm-xwqc-g5wc`, stack-overflow DoS in
  `Microsoft.OpenApi` 2.0.0, the version the Web API template pulls by default) was caught and
  fixed by pinning `Microsoft.OpenApi` to the patched `2.11.0`.

## How to demo it

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

## Notable decisions

- Entity is named `Reservation`, not `Booking` — a class named `Booking` inside the `Booking.*`
  namespace tree causes a real `CS0118` compiler error wherever it's referenced from code that is
  itself in a `Booking.X` namespace. Confirmed with a throwaway repro before committing to the
  naming.
- `FluentAssertions` pinned to `7.2.2` (last MIT-licensed version; 8.0+ requires a paid commercial
  license).
- `Booking.Application` was added after the initial Phase 1 cut to give the solution a real
  use-case/orchestration layer (validation + event publishing), rather than putting that logic
  directly in controllers as the reference project's own `Api/Services` convention does.
