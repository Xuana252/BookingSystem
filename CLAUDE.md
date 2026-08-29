# CLAUDE.md

Guidance for Claude Code (or any contributor) working in this repo. This is an OJT learning
project — read `README.md` first for the product pitch and quick-start; this file is about how
the codebase is organized and the non-obvious decisions behind it.

## What this is

A room/facility booking system (`BookingSystem`, namespace root `Booking.*`), built as a vehicle
to learn: .NET 10, EF Core/Postgres, Redis, Hangfire, event-driven messaging (SNS/SQS via Moto),
SignalR, React, xUnit/WireMock, Git Flow, and CI/CD — driven by a real OJT sprint schedule (see
`doc/phase-outputs/` for what's been built phase by phase).

**Frontend note:** `ui/Booking.UI` is plain React (Vite + TypeScript + Tailwind), not Next.js —
no SSR, file-based routing, or API routes. The Api is the only backend.

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
  migrations, repositories), SNS/SQS clients (`SnsEventPublisher`).
- **`Booking.Api`** / **`Booking.Worker`** — composition roots. Thin controllers / background
  jobs that call Application services; `Program.cs` wires up DI via each layer's own
  `AddBookingXxx()` extension method.

## Naming: `Reservation`, never `Booking`

The core entity, events, and rules are named `Reservation` (`Reservation`,
`ReservationCreated`/`ReservationCancelled`/`ReservationReminderDue`), **not** `Booking` — a class
literally named `Booking` inside the `Booking.*` namespace tree causes a real C# compiler error
(`CS0118: 'Booking' is a namespace but is used like a type`) anywhere it's referenced from code
that is itself in a `Booking.X` namespace. Confirmed with a throwaway repro before this was ever
built — don't reintroduce a `Booking` class/type anywhere in this solution.

## Coding conventions

Mechanical style (indentation, brace placement, `I`-prefix on interfaces, etc.) is enforced by
`.editorconfig` — this section only covers conventions that aren't (or can't be) linted:

- **DTOs are records** — every request/response DTO in `Booking.Application/DTOs/` is a
  `public record`, not a class (e.g. `CreateRoomRequest`). Immutable by default, matches their
  actual usage (bind once from the request body, never mutated).
- **DI via primary constructors** — services and repositories take their dependencies as C#
  primary-constructor parameters (`public class RoomService(IRoomRepository rooms) : IRoomService`),
  not a traditional constructor body with field assignments. Keep new services/repositories
  consistent with this.
- **Async methods take a trailing `CancellationToken ct = default`** — every repository and
  service method follows this signature shape; don't drop the parameter or reorder it.
- **File-scoped namespaces** (`namespace Booking.Domain.Entities;`) everywhere, never the
  block-brace style.
- **Minimal comments** — default to none. Only add a comment when it explains a non-obvious
  *why* (a workaround, a subtle invariant, a gotcha) — not what the code already says through
  naming. Most files in this repo have zero comments; that's intentional, not an oversight.
- **Tests**: xUnit `[Fact]`/`[Theory]` + FluentAssertions (`.Should()...`), never raw
  `Assert.Equal`. Every test body is explicitly split into `// Arrange` / `// Act` / `// Assert`
  comment blocks, even when a section is one line. Mocks (`Moq`) are named after the concept they
  stand in for (`_rooms`, `_eventPublisher`), not prefixed `_mock...`. Test classes expose a
  `CreateSut()` helper rather than constructing the system-under-test inline in every test.

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
dotnet run --project Booking.Worker   # http://localhost:5134/hangfire — SQS consumer + Hangfire reminder job
```

```powershell
dotnet build   # from src/ — should be 0 errors, 0 NuGet vulnerability warnings
dotnet test    # from src/
```

Demo flow: create a Room → create a User → create a Reservation via `/scalar/v1` → watch the
Worker's terminal log the `ReservationCreated` event arrive via SNS → SQS moments later.

## Git workflow

Git Flow: `main` (stable) + `develop` (integration) + short-lived `feature/*` branches merged
into `develop` with `--no-ff`. At each sprint milestone, cut a `release/*` branch off `develop`
(e.g. `release/phase-1`), PR that into `main`, then merge it back into `develop` too so any
release-branch fixes aren't lost. No `hotfix/*` branches or tags yet — not needed at this
project's scale.

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

`doc/plan.md` — the sprint-by-sprint build plan (mapped to the OJT tracker's dates/milestones),
key architectural decisions, and current status. Update its "Current status" section as phases
complete. `doc/phase-outputs/` has the detailed task-by-task record of what was actually built.
