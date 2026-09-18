using Booking.Domain.Entities;
using Booking.Domain.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace Booking.Infrastructure.Persistence.Repositories;

public class AuditLogRepository(BookingDbContext dbContext) : IAuditLogRepository
{
    public async Task<IReadOnlyList<AuditLog>> GetAllAsync(CancellationToken ct = default)
    {
        return await dbContext.AuditLogs
            .OrderByDescending(a => a.Timestamp)
            .Take(100) // Just a simple cap for the prototype
            .ToListAsync(ct);
    }
}
