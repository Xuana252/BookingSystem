using Booking.Domain.Entities;

namespace Booking.Application.Interfaces;

public interface INotificationService
{
    /// <summary>A user's own notifications, most recent first.</summary>
    Task<IReadOnlyList<Notification>> GetForUserAsync(Guid userId, CancellationToken ct = default);
}
