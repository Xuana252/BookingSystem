# CLAUDE.md

Guidance for Claude Code (or any contributor) working in this repo. This is an OJT learning
project — read `README.md` first for the product pitch and quick-start; this file is about how
the codebase is organized and the non-obvious decisions behind it.

## What this is

A room/facility booking system (`BookingSystem`, namespace root `Booking.*`), built as a vehicle
to learn: .NET 10, EF Core/Postgres, Redis, Hangfire, event-driven messaging (SNS/SQS via Moto),
SignalR, Next.js, xUnit/WireMock, Git Flow, and CI/CD — driven by a real OJT sprint schedule (see
`doc/phase-outputs/` for what's been built phase by phase).

It was scaffolded from scratch using an older reference project
(`InventoryManagementSystem`/`InventoryAlert`, a stock-alert app) purely as an *architectural*
reference — no code was copied, only patterns.

## Architecture

Strictly layered, dependencies point one direction only:

```
Booking.Domain  →  Booking.Application  →  Booking.Infrastructure  →  Booking.Api / Booking.Worker
```

- **`Booking.Domain`** — entities, repository/publisher interfaces (`IRoomRepository`,
  `IEventPublisher`, ...), events, config types. No external dependencies (no EF Core, no AWS
  SDK) — if a file here needs a NuGet package beyond the BCL, it's in the wrong project.
- **`Booking.Application`** — use-case services (`RoomService`, `UserService`,
  `ReservationService`) holding validation + orchestration logic, plus request/response DTOs.
  Depends only on `Booking.Domain`. **Controllers should not contain business logic** — if a
  controller action does more than bind a DTO and call a service, that logic belongs here.
- **`Booking.Infrastructure`** — implements Domain's interfaces: EF Core (`BookingDbContext`,
  migrations, repositories), SNS/SQS clients (`SnsEventPublisher`). This is deliberately not the
  reference project's own convention (which puts services directly in `Api/Services`) — this repo
  has a real Application layer instead.
- **`Booking.Api`** / **`Booking.Worker`** — composition roots. Thin controllers / background
  jobs that call Application services; `Program.cs` wires up DI via each layer's own
  `AddBookingXxx()` extension method.

## Naming: `Reservation`, never `Booking`

The core entity, events, and rules are named `Reservation` (`Reservation`, `ReservationHold`,
`ReservationCreated`/`ReservationCancelled`/`ReservationReminderDue`), **not** `Booking` — a class
literally named `Booking` inside the `Booking.*` namespace tree causes a real C# compiler error
(`CS0118: 'Booking' is a namespace but is used like a type`) anywhere it's referenced from code
that is itself in a `Booking.X` namespace. Confirmed with a throwaway repro before this was ever
built — don't reintroduce a `Booking` class/type anywhere in this solution.

## Package pins (don't casually bump these)

`src/Directory.Packages.props` uses central package management. A few versions are pinned below
what `dotnet add package` would pick, deliberately:

- **`FluentAssertions` → `7.2.2`** — 8.0+ requires a paid commercial license. Do not upgrade
  without that being an explicit, informed decision (this is a company OJT project).
- **`Microsoft.OpenApi` → `2.11.0`** — the ASP.NET Core Web API template's default `2.0.0` has a
  known high-severity DoS vulnerability
  ([GHSA-v5pm-xwqc-g5wc](https://github.com/advisories/GHSA-v5pm-xwqc-g5wc)). Stay on the 2.x
  line — 3.x has breaking API changes incompatible with `Microsoft.AspNetCore.OpenApi`'s source
  generator (confirmed: `IOpenApiMediaType.Example` becomes read-only, fails to build).
- **`Microsoft.EntityFrameworkCore.Relational` → pinned explicitly to match the other EF Core
  packages** — `Npgsql.EntityFrameworkCore.PostgreSQL` otherwise pulls an older transitive
  version, causing an `MSB3277` assembly version conflict.

## Known gotcha: something in this environment silently "cleans up" `ProjectReference`s

Twice during development, an external formatter/linter edited a `.csproj` between tool calls and
removed a `ProjectReference` it judged "redundant" (e.g. `Booking.Api → Booking.Application`,
`Booking.Infrastructure → Booking.Domain`) — but the removal broke the build both times, because
the reference was load-bearing (types used directly in that project, not just transitively
visible). **If a `.csproj` shows an unexpected diff you didn't make, run `dotnet build` before
committing it** — don't assume an automated edit is safe.

## Local dev

```powershell
cd src
docker compose up -d              # Postgres, Redis, Moto (+ moto-init provisions SNS/SQS/DLQ)
dotnet run --project Booking.Api      # http://localhost:5133 — /health, /scalar/v1
dotnet run --project Booking.Worker   # long-polls SQS, logs consumed events
```

```powershell
dotnet build   # from src/ — should be 0 errors, 0 NuGet vulnerability warnings
dotnet test    # from src/
```

Demo flow: create a Room → create a User → create a Reservation via `/scalar/v1` → watch the
Worker's terminal log the `ReservationCreated` event arrive via SNS → SQS moments later.

## Git workflow

Lightweight Git Flow: `main` (stable) + `develop` (integration) + short-lived `feature/*`
branches merged into `develop` with `--no-ff`. No `release/*`/`hotfix/*` or tags yet — not needed
at this project's scale. Merge to `main` at sprint milestones (see PRs).

## Documentation conventions

- **`doc/notes/`** — one file per OJT tracker topic, following `doc/notes/_TEMPLATE.md`: summary,
  key concepts, cheatsheet, and an **"Applied In This Project"** section mapping the concept to
  real files — or explicitly marked "Research only" with why. When a note's topic gets touched by
  new code, update its "Applied In This Project" section rather than leaving it stale.
- **`doc/phase-outputs/`** — one file per sprint phase (`phase-1.md`, `phase-2.md`, ...), broken
  into task-by-task **What / Output / Verification** entries. Add to this at the end of each
  phase — it's the source material for the OJT tracker's "Output/Deliverable" column, so keep it
  concrete (file paths, verification commands/results) rather than a vague narrative.

## Where the phased plan lives

The sprint-by-sprint build plan (mapped to the user's OJT tracker dates/milestones) isn't checked
into this repo — it was maintained as a Claude Code plan-mode document during development. If it's
not available in a future session, `doc/phase-outputs/` + the git history are the source of truth
for what's been built and why.
