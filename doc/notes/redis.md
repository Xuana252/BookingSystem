# Redis

**Status:** Applied in project
**OJT tracker category:** Caching

## Summary

Redis is an in-memory key-value data store; here it's used as a read-through cache in front of
an EF Core/Postgres query, accessed via the `StackExchange.Redis` client.

## Key Concepts

- **Read-through cache pattern** — check the cache first; on a miss, fetch from the real
  (slower) source, then populate the cache before returning, so the next read is fast.
- **TTL (time-to-live)** — a cache entry expires automatically after a fixed duration even if
  nothing ever explicitly invalidates it. A cheap safety net against permanently stale data if
  invalidation logic has a bug, but not a substitute for real invalidation when staleness during
  the TTL window would actually be wrong.
- **Explicit invalidation** — deleting a cache key immediately after the underlying data changes,
  so reads are correct right away instead of waiting out the TTL.
- **`IConnectionMultiplexer`** — the StackExchange.Redis client's core connection object; it's
  long-lived and thread-safe, so it's registered once as a singleton and reused, not created
  per-call or per-request.
- **Values are just strings/bytes** from Redis's perspective — structured data needs explicit
  serialization going in (e.g. `JsonSerializer.Serialize`) and deserialization coming out.

## Reference / Cheatsheet

```csharp
services.AddSingleton<IConnectionMultiplexer>(_ => ConnectionMultiplexer.Connect(connectionString));

var db = redis.GetDatabase();
await db.StringSetAsync(key, JsonSerializer.Serialize(value), TimeSpan.FromMinutes(5));
var cached = await db.StringGetAsync(key);   // RedisValue.Null if missing
await db.KeyDeleteAsync(key);                // explicit invalidation
```

## Applied In This Project

- `Booking.Infrastructure/Persistence/Repositories/CachedReservationRepository.cs` — a decorator
  implementing `IReservationRepository` around the EF-backed `ReservationRepository`. Caches two
  things, both with a 5-minute TTL:
  - `GetAllAsync` under a single `reservations:all` key — the real hot path, since every client
    re-fetches the full list on page load *and* on every SignalR `RoomAvailabilityChanged`
    broadcast, so one booking used to make every connected client re-query Postgres for the same
    unchanged data.
  - `GetByRoomIdAsync` under `room-availability:{roomId}` — the per-room lookup the booking rule
    engine's overlap check depends on. `GetUpcomingAsync` still passes straight through, uncached.
  - Originally only `GetByRoomIdAsync` was cached, but its only caller (`ReservationService.
    CreateAsync`) populates it and invalidates it again in the very same request — a real bug
    that meant it never actually served a cache hit in practice. Caching `GetAllAsync` instead
    was the actual fix for real-world traffic; that self-invalidation bug on `GetByRoomIdAsync`
    itself is still there, just no longer the interesting cache in this file.
- **Invalidation:** `AddAsync` records the affected `RoomId` in a pending list rather than
  invalidating immediately; `SaveChangesAsync` deletes that room's key *and* `reservations:all`
  right after the real EF Core save succeeds — so a reservation that was just created is never
  served stale from cache, and nothing is invalidated if the save itself fails.
- `Booking.Infrastructure/DependencyInjection.cs` — `IConnectionMultiplexer` registered as a
  singleton from `RedisSettings.ConnectionString` (`Booking.Domain/Configuration/RedisSettings.cs`,
  default `localhost:6379`); the decorator is wired as
  `IReservationRepository -> CachedReservationRepository(ReservationRepository, IConnectionMultiplexer)`.
- `test/Booking.UnitTests/Persistence/CachedReservationRepositoryTests.cs` — 11 tests against a
  `Moq`'d `IConnectionMultiplexer`/`IDatabase`, covering both cached queries (miss populates +
  queries inner, hit skips inner entirely), both invalidation paths (`SaveChangesAsync` after an
  `AddAsync` invalidates the room key and the full-list key; after a tracked `GetByIdAsync` too,
  for cancellation), `SaveChangesAsync` with nothing pending touching neither, and
  `GetUpcomingAsync` always bypassing the cache.
- `src/docker-compose.yml` — `redis` service (`local-redis`); `Redis__ConnectionString=redis:6379`
  wired into both `api` and `worker`. Also named its volume (`redis_data:/data`) — the
  `redis:7.2-alpine` image declares `/data` as a `VOLUME` internally, so without an explicit
  mapping every container recreation orphaned a fresh anonymous volume (confirmed via
  `docker image inspect redis:7.2-alpine --format '{{json .Config.Volumes}}'`). Named purely to
  stop that leak — nothing here is worth keeping across a restart (5-minute TTL, self-heals on a
  miss), unlike Splunk's equivalent fix.
- Verified live: the running stack talked to real Redis (`local-redis`, healthy) throughout Phase
  2's live checks, and again this session — `DBSIZE`/`KEYS`/`TTL`/`GET` against `local-redis`
  confirmed `reservations:all` populating on a miss, surviving an identical repeat read, dying the
  instant a reservation is created, and repopulating on the next read.

## Related Notes

- [[postgresql_fundamentals]] — the real data source this cache sits in front of.
- [[docker]] — `redis` service wiring, including the named-volume fix that stopped anonymous
  volumes from leaking on every container recreation.

## Open Questions / Next Steps

- Cache key granularity for `room-availability:{roomId}` is per-room only, not per time-range — a
  new reservation for a room invalidates that room's whole cached list rather than something more
  surgical. Fine at this project's scale; would need revisiting under real load.
- `GetByRoomIdAsync`'s self-invalidation bug (noted above) is still there — the only caller
  populates the key and immediately invalidates it again in the same request, so it never
  actually serves a hit today. Left alone deliberately: it's not the hot path anymore now that
  `GetAllAsync` is cached, and fixing it wasn't worth the churn for a key nothing currently
  benefits from.
