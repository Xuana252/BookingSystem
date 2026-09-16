using Booking.Domain.Entities;

namespace Booking.Application.Interfaces;

public interface INotificationDispatchService
{
    Task DispatchReminderAsync(Reservation reservation, CancellationToken ct = default);
    Task DispatchCalendarInviteAsync(Reservation reservation, CancellationToken ct = default);
}
