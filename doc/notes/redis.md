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
  implementing `IReservationRepository` around the EF-backed `ReservationRepository`. Caches
  `GetByRoomIdAsync` (the per-room availability lookup the booking rule engine's overlap check
  depends on) with a 5-minute TTL; `GetAllAsync`/`GetUpcomingAsync` pass straight through to the
  inner repository, uncached.
- **Invalidation:** `AddAsync` records the affected `RoomId` in a pending list rather than
  invalidating immediately; `SaveChangesAsync` deletes that room's cache key right after the real
  EF Core save succeeds — so a reservation that was just created is never served stale from
  cache, and nothing is invalidated if the save itself fails.
- `Booking.Infrastructure/DependencyInjection.cs` — `IConnectionMultiplexer` registered as a
  singleton from `RedisSettings.ConnectionString` (`Booking.Domain/Configuration/RedisSettings.cs`,
  default `localhost:6379`); the decorator is wired as
  `IReservationRepository -> CachedReservationRepository(ReservationRepository, IConnectionMultiplexer)`.
- `test/Booking.UnitTests/Persistence/CachedReservationRepositoryTests.cs` — 5 tests against a
  `Moq`'d `IConnectionMultiplexer`/`IDatabase`: cache miss queries the inner repository and
  populates the cache; cache hit skips the inner repository entirely; `SaveChangesAsync` after an
  `AddAsync` invalidates that room's key; `SaveChangesAsync` with nothing pending touches the
  cache at all; `GetUpcomingAsync` always bypasses the cache.
- `src/docker-compose.yml` — `redis` service (`local-redis`); `Redis__ConnectionString=redis:6379`
  wired into both `api` and `worker`.
- Verified live: the running stack talked to real Redis (`local-redis`, healthy) throughout Phase
  2's live checks.

## Open Questions / Next Steps

- Cache key granularity is per-room only (`room-availability:{roomId}`), not per time-range — a
  new reservation for a room invalidates that room's whole cached availability list rather than
  something more surgical. Fine at this project's scale; would need revisiting under real load.
