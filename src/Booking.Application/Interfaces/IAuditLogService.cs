using Booking.Application.DTOs;

namespace Booking.Application.Interfaces;

public interface IAuditLogService
{
    Task<IReadOnlyList<AuditLogDto>> GetAllAsync(CancellationToken ct = default);
}
