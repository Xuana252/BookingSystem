namespace Booking.Domain.Entities;

public enum NotificationType
{
    ReservationReminder
}

/// <summary>
/// A notification for a <see cref="User"/> about a <see cref="Reservation"/>.
/// </summary>
public class Notification
{
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>
    /// FK -> User.Id
    /// </summary>
    public Guid UserId { get; set; }

    /// <summary>
    /// FK -> Reservation.Id
    /// </summary>
    public Guid ReservationId { get; set; }

    public NotificationType Type { get; set; }
    public string Message { get; set; } = string.Empty;
    public DateTime? SentAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
