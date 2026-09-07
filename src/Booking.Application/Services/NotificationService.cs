using Booking.Application.Interfaces;
using Booking.Domain.Entities;
using Booking.Domain.Interfaces;

namespace Booking.Application.Services;

public class NotificationService(INotificationRepository notifications) : INotificationService
{
    public Task<IReadOnlyList<Notification>> GetForUserAsync(Guid userId, CancellationToken ct = default)
        => notifications.GetForUserAsync(userId, ct);

    public Task<bool> MarkAsReadAsync(Guid notificationId, Guid userId, CancellationToken ct = default)
        => notifications.MarkAsReadAsync(notificationId, userId, ct);

    public Task MarkAllAsReadAsync(Guid userId, CancellationToken ct = default)
        => notifications.MarkAllAsReadAsync(userId, ct);
}
