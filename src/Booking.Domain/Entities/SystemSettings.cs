namespace Booking.Domain.Entities;

public class SystemSettings
{
    public Guid Id { get; set; } = Guid.NewGuid();
    
    /// <summary>
    /// Maximum number of days in advance a user can book a room.
    /// </summary>
    public int MaxBookingLeadTimeDays { get; set; } = 30;
    
    /// <summary>
    /// If a user does not check in within this many minutes after StartTime, the reservation is cancelled.
    /// Set to 0 or negative to disable auto-cancel.
    /// </summary>
    public int AutoCancelMinutes { get; set; } = 15;

    public TimeSpan BusinessHoursStart { get; set; } = new TimeSpan(8, 0, 0); // 08:00
    public TimeSpan BusinessHoursEnd { get; set; } = new TimeSpan(18, 0, 0);  // 18:00
    public int MaxDurationHours { get; set; } = 4;
    public string TimeZoneId { get; set; } = "Asia/Ho_Chi_Minh";
}
