using Booking.Domain.Entities;

namespace Booking.Domain.Interfaces;

public interface IReservationRepository
{
    Task<IReadOnlyList<Reservation>> GetAllAsync(CancellationToken ct = default);
    Task<IReadOnlyList<Reservation>> GetByRoomIdAsync(Guid roomId, CancellationToken ct = default);
    Task<IReadOnlyList<Reservation>> GetUpcomingAsync(DateTime from, DateTime to, CancellationToken ct = default);
    Task AddAsync(Reservation reservation, CancellationToken ct = default);
    Task SaveChangesAsync(CancellationToken ct = default);
}
