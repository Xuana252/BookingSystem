namespace Booking.Domain.Entities;

public enum ReservationStatus
{
    Confirmed,
    Cancelled
}

/// <summary>
/// A confirmed time-slot reservation for a <see cref="Room"/>.
/// </summary>
public class Reservation
{
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>
    /// FK -> Room.Id
    /// </summary>
    public Guid RoomId { get; set; }

    /// <summary>
    /// FK -> User.Id
    /// </summary>
    public Guid UserId { get; set; }

    public DateTime StartTime { get; set; }
    public DateTime EndTime { get; set; }
    public ReservationStatus Status { get; set; } = ReservationStatus.Confirmed;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
