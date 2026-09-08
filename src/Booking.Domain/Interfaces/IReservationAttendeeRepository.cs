using Booking.Domain.Entities;

namespace Booking.Domain.Interfaces;

public interface IReservationAttendeeRepository
{
    Task<IReadOnlyList<Guid>> GetAttendeeUserIdsAsync(Guid reservationId, CancellationToken ct = default);

    /// <summary>Bulk lookup across multiple reservations at once — what GetAllAsync's list view
    /// uses, so embedding attendees in every row doesn't cost one query per reservation.</summary>
    Task<IReadOnlyList<ReservationAttendee>> GetForReservationsAsync(IEnumerable<Guid> reservationIds, CancellationToken ct = default);

    Task AddRangeAsync(Guid reservationId, IEnumerable<Guid> userIds, CancellationToken ct = default);
    Task SaveChangesAsync(CancellationToken ct = default);
}
