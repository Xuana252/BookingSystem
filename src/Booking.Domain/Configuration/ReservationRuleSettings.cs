namespace Booking.Domain.Configuration;

public class ReservationRuleSettings
{
    public TimeSpan BusinessHoursStart { get; set; } = TimeSpan.FromHours(8);
    public TimeSpan BusinessHoursEnd { get; set; } = TimeSpan.FromHours(18);
    public int MaxDurationHours { get; set; } = 4;
}
