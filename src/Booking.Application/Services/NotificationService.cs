using Booking.Application.Interfaces;
using Booking.Domain.Entities;
using Booking.Domain.Interfaces;

namespace Booking.Application.Services;

public class NotificationService(INotificationRepository notifications) : INotificationService
{
    public Task<IReadOnlyList<Notification>> GetForUserAsync(Guid userId, CancellationToken ct = default)
        => notifications.GetForUserAsync(userId, ct);
}
