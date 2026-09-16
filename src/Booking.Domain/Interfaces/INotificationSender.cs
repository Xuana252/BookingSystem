namespace Booking.Domain.Interfaces;

public interface INotificationSender
{
    Task<bool> SendAsync(string recipientEmail, string subject, string message, string? icsContent = null, CancellationToken ct = default);
}
