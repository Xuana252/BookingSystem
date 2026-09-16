using Booking.Domain.Entities;

namespace Booking.Domain.Interfaces;

public interface ITeamsNotificationService
{
    Task SendBookingCardAsync(string webhookUrl, Reservation reservation, Room room, CancellationToken ct = default);
}
