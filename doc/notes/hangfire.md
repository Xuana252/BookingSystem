# Hangfire

**Status:** Applied in project
**OJT tracker category:** Backend / Background Jobs

## Summary

Hangfire is a background-job library for .NET — schedules and executes fire-and-forget, delayed,
and recurring work outside the request/response cycle, persisting job state to a real storage
backend so jobs survive process restarts, plus a web dashboard for observing them.

## Key Concepts

- **Four job types**: fire-and-forget (run once, ASAP), delayed (run once, later), recurring
  (run on a cron schedule), continuation (run after another job completes). This project only
  uses recurring.
- **Storage-backed, not in-memory** — job definitions, state, and history persist to a real
  backing store (SQL Server, Postgres, Redis, etc.). A missed run because the process was down
  gets picked up on restart instead of silently vanishing.
- **Client vs. Server** — `AddHangfire(...)` registers the client (able to enqueue/schedule
  jobs); `AddHangfireServer()` starts the background worker process that actually dequeues and
  executes them. Both are typically needed in the same process for a single-service setup.
- **Recurring jobs use standard cron expressions**, registered via `IRecurringJobManager
  .AddOrUpdate(jobId, expression, cron)` — calling it again with the same `jobId` updates the
  existing job rather than duplicating it, so it's safe to call on every app startup.
- **Dashboard** (`UseHangfireDashboard()`) — a web UI showing job history, current state, and
  next scheduled execution. With no options, it defaults to a *local-requests-only*
  authorization filter — real auth has to be added explicitly for anything beyond local dev.

## Reference / Cheatsheet

```csharp
builder.Services.AddHangfire(config => config
    .UsePostgreSqlStorage(options => options.UseNpgsqlConnection(connectionString)));
builder.Services.AddHangfireServer();

// after app.Build():
app.Services.GetRequiredService<IRecurringJobManager>().AddOrUpdate<IMyService>(
    "job-id",
    svc => svc.DoWorkAsync(CancellationToken.None),
    "*/1 * * * *"); // cron: every 1 minute

app.UseHangfireDashboard("/hangfire");
```

Common cron shapes: `*/1 * * * *` (every minute), `0 * * * *` (top of every hour),
`0 0 * * *` (daily at midnight).

## Applied In This Project

- `Booking.Worker/Program.cs` — `AddHangfire` configured with `UsePostgreSqlStorage` against the
  same `DefaultConnection` Postgres database EF Core uses; `AddHangfireServer()`; a recurring
  job named `reservation-reminder-scan` registered against
  `IReservationReminderService.ScanAndPublishDueRemindersAsync`, on a cron pulled from
  `ReservationReminderSettings.CronExpression` (config-driven, not hardcoded).
- `Booking.Worker.csproj` switched its SDK from `Microsoft.NET.Sdk.Worker` to
  `Microsoft.NET.Sdk.Web` specifically so the process could host the dashboard's HTTP endpoint.
- `app.UseHangfireDashboard("/hangfire", new DashboardOptions { Authorization = [] })` — the
  default local-requests-only filter rejected the dashboard when reached through
  docker-compose's published port (the browser arrives via the Docker bridge network, not
  `127.0.0.1`, so it doesn't look "local" from the container's side). Explicitly commented in
  the code as unsafe anywhere but a dev box — no real `IDashboardAuthorizationFilter` yet.
- `src/Directory.Packages.props` — `Newtonsoft.Json` pinned directly to `13.0.3`, overriding the
  vulnerable `11.0.1` that `Hangfire.Core` transitively brings in (GHSA-5crp-9r3c-p9vr); a direct
  `PackageReference` in `Booking.Worker.csproj` is required for that pin to actually win over the
  transitive version.
- Verified live: `GET http://localhost:8081/hangfire/recurring` showed `reservation-reminder-scan`
  actually executing on schedule against real data, confirmed against Worker's own logs.

## Open Questions / Next Steps

- The dashboard has no real authentication (`Authorization = []`). The fix would be a custom
  `IDashboardAuthorizationFilter` doing HTTP Basic Auth against credentials from config/env
  (same pattern as `Gmail__Username`/`Gmail__AppPassword`), since Worker has no existing auth
  pipeline to reuse (no JWT middleware, no `[Authorize]`). **Deliberately not implemented** —
  this is a mock/OJT project, the dashboard is never reachable outside local dev, and the
  workaround exists specifically to satisfy that context. Revisit if this ever ran anywhere real.
