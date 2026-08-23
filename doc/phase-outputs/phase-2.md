# Phase 2 Output — Sprint 2: Core domain

**Sprint window:** 2026-08-17 → 2026-08-23 (target was Aug 31, present Sep 1 — finished ahead)
**Status:** Complete
**Tracker mapping:** Auth/JWT, Database (Notification + migration), Architecture (rules engine,
Sidecar pattern), Hangfire, Redis, Event-driven messaging (WireMock, notification client),
xUnit, Global exception handling, Splunk, DynamoDB (research), React/Frontend

## Goal (from plan)

Worker running on a schedule (Hangfire dashboard shows the recurring job); core domain logic
covered by tests.

## How to demo it (end result)

```powershell
cd src
docker compose up -d --build   # infra + Splunk + Fluent Bit + Api + Worker + Ui, all containerized
```

- UI: `http://localhost:5173` — register, log in, land on the authenticated home page
- Api: `http://localhost:8080` (`/health`, `/scalar/v1` in dev)
- Hangfire dashboard: `http://localhost:8081/hangfire/recurring` — `reservation-reminder-scan`
  executing on its `*/1 * * * *` schedule
- Splunk: `http://localhost:8000` (`admin` / `ChangeMe123!`) — search for a `CorrelationId` and
  see every Api log line for one request, plus Worker's matching "Received" line, grouped together

Or the non-dockerized flow: `docker compose up -d postgres redis moto moto-init splunk fluent-bit`,
then `dotnet run --project Booking.Api` / `--project Booking.Worker` / `npm run dev` in
`ui/Booking.UI` separately.

---

## Task-by-task breakdown

### 1. Auth flow (JWT)

**What:** `POST /api/auth/register` / `POST /api/auth/login` on a new `AuthController`, replacing
`UsersController.Create`. `IPasswordHasher` (BCrypt.Net-Next) hashes on register, verifies on
login; `IJwtTokenGenerator` issues a signed JWT. `IUserRepository` gained `GetByUsernameAsync`.
`[Authorize]` enforced on `RoomsController.Create` and all of `ReservationsController`;
`CreateReservationRequest` dropped `UserId` — ownership now comes from the token's claims, not a
client-supplied value.

**Output:** `Booking.Api/Controllers/AuthController.cs`, `Booking.Application/Services/AuthService.cs`,
`Booking.Domain/Interfaces/{IPasswordHasher,IJwtTokenGenerator}.cs`,
`Booking.Infrastructure/Security/{BCryptPasswordHasher,JwtTokenGenerator}.cs`, `Jwt` appsettings
section. Built independently outside pairing with the assistant; reviewed afterward and confirmed
it matches the planned spec exactly.

**Verification:** live, repeatedly this session — register → login → `POST /api/reservations`
with the JWT → `201`, owned by the authenticated user; same call without a token → `401`.

### 2. Expand domain — Notification entity

**What:** `Notification` entity (`UserId`/`ReservationId` FKs, `Type` enum, `Message`, nullable
`SentAt`, `CreatedAt`). `BookingHold` dropped from scope — the current `Reservation` shape needs
no intermediate hold state, and its only other justification (practicing a second Hangfire job)
is already covered by the reminder-scan job (Task 4).

**Output:** `Booking.Domain/Entities/Notification.cs`,
`Booking.Infrastructure/Persistence/Configurations/NotificationConfiguration.cs`, the
`AddNotification` migration.

**Verification:** `dotnet build` clean, migration DDL reviewed by hand; live-confirmed indirectly
— real `Notification` rows now exist in the running Postgres instance via the reminder flow.

### 3. Booking rules engine

**What:** `IBookingRuleEngine` (Domain) / `BookingRuleEngine` (Application) — business-hours
window, max-duration, and same-room overlap (excluding cancelled reservations and the candidate
itself) — invoked synchronously in `ReservationService.CreateAsync`, configurable via
`ReservationRules` appsettings.

**Output:** `Booking.Domain/Interfaces/IBookingRuleEngine.cs`,
`Booking.Application/Services/BookingRuleEngine.cs`, `ReservationRuleSettings`.

**Verification:** `dotnet test` — covered by the 12 dedicated tests in Task 7.

### 4. Hangfire recurring job

**What:** `ReservationReminderService` scans upcoming reservations and publishes
`ReservationReminderDue` through the Phase 1 SNS/SQS pipe; `SqsConsumerWorker` creates the
resulting `Notification` row on consume (delegated to `NotificationDispatchService` for proper
layering). `Booking.Worker` switched `Sdk.Worker` → `Sdk.Web` specifically to host the dashboard.

**Output:** `Booking.Application/Services/ReservationReminderService.cs`,
`Booking.Application/Services/NotificationDispatchService.cs`, `Booking.Worker/SqsConsumerWorker.cs`,
`Booking.Worker/Program.cs` (Hangfire wiring).

**Verification:** live — `GET /hangfire/recurring` confirmed `reservation-reminder-scan` actually
executing on schedule against real data (query visible in Worker's own logs every ~15s poll
interval), first live confirmation since this was built.

### 5. Redis caching

**What:** `CachedReservationRepository` decorates the EF-backed repository, caching
`GetByRoomIdAsync` (the query the rule engine's overlap check depends on) with a 5-minute TTL
safety net, invalidated on `SaveChangesAsync` right after an `AddAsync` for that room.

**Output:** `Booking.Infrastructure/Persistence/Repositories/CachedReservationRepository.cs`,
`RedisSettings`.

**Verification:** 5 unit tests (cache hit/miss/invalidate/pass-through); the running stack talks
to real Redis (`local-redis`, healthy) throughout this session's live checks.

### 6. Notification client — WireMock, then real Gmail SMTP

**What:** Started as `HttpNotificationSender` (a stubbed HTTP provider) with WireMock.Net
integration tests exercising a real HTTP round trip. Later, by explicit choice, added
`SmtpNotificationSender` (MailKit, real Gmail SMTP via an app password) as the actual live
`INotificationSender` — `HttpNotificationSender` and its WireMock tests stay in the codebase,
just no longer wired into DI, as valid coverage of that pattern.

**Output:** `test/Booking.IntegrationTests/HttpNotificationSenderTests.cs`,
`Booking.Infrastructure/External/{HttpNotificationSender,SmtpNotificationSender}.cs`,
`GmailSmtpSettings`, `.env.example` (credential setup, never committed or seen by the assistant).

**Verification:** WireMock tests passing (3, incl. a provider-unreachable case that previously
threw uncaught); `SmtpNotificationSender`'s missing-credentials guard unit-tested. Real email
delivery not exercised live — needs the user's own Gmail app password configured.

### 7. Unit tests — rules engine + AuthService

**What:** `BookingRuleEngineTests.cs` — 12 tests directly against `Validate()` (business hours,
max duration, overlap, cancelled-reservations-ignored, different-room, self-exclusion). Writing
the different-room test caught a real gap: `Validate()` never checked `RoomId` in its overlap
predicate, silently trusting the caller had already filtered — fixed for defense in depth.
`AuthServiceTests.cs` already existed from the independent auth build.

**Output:** `test/Booking.UnitTests/Services/BookingRuleEngineTests.cs`.

**Verification:** `dotnet test` — part of the current 61 unit tests, all passing.

### 8. Global exception handling middleware

**What:** `GlobalExceptionMiddleware` maps `ArgumentException`→400, `UnauthorizedAccessException`→401,
`InvalidOperationException`→409, anything else→500 (message not leaked) as a `ProblemDetails`
body, replacing scattered per-controller `try/catch`. Closed a real gap: `RoomsController.Create`
had no exception handling at all before this.

**Output:** `Booking.Api/Middleware/{GlobalExceptionMiddleware,GlobalExceptionMiddlewareExtensions}.cs`.

**Verification:** 4 unit tests invoking the middleware directly; live-exercised for real during
this session's debugging — a malformed-password-hash bug (Task 14) surfaced through it as a clean,
correctly-shaped 400 before the underlying cause was fixed.

### 9. Splunk logging — redesigned to a Fluent Bit sidecar

**What:** Originally planned as a direct Serilog HTTP Event Collector sink. Revised mid-build,
by discussion, to a log-shipping sidecar instead: Api/Worker write structured JSON to stdout and
know nothing about Splunk; Docker's `fluentd` logging driver forwards each container's stdout to
a shared `fluent-bit` container, which parses the JSON and ships it to a self-hosted Splunk's
HEC (auto-provisioned via `SPLUNK_HEC_TOKEN` at boot — no external account, no manual setup).

Two real bugs found and fixed live, not caught by any build/test: Splunk's newer image requires
`SPLUNK_GENERAL_TERMS` in addition to `SPLUNK_START_ARGS=--accept-license` or it refuses to
start; and Fluent Bit's `Splunk_Send_Raw On` routed events to the wrong HEC endpoint shape
(Splunk's `{"text":"No data","code":5}` error) — fixed to use the default event endpoint, which
correctly wraps the already-field-parsed records.

**Output:** `src/docker-compose.yml` (`splunk`/`fluent-bit` services, `logging:` blocks on
`api`/`worker`), `src/fluent-bit/{fluent-bit.conf,parsers.conf}`,
`doc/notes/sidecar-pattern.md` (flipped from "Research only" to "Applied in project").

**Verification:** live, end to end — a real reservation-creation request was searched for and
found in Splunk's own search UI by the user, after both fix cycles, each independently confirmed
via `docker logs local-fluent-bit` before moving on.

### 10. Side research — Sidecar pattern, DynamoDB

**What:** `dynamodb.md` — new research-only note, including a direct comparison against this
project's actual (genuinely relational) domain and the one scenario where DynamoDB would
honestly fit here (an append-only event/audit log). `sidecar-pattern.md` updated once Task 9
actually applied it — honestly caveated as one shared Fluent Bit instance for both services,
architecturally closer to a node-level agent than a strict one-per-instance sidecar.

**Output:** `doc/notes/dynamodb.md`, `doc/notes/sidecar-pattern.md`.

**Verification:** n/a — documentation only.

### 11. Frontend kickoff

**What:** `ui/Booking.UI` scaffolded (Vite + React 19 + TypeScript + Tailwind v4, package name
`booking-ui`). `Layout`/`HomePage`/`LoginPage`, `apiClient.ts` (fetch wrapper attaching the stored
JWT), `auth.ts` (localStorage token). Later dockerized: multi-stage `Dockerfile` (Vite build →
nginx serving the static output, SPA fallback routing), added as a `docker-compose.yml` service.

**Output:** `ui/Booking.UI/**`, `ui/Booking.UI/{Dockerfile,nginx.conf,.dockerignore}`,
`docker-compose.yml` (`ui` service), `.claude/launch.json`.

**Verification:** `npm run build`/`npm run lint` clean. Live in-browser, multiple passes: Home
and Login render; login against no backend degrades gracefully; and — after Tasks 13/14's fixes —
a full register → login → `200` → authenticated-home round trip confirmed against the real,
running Api.

---

## Additional work — surfaced during live verification, beyond the original 11-item plan

None of the six items below were caught by `dotnet build` or `dotnet test`. All six only surfaced
once the full stack was actually run and driven end to end — the running theme of this phase's
second half.

### 12. FluentValidation migration

**What:** Replaced DataAnnotations (and the `IValidatableObject` workaround
`CreateReservationRequest` needed, since `[Required]` is a no-op on non-nullable `Guid`/`DateTime`)
with FluentValidation validator classes, one per DTO. `FluentValidationActionFilter` (a global MVC
filter) replicates the automatic `[ApiController]` validation behavior FluentValidation doesn't
provide on its own.

**Output:** `Booking.Application/Validators/*.cs`, `Booking.Api/Filters/FluentValidationActionFilter.cs`.

**Verification:** one unit test class per validator + 3 tests directly against the filter.

### 13. Real DI registration bug — services registered in the wrong composition root

**What:** `AddBookingApplication()` mixed Api-only and Worker-only services in one shared bucket.
`IReservationReminderService`'s settings dependency was bound only in Worker's `Program.cs` —
crashed **Api** at startup (ASP.NET Core validates the whole DI graph in Development, which
`docker-compose.yml` sets). Fixing it surfaced the mirror-image bug already waiting for Worker:
`IReservationService` → `IBookingRuleEngine` → `ReservationRuleSettings`, bound only in Api's
`Program.cs`. Root-caused and fixed by scoping `AddBookingApplication()` to Api-only and
registering Worker's two services directly in its own `Program.cs`, instead of just patching the
two missing settings bindings.

**Output:** `Booking.Application/DependencyInjection.cs`, `Booking.Worker/Program.cs`.

**Verification:** reproduced the exact reported crash, then confirmed both
`dotnet run --project Booking.Api` and `--project Booking.Worker` get all the way past DI
validation (failing only at the later, expected Postgres-connection step).

### 14. CORS + password hasher hardening

**What:** `Booking.Api` had zero CORS configuration — `Booking.UI` couldn't reach it at all
(reproduced live: `OPTIONS` preflight → `405`). Added a named CORS policy for `localhost:5173`.
Separately, `BCryptPasswordHasher.Verify` threw an unhandled exception on a malformed/empty
stored hash (legacy `Users` rows from before password hashing existed, still sitting in the
persistent dev Postgres volume) — leaked a raw `400` with BCrypt's internal error message instead
of the normal `401` every other wrong-password attempt gets.

**Output:** `Booking.Api/Program.cs` (CORS policy), `Booking.Infrastructure/Security/BCryptPasswordHasher.cs`,
`test/Booking.UnitTests/Security/BCryptPasswordHasherTests.cs`.

**Verification:** live — reproduced both bugs through the real browser/curl against the running
stack, rebuilt, confirmed `OPTIONS` → `204` and a full register → login → `200` round trip.

### 15. Hangfire dashboard authorization fix

**What:** `UseHangfireDashboard()` with no options defaults to a local-requests-only
authorization filter, checked against the *container's* view of the connecting IP — a browser
hitting the docker-compose-published port arrives via the Docker bridge network, not `127.0.0.1`,
so genuinely local dev access was rejected as "not local" (`401`).

**Output:** `Booking.Worker/Program.cs` (explicit `DashboardOptions` with an empty `Authorization`
list for local dev — documented as needing a real filter before ever deployed anywhere else).

**Verification:** live — reproduced the `401` via curl and the browser, rebuilt, confirmed `200`
and the recurring job visible on the dashboard (this is the same check reported in Task 4).

### 16. Serilog message rendering + request logging

**What:** `JsonFormatter(renderMessage: true)` adds a fully-substituted message string alongside
the raw template + properties — a direct response to a readability complaint about raw log
entries in Splunk. `UseSerilogRequestLogging()` replaces ASP.NET Core's noisy built-in two-line
per-request logging with one clean line, in both Api and Worker.

**Output:** both `Program.cs` files, `Serilog.AspNetCore` added to `Booking.Worker`.

**Verification:** `dotnet build`/`test` clean; `RenderedMessage` field confirmed present in real
log output from the running containers.

### 17. Correlation ID across the Api/Worker boundary

**What:** `EventEnvelope.CorrelationId` — a plain, independent field, deliberately not reusing or
propagating ASP.NET Core's `TraceId` (see Notable decisions below). `CorrelationIdMiddleware`
(Api) generates one per request (or accepts an inbound `X-Correlation-Id` header) and pushes it
into a logging scope so *every* log line for that request carries it, not just the one line at
the point of publishing. `ICorrelationIdAccessor`/`HttpContextCorrelationIdAccessor` read it back
out, falling back to a fresh GUID with no ambient `HttpContext` (Worker's Hangfire-triggered scan
isn't driven by an inbound request at all). `SqsConsumerWorker` propagates the received value into
its own logging scope on consume.

**Output:** `Booking.Api/Middleware/CorrelationIdMiddleware*.cs`,
`Booking.Domain/Interfaces/ICorrelationIdAccessor.cs`,
`Booking.Infrastructure/Http/HttpContextCorrelationIdAccessor.cs`, `EventEnvelope.cs`,
`SnsEventPublisher.cs`, `SqsConsumerWorker.cs`.

**Verification:** live, full end-to-end — created a real reservation, captured its
`X-Correlation-Id` response header, grepped both `docker logs local-api` and
`docker logs local-worker`: every Api log line for that request (endpoint execution, EF Core
queries, the publish confirmation, action/endpoint completion) and Worker's "Received" line all
carried the identical correlation ID.

---

## Open items (not yet independently verified)

Two lines from the plan's own Phase 2 verification checklist weren't specifically exercised this
session, even though everything each one depends on is independently confirmed working:

- **Reminder → Notification row, truly end-to-end.** Task 4 proved the recurring job runs and
  queries `Reservations`; Task 17 proved the SNS/SQS/correlation pipe. Not yet specifically done:
  create a reservation starting soon, wait for the scan to pick it up, and watch a `Notification`
  row actually appear.
- **Unhandled exception → visible in Splunk.** Task 8 proved the middleware's response shape;
  Task 9 proved Splunk ingestion works for other log lines. Not yet specifically done: trigger an
  exception and find its entry in Splunk's search UI.

## Notable decisions (cross-cutting)

- **`BookingHold` dropped from scope** (Task 2) — decided before this phase's build work started,
  recorded in `doc/plan.md`.
- **Splunk logging redesigned from a direct sink to a sidecar mid-build** (Task 9) — a genuine
  architecture change made by discussion partway through, not part of the original plan text.
- **`CorrelationId` deliberately does not reuse `TraceId`** (Task 17): Worker's SQS polling loop
  has no ambient `Activity` to parent a real child span from; stamping `TraceId` onto an event
  without properly parenting a new `Activity` from it would look like real distributed tracing
  data to any tool that later tries to visualize it, while actually being wrong. Nothing today
  consumes span/OTLP data anyway, so the more complex approach would have bought nothing near-term.
- **Auth flow (Task 1) was built independently**, outside pairing with the assistant, then
  reviewed afterward — confirmed to match the planned spec exactly, no changes needed.
- **A recurring pattern this phase**: six real bugs (Tasks 13–15, plus the two Splunk fixes in
  Task 9) were invisible to `dotnet build`/`dotnet test` and only surfaced once the full
  docker-compose stack was actually run and driven end to end. Reinforces that a clean build and
  green tests are necessary, not sufficient — several of this phase's most important fixes came
  from watching real requests hit the real running system.
- `FluentAssertions` stays pinned to `7.2.2` (inherited from Phase 1, unchanged this phase).
