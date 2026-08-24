namespace Booking.Domain.Configuration;

/// <summary>
/// Shared across Api and Worker (bound in AddBookingInfrastructure, not one composition root's
/// own Program.cs) — both BookingRuleEngine (business-hours validation) and
/// NotificationDispatchService (formatting reminder times for display) need it.
/// </summary>
public class BusinessSettings
{
    /// <summary>IANA time zone ID. Business hours and displayed times are relative to this zone,
    /// not the server's (UTC) — a request "in business hours" only means something once you know
    /// whose business hours.</summary>
    public string TimeZoneId { get; set; } = "Asia/Ho_Chi_Minh";
}
