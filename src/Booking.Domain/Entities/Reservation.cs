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

    /// <summary>
    /// ID of the Hangfire background job scheduled to send a reminder for this reservation.
    /// </summary>
    public string? ReminderJobId { get; set; }

    /// <summary>
    /// ID of the Hangfire background job scheduled to auto-cancel this reservation if no check-in occurs.
    /// </summary>
    public string? AutoCancelJobId { get; set; }

    /// <summary>
    /// The exact time the user checked in to the room. Null if they haven't checked in.
    /// </summary>
    public DateTime? CheckedInAt { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>True if the slot is well-formed (end strictly after start).</summary>
    public static bool IsValidTimeRange(DateTime startTime, DateTime endTime) => endTime > startTime;
}
