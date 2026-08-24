using Booking.Domain.Entities;

namespace Booking.Domain.Interfaces;

public interface IRoomRepository
{
    Task<IReadOnlyList<Room>> GetAllAsync(CancellationToken ct = default);
    Task<Room?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task AddAsync(Room room, CancellationToken ct = default);
    Task SaveChangesAsync(CancellationToken ct = default);
}
