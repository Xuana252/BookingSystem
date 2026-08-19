namespace Booking.Domain.Configuration;

public class ReservationReminderSettings
{
    public int WindowMinutes { get; set; } = 30;
    public string CronExpression { get; set; } = "*/1 * * * *";
}
