namespace Booking.Application.Interfaces;

public interface IReservationReminderService
{
    Task ScanAndPublishDueRemindersAsync(CancellationToken ct = default);
}
