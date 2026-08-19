namespace Booking.Domain.Interfaces;

public interface INotificationSender
{
    Task<bool> SendAsync(string recipientEmail, string subject, string message, CancellationToken ct = default);
}
