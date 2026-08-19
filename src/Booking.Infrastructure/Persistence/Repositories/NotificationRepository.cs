using Booking.Domain.Entities;
using Booking.Domain.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace Booking.Infrastructure.Persistence.Repositories;

public class NotificationRepository(BookingDbContext db) : INotificationRepository
{
    public async Task<bool> ExistsForReservationAsync(Guid reservationId, NotificationType type, CancellationToken ct = default)
        => await db.Notifications.AsNoTracking()
            .AnyAsync(n => n.ReservationId == reservationId && n.Type == type, ct);

    public async Task AddAsync(Notification notification, CancellationToken ct = default)
        => await db.Notifications.AddAsync(notification, ct);

    public Task SaveChangesAsync(CancellationToken ct = default)
        => db.SaveChangesAsync(ct);
}
