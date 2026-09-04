using Booking.Domain.Entities;

namespace Booking.Domain.Interfaces;

public interface INotificationRepository
{
    /// <summary>Per-recipient, not just per-reservation — a reservation can now notify its host
    /// and every attendee independently, so "has *this user* already been notified" is the
    /// question that actually matters, not "has anyone".</summary>
    Task<bool> ExistsForReservationAsync(Guid reservationId, Guid userId, NotificationType type, CancellationToken ct = default);

    /// <summary>A user's own notifications, most recent first.</summary>
    Task<IReadOnlyList<Notification>> GetForUserAsync(Guid userId, CancellationToken ct = default);

    Task AddAsync(Notification notification, CancellationToken ct = default);
    Task SaveChangesAsync(CancellationToken ct = default);
}
