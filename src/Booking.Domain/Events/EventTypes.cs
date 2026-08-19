namespace Booking.Domain.Events;

/// <summary>
/// Canonical EventType strings. Format: "bookingsystem.{domain}.{action}.v{version}".
/// </summary>
public static class EventTypes
{
    /// <summary>Fired when a user reserves a room time slot.</summary>
    public const string ReservationCreated = "bookingsystem.reservation.created.v1";

    /// <summary>Fired when a reservation is about to start and a reminder should go out.</summary>
    public const string ReservationReminderDue = "bookingsystem.reservation.reminderdue.v1";
}
