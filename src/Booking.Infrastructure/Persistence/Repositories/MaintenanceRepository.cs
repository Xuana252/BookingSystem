using Booking.Domain.Entities;
using Booking.Domain.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace Booking.Infrastructure.Persistence.Repositories;

public class MaintenanceRepository(BookingDbContext dbContext) : IMaintenanceRepository
{
    public async Task<MaintenanceIssue?> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        return await dbContext.MaintenanceIssues.FirstOrDefaultAsync(m => m.Id == id, ct);
    }

    public async Task<IReadOnlyList<MaintenanceIssue>> GetAllAsync(CancellationToken ct = default)
    {
        return await dbContext.MaintenanceIssues
            .OrderByDescending(m => m.CreatedAt)
            .ToListAsync(ct);
    }

    public async Task<IReadOnlyList<MaintenanceIssue>> GetByRoomIdAsync(Guid roomId, CancellationToken ct = default)
    {
        return await dbContext.MaintenanceIssues
            .Where(m => m.RoomId == roomId)
            .OrderByDescending(m => m.CreatedAt)
            .ToListAsync(ct);
    }

    public async Task AddAsync(MaintenanceIssue issue, CancellationToken ct = default)
    {
        dbContext.MaintenanceIssues.Add(issue);
        await dbContext.SaveChangesAsync(ct);
    }

    public async Task UpdateAsync(MaintenanceIssue issue, CancellationToken ct = default)
    {
        dbContext.MaintenanceIssues.Update(issue);
        await dbContext.SaveChangesAsync(ct);
    }
}
