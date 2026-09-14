namespace Booking.Domain.Entities;

/// <summary>A non-host participant on a <see cref="Reservation"/> — the host is Reservation.UserId
/// itself, not a row here.</summary>
public class ReservationAttendee
{
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>
    /// FK -> Reservation.Id
    /// </summary>
    public Guid ReservationId { get; set; }

    /// <summary>
    /// FK -> User.Id
    /// </summary>
    public Guid UserId { get; set; }
}
