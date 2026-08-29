using System.Text.Json;
using Booking.Domain.Entities;
using Booking.Domain.Interfaces;
using StackExchange.Redis;

namespace Booking.Infrastructure.Persistence.Repositories;

/// <summary>
/// Caches GetByRoomIdAsync (the per-room availability lookup the booking rule engine's overlap
/// check depends on) in Redis, invalidated on the next successful SaveChangesAsync after an
/// AddAsync for that room. Other queries pass straight through to the EF-backed repository.
/// </summary>
public class CachedReservationRepository(
    IReservationRepository inner,
    IConnectionMultiplexer redis) : IReservationRepository
{
    private static readonly TimeSpan CacheTtl = TimeSpan.FromMinutes(5);

    private readonly List<Guid> _pendingInvalidations = [];

    public Task<IReadOnlyList<Reservation>> GetAllAsync(CancellationToken ct = default)
        => inner.GetAllAsync(ct);

    public async Task<IReadOnlyList<Reservation>> GetByRoomIdAsync(Guid roomId, CancellationToken ct = default)
    {
        var db = redis.GetDatabase();
        var key = CacheKey(roomId);

        var cached = await db.StringGetAsync(key);
        if (cached.HasValue)
        {
            return JsonSerializer.Deserialize<List<Reservation>>((string)cached!) ?? [];
        }

        var reservations = await inner.GetByRoomIdAsync(roomId, ct);
        await db.StringSetAsync(key, JsonSerializer.Serialize(reservations), CacheTtl);
        return reservations;
    }

    public Task<IReadOnlyList<Reservation>> GetUpcomingAsync(DateTime from, DateTime to, CancellationToken ct = default)
        => inner.GetUpcomingAsync(from, to, ct);

    public async Task AddAsync(Reservation reservation, CancellationToken ct = default)
    {
        await inner.AddAsync(reservation, ct);
        _pendingInvalidations.Add(reservation.RoomId);
    }

    public async Task SaveChangesAsync(CancellationToken ct = default)
    {
        await inner.SaveChangesAsync(ct);

        if (_pendingInvalidations.Count == 0)
        {
            return;
        }

        var db = redis.GetDatabase();
        foreach (var roomId in _pendingInvalidations.Distinct())
        {
            await db.KeyDeleteAsync(CacheKey(roomId));
        }
        _pendingInvalidations.Clear();
    }

    private static string CacheKey(Guid roomId) => $"room-availability:{roomId}";
}
