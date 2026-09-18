using Booking.Application.DTOs;
using Booking.Application.Interfaces;
using Booking.Domain.Interfaces;

namespace Booking.Application.Services;

public class AuditLogService(IAuditLogRepository auditLogRepo) : IAuditLogService
{
    public async Task<IReadOnlyList<AuditLogDto>> GetAllAsync(CancellationToken ct = default)
    {
        var logs = await auditLogRepo.GetAllAsync(ct);
        return logs.Select(l => new AuditLogDto(
            l.Id,
            l.Timestamp,
            l.UserId,
            l.ActionType,
            l.EntityName,
            l.EntityId,
            l.Details
        )).ToList();
    }
}
