using Booking.Domain.Entities;
using Booking.Domain.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace Booking.Infrastructure.Persistence.Repositories;

public class ReservationAttendeeRepository(BookingDbContext db) : IReservationAttendeeRepository
{
    public async Task<IReadOnlyList<Guid>> GetAttendeeUserIdsAsync(Guid reservationId, CancellationToken ct = default)
        => await db.ReservationAttendees.AsNoTracking()
            .Where(a => a.ReservationId == reservationId)
            .Select(a => a.UserId)
            .ToListAsync(ct);

    public async Task<IReadOnlyList<ReservationAttendee>> GetForReservationsAsync(IEnumerable<Guid> reservationIds, CancellationToken ct = default)
        => await db.ReservationAttendees.AsNoTracking()
            .Where(a => reservationIds.Contains(a.ReservationId))
            .ToListAsync(ct);

    public async Task AddRangeAsync(Guid reservationId, IEnumerable<Guid> userIds, CancellationToken ct = default)
        => await db.ReservationAttendees.AddRangeAsync(
            userIds.Select(userId => new ReservationAttendee { ReservationId = reservationId, UserId = userId }), ct);

    public Task SaveChangesAsync(CancellationToken ct = default)
        => db.SaveChangesAsync(ct);
}
