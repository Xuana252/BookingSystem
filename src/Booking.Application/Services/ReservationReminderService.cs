using System.Text.Json;
using Booking.Application.Interfaces;
using Booking.Domain.Configuration;
using Booking.Domain.Entities;
using Booking.Domain.Events;
using Booking.Domain.Interfaces;

namespace Booking.Application.Services;

public class ReservationReminderService(
    IReservationRepository reservations,
    INotificationRepository notifications,
    IEventPublisher eventPublisher,
    ReservationReminderSettings settings) : IReservationReminderService
{
    public async Task ScanAndPublishDueRemindersAsync(CancellationToken ct = default)
    {
        var now = DateTime.UtcNow;
        var upcoming = await reservations.GetUpcomingAsync(now, now.AddMinutes(settings.WindowMinutes), ct);

        foreach (var reservation in upcoming)
        {
            var alreadyNotified = await notifications.ExistsForReservationAsync(
                reservation.Id, NotificationType.ReservationReminder, ct);
            if (alreadyNotified)
            {
                continue;
            }

            var envelope = new EventEnvelope
            {
                EventType = EventTypes.ReservationReminderDue,
                Source = "Booking.Worker",
                Payload = JsonSerializer.Serialize(reservation)
            };
            await eventPublisher.PublishAsync(envelope, ct);
        }
    }
}
