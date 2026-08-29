# BookingSystem — Build Plan (OJT)

## Context

BookingSystem is a room/facility booking platform, built as a vehicle to learn: .NET 10,
EF Core/Postgres, Redis, Hangfire, event-driven messaging (SNS/SQS via Moto), SignalR, React,
xUnit/WireMock, Git Flow, and CI/CD — driven by a real OJT sprint schedule.

Project start: **2026-08-06**. Sprint schedule:

- **Sprint 1** (Aug 4–17, present Aug 18): Foundations
- **Sprint 2** (Aug 18–31, present Sep 1): Core domain
- **Sprint 3** (Sep 1–14, present Sep 15): Research only — no build work
- **Sprint 4** (Sep 15–28, present Sep 29): Integration, CI/CD, UI completion, polish
- **Final week** (Sep 29–Oct 4): Rehearsal/polish only

Key decisions:
- Namespace/branding root: `Booking.*` (`Booking.Domain`, `Booking.Application`,
  `Booking.Infrastructure`, `Booking.Api`, `Booking.Worker`).
- Domain: **room/facility booking** — bookable resources (rooms) with capacity, users reserve
  time slots, conflicts must be prevented, reminders/cancellation alerts fire on schedule, live
  availability updates in the UI.
- Frontend: plain **React** (Vite + TypeScript + Tailwind), not Next.js — no SSR, file-based
  routing, or API routes. The Api is the only backend.
- Tech-topic constraints from the OJT tracker: Postgres/EF Core, Redis, Hangfire, SNS/SQS (Moto),
  SignalR, React, xUnit, WireMock, GitHub Actions CI, Git Flow. DynamoDB, Sidecar pattern,
  AWS-cloud services, and AI/process topics (SpecKit, MCP, AI workflow/skills) stay as short
  research write-ups in `doc/notes/`, not merged into the real solution.
- .NET 10 targeted throughout.
- **Entity naming:** the core entity/events/rules are named `Reservation`, not `Booking` — a
  class literally named `Booking` inside the `Booking.*` namespace tree causes a real C# compiler
  error (`CS0118: 'Booking' is a namespace but is used like a type`) anywhere it's referenced
  from code that is itself in a `Booking.X` namespace. Confirmed with a throwaway repro.
  `Reservation`, `ReservationCreated`/`ReservationCancelled`/`ReservationReminderDue` events,
  `IReservationRuleEngine`. The product/solution name
  (`BookingSystem`) and namespace root (`Booking.*`) are unaffected.
- **Layering:** `Domain → Application → Infrastructure → Api/Worker`, dependencies point one
  direction only. `Booking.Application` holds use-case services (validation + orchestration) and
  request/response DTOs, depending only on `Booking.Domain`. Controllers and background jobs
  should not contain business logic — see `CLAUDE.md`.
- `doc/phase-outputs/` — one markdown summary per sprint phase (what was built, verification
  results, demo steps) — source material for the OJT tracker's "Output/Deliverable" column.
- `doc/notes/` — one file per OJT tracker topic, following `doc/notes/_TEMPLATE.md`, each mapped
  to where (if anywhere) it's applied in the project.

---

## Phase 1 — Sprint 1: Foundations (target: working by Aug 17, present Aug 18)

**Goal (matches tracker milestone):** `docker compose up` brings up local infra; API skeleton
responds; SNS/SQS producer(Api)/consumer(Worker) POC works.

1. **Repo scaffold** — `git init`, Git Flow branch convention: `main` (stable) + `develop`
   (integration), work on short-lived `feature/*` branches merged into `develop`. `.gitignore`
   (.NET + Node + Docker), `.editorconfig`, `README.md`.

2. **.NET solution skeleton** under `src/` (`net10.0`)
   - `src/BookingSystem.slnx`, `src/Directory.Packages.props` (central package management),
     seeded with just what Phase 1 needs, extended as later phases need more.
   - Projects: `Booking.Domain` (entities, interfaces, DTOs, no external dependencies),
     `Booking.Infrastructure` (EF Core `DbContext`, migrations, repository implementations,
     SNS/SQS clients), `Booking.Api` (ASP.NET Core Web API), `Booking.Worker` (Worker Service —
     SQS consumer host), `test/Booking.UnitTests` (xUnit).
   - Per-project folder shape: `Api/{Controllers,Configuration,Middleware,ServiceExtensions,
     Services}`, `Domain/{Entities,DTOs,Interfaces,Configuration}`,
     `Infrastructure/{Persistence,External,Messaging}`, `Worker/{ScheduledJobs,Hosting,
     IntegrationEvents}`.

3. **Domain entities** (minimum to stand up the DB + first flow) — `User`, `Room`, `Reservation`,
   just enough for a real CRUD flow and to give the SNS/SQS POC something meaningful to publish
   about. `Notification`/`BookingHold` deferred to Phase 2 when the reminder/expiry engine
   actually needs them.

4. **EF Core + Postgres** — `BookingDbContext`, entity configs, initial migration, applied
   against the Postgres container.

5. **Docker Compose** — `db` (Postgres), `redis` (provisioned now, wired up in Phase 2), `moto`
   (SNS/SQS), `moto-init` (one-shot AWS CLI script to create the SNS topic + SQS queue + DLQ +
   subscription).

6. **Event-pattern POC** (real plumbing, minimal business logic) — Api publishes a
   `ReservationCreated` event to SNS on reservation creation (an `EventEnvelope`-style wrapper);
   Worker runs a minimal SQS long-poll consumer that reads the message and logs it.

7. **xUnit harness** — one meaningful validation test, registered in the solution.

**Phase 1 verification**
- `dotnet build` clean · `docker compose up -d` all healthy · `GET /health` → 200 · create a
  `Reservation` via the API → message lands on SQS → Worker logs it · `dotnet test` passes.

**Status: Complete** (2026-08-09), merged into `develop`. Full task-by-task breakdown in
`doc/phase-outputs/phase-1.md`. Four follow-on hardening items landed after the initial cut:
- **`Booking.Application` layer** — use-case services (`RoomService`/`UserService`/
  `ReservationService`) + repository interfaces, thinning controllers down to DTO binding + HTTP
  status mapping only.
- **SQS polling resilience** — retry/backoff around the Worker's `ReceiveMessageAsync` call so a
  transient outage (verified live by killing Moto mid-poll) logs and retries instead of crashing
  the host; failed message processing is left undeleted for redelivery/dead-lettering instead of
  silently dropped.
- **Application service unit tests** — `Moq`-based tests for `RoomService`/`UserService`/
  `ReservationService`, mocking the repository/publisher interfaces.
- **Dockerized Api and Worker** — `Dockerfile`s for both, wired into `docker-compose.yml` so the
  whole stack (infra + app) runs via `docker compose up`, plus startup `Database.Migrate()` so it
  self-provisions its schema. `docker compose build` confirmed working (both images build clean);
  a full live-demo pass through the running containers is still worth doing once.

---

## Phase 2 — Sprint 2: Core domain (target: working by Aug 31, present Sep 1)

**Goal (matches tracker milestone):** Worker running on a schedule (Hangfire dashboard shows the
recurring job); core domain logic covered by tests.

1. **Auth flow (JWT)** — `POST /api/auth/register` and `POST /api/auth/login` on a new
   `AuthController`, replacing `UsersController.Create` (removed; `GET /api/users` stays for
   listing). `IPasswordHasher` (Domain interface, `BCrypt.Net-Next`-backed implementation in
   Infrastructure) hashes on register and verifies on login; `IJwtTokenGenerator` (same split)
   issues a signed JWT on success. `IUserRepository` gains a `GetByUsernameAsync` lookup — it
   currently only has `GetAllAsync`/`AddAsync`/`SaveChangesAsync`, no single-user lookup exists
   yet. `Program.cs` adds `AddAuthentication().AddJwtBearer(...)` + `UseAuthentication()` (today
   only `UseAuthorization()` runs, with no `[Authorize]` anywhere for it to enforce, and no
   authentication scheme registered for it to check against).
   - **Enforcement**: `[Authorize]` on `RoomsController.Create` and all of
     `ReservationsController`. `RoomsController.GetAll`/`UsersController.GetAll` stay open for
     browsing.
   - **Reservation ownership**: `CreateReservationRequest` drops `UserId` — the Api takes it from
     the authenticated user's token claims instead of trusting a client-supplied value, closing
     the current gap where any caller can create a reservation under any `UserId`.
2. **Expand domain** — add a `Notification` entity + migration.
   - **Dropped from scope**: `BookingHold` (a short-lived, unconfirmed reservation lock) was
     originally planned here too, but doesn't earn its place — the current `Reservation` shape
     (`RoomId`/`UserId`/`StartTime`/`EndTime`, no payment or multi-step checkout) means a direct
     create-and-check-overlap on `POST /api/reservations` already prevents double-booking with no
     intermediate hold state needed. Its only other justification — practicing a Hangfire
     recurring job — is already covered by the reminder-scan job below, so it added a second job
     with no independent product or learning value. Revisit only if a real multi-step booking flow
     (payment, approval, etc.) gets added later.
3. **Booking rules engine** — `IBookingRuleEngine` in Domain (no double-booking/overlap for the
   same room, business-hours window, max-duration check), implemented in Application, invoked
   synchronously on reservation creation.
4. **Hangfire recurring job** in `Booking.Worker/ScheduledJobs/`: scan for upcoming reservations
   and publish `ReservationReminderDue` events through the SNS/SQS pipe from Phase 1, resulting in
   a `Notification` row.
5. **Redis caching** wired into the Api — cache room-availability lookups
   (room + time-range → free/busy), invalidated on reservation create/cancel.
6. **External notification client + WireMock-based integration tests** — a small
   `INotificationSender` HTTP client in Infrastructure (stubbed email/SMS provider), called by
   the Worker when a reminder fires; new `test/Booking.IntegrationTests` project mocks that HTTP
   call with WireMock.
7. **Unit tests** covering the booking rules engine (overlap detection, business-hours
   enforcement) and the new `AuthService` (register/login, mocking `IUserRepository`/
   `IPasswordHasher`/`IJwtTokenGenerator` the same way `RoomService`/`UserService`/
   `ReservationService` are tested today) — this is the "core domain logic covered by tests"
   deliverable.
8. **Global exception handling middleware** — a `GlobalExceptionMiddleware` in `Booking.Api`
   catching unhandled exceptions and returning a consistent error response shape (status code +
   problem-details-style body), instead of relying solely on ad-hoc per-controller `try/catch`
   (currently only `ReservationsController` has one, for the time-range validation). Also needs
   to map auth failures (bad login, missing/expired token) to sensible 401s. Becomes the natural
   hook point for the Splunk logging below.
9. **Splunk logging** — self-hosted `splunk/splunk` container added to `docker-compose.yml`
   (no external account needed). **Revised from a direct Serilog HEC sink to a log-shipping
   sidecar** (see `doc/notes/sidecar-pattern.md`): Api/Worker switch their console sink to
   structured JSON and know nothing about Splunk; Docker's `fluentd` logging driver forwards
   each container's stdout to a `fluent-bit` container, which parses the JSON and ships it to
   Splunk's HEC. One shared Fluent Bit instance handles both services rather than a strict
   one-per-container sidecar — architecturally closer to a node-level agent, an honest
   simplification for local Docker Compose (no real pod-level sidecar semantics there) rather
   than the textbook pattern. Still a real integration, not just a research write-up.
10. **Side research** (not merged into the solution) — short write-ups for Sidecar pattern and
    DynamoDB in `doc/notes/`, each marked "Research only" with an "Applied In This Project"
    section explaining why nothing's wired up yet. (New Relic + PagerDuty move to Phase 3 — see
    below, they're one combined topic, not two separate ones.)
11. **Frontend kickoff** — scaffold `ui/Booking.UI` (Vite + React + TypeScript + Tailwind,
    `package.json` name `booking-ui`), basic pages/layout, API client stub, plus a login page and
    token storage since the Api now requires auth for booking. Real feature pages (room calendar,
    booking form, live availability) land in Phase 4.

**Phase 2 verification**
- Register a user → login → receive a JWT → call `POST /api/reservations` with it → 201, owned
  by the authenticated user (not a client-supplied `UserId`). Same call without a token → 401.
- Hangfire dashboard (Worker) shows the recurring job executing on schedule.
- Create a `Reservation` starting soon → confirm a reminder `Notification` row is created
  end-to-end through the SNS/SQS pipeline.
- `dotnet test` (both Unit and Integration projects) passes, including WireMock-backed tests.
- Trigger an unhandled exception → confirm the middleware returns a consistent error shape and
  the entry shows up in Splunk.
- `npm run dev` in `Booking.UI` serves a basic page.

---

## Phase 3 — Sprint 3: Research only (Sep 1–14, present Sep 15)

**No BookingSystem build work this sprint** — domain-agnostic. Deliverable is summarized research
notes under `doc/notes/`: SpecKit, AI workflow/skills basics, MCP (server/client), plus AWS
reading (ECS, Parameter Store, CloudWatch, EC2, VPC — the ones assigned to this window). Nothing
here touches the running app.

One combined write-up (not two separate ones): **New Relic + PagerDuty as a single detect →
escalate pipeline** — New Relic evaluates alert conditions on metrics/logs (error rate, latency,
service down) and hands off to PagerDuty via its native integration, which owns who gets paged
and how escalation works. Both need a signed-up external SaaS account to genuinely wire in
(unlike Splunk's self-hosted option from Phase 2), so this stays research-only for now.

---

## Phase 4 — Sprint 4: Integration + CI/CD + UI completion (Sep 15–28, present Sep 29)

**Goal (matches tracker milestone):** CI green on push; full demo works end to end.

1. **GitHub Actions CI** — `.github/workflows/ci.yml`: restore/build solution → run
   `Booking.UnitTests` → `docker compose up -d` the infra → run `Booking.IntegrationTests` →
   teardown.
2. **SignalR real-time** — hub in `Booking.Infrastructure/Hubs/` (or Api), wired so reservation
   creation/cancellation pushes live room-availability changes to connected clients, and
   `Notification` creation pushes to the notified user, backed by the Redis-backplane already
   provisioned from Phase 2.
3. **React UI completion** — room calendar/availability view, booking flow (direct create, same
   as the Api's existing `POST /api/reservations` — no hold/checkout state, per the Phase 2
   decision to drop `BookingHold`), live availability updates and notification feed via
   `@microsoft/signalr`, consuming the Api.
4. **Nginx reverse proxy** — only if actually exposing a local endpoint; skip otherwise.
5. Remaining AWS reading (CloudWatch, EC2, VPC, Codeship) — notes only, same as Phase 3.
6. Final backend/frontend polish so the whole stack demos cleanly via `docker compose up`.

**Phase 4 verification**
- Push to a branch → GitHub Actions run is green.
- Full `docker compose up` → open the UI, book a room, see it disappear from another open tab's
  calendar live via SignalR, and see a reminder notification arrive without refreshing.

---

## Final week (Sep 29–Oct 4)

Rehearsal and polish only — no new build scope. Re-verify the Phase 4 demo path end-to-end,
review fundamentals for the company test.

---

## Current status

Phase 1 and Phase 2 complete, merged into `develop`, finished ahead of the Aug 31 target
(2026-08-23). Full task-by-task breakdown — including six real bugs found and fixed via live
verification against the running stack, beyond the original 11-item plan — in
`doc/phase-outputs/phase-2.md`. Two Phase 2 verification-checklist items (reminder → Notification
row end-to-end, exception → visible in Splunk) are flagged there as not yet independently
exercised, though everything each depends on is confirmed working.

Next: Phase 3 (Sprint 3 — research only, no build work) or Phase 4 (Sprint 4 — Integration +
CI/CD + SignalR + real frontend pages), worked on new `feature/*` branches off `develop`.
