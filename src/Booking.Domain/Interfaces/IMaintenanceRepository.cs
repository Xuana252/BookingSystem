using Booking.Domain.Entities;

namespace Booking.Domain.Interfaces;

public interface IMaintenanceRepository
{
    Task<MaintenanceIssue?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<IReadOnlyList<MaintenanceIssue>> GetAllAsync(CancellationToken ct = default);
    Task<IReadOnlyList<MaintenanceIssue>> GetByRoomIdAsync(Guid roomId, CancellationToken ct = default);
    Task AddAsync(MaintenanceIssue issue, CancellationToken ct = default);
    Task UpdateAsync(MaintenanceIssue issue, CancellationToken ct = default);
}
