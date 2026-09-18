using Booking.Domain.Entities;

namespace Booking.Domain.Interfaces;

public interface IAuditLogRepository
{
    Task<IReadOnlyList<AuditLog>> GetAllAsync(CancellationToken ct = default);
}
