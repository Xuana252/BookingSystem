using Booking.Domain.Entities;

namespace Booking.Domain.Interfaces;

public interface INotificationRepository
{
    Task<bool> ExistsForReservationAsync(Guid reservationId, NotificationType type, CancellationToken ct = default);
    Task AddAsync(Notification notification, CancellationToken ct = default);
    Task SaveChangesAsync(CancellationToken ct = default);
}
