using Booking.Domain.Entities;
using Booking.Domain.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace Booking.Infrastructure.Persistence.Repositories;

public class NotificationRepository(BookingDbContext db) : INotificationRepository
{
    public async Task<bool> ExistsForReservationAsync(Guid reservationId, Guid userId, NotificationType type, CancellationToken ct = default)
        => await db.Notifications.AsNoTracking()
            .AnyAsync(n => n.ReservationId == reservationId && n.UserId == userId && n.Type == type, ct);

    public async Task<IReadOnlyList<Notification>> GetForUserAsync(Guid userId, CancellationToken ct = default)
        => await db.Notifications.AsNoTracking()
            .Where(n => n.UserId == userId)
            .OrderByDescending(n => n.CreatedAt)
            .ToListAsync(ct);

    public async Task<bool> MarkAsReadAsync(Guid notificationId, Guid userId, CancellationToken ct = default)
    {
        var rows = await db.Notifications
            .Where(n => n.Id == notificationId && n.UserId == userId)
            .ExecuteUpdateAsync(s => s
                .SetProperty(n => n.IsRead, true)
                .SetProperty(n => n.ReadAt, DateTime.UtcNow), ct);
        return rows > 0;
    }

    public async Task MarkAllAsReadAsync(Guid userId, CancellationToken ct = default)
    {
        await db.Notifications
            .Where(n => n.UserId == userId && !n.IsRead)
            .ExecuteUpdateAsync(s => s
                .SetProperty(n => n.IsRead, true)
                .SetProperty(n => n.ReadAt, DateTime.UtcNow), ct);
    }

    public async Task AddAsync(Notification notification, CancellationToken ct = default)
        => await db.Notifications.AddAsync(notification, ct);

    public Task SaveChangesAsync(CancellationToken ct = default)
        => db.SaveChangesAsync(ct);
}
