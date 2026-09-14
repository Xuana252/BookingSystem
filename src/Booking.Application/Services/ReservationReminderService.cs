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
    ReservationReminderSettings settings,
    ICorrelationIdAccessor correlationIdAccessor) : IReservationReminderService
{
    public async Task ScanAndPublishDueRemindersAsync(CancellationToken ct = default)
    {
        var now = DateTime.UtcNow;
        var upcoming = await reservations.GetUpcomingAsync(now, now.AddMinutes(settings.WindowMinutes), ct);

        foreach (var reservation in upcoming)
        {
            // Host-only gate, deliberately — this only decides whether to publish the event at
            // all, not who ends up notified (NotificationDispatchService fans that out to the
            // host and every attendee independently, each with its own per-user dedup check).
            // Known trade-off: if an attendee's own notification failed once for some transient
            // reason while the host's succeeded, this gate won't re-publish on a later scan to
            // retry just that attendee — narrow edge case, not worth more machinery for at this
            // project's scale.
            var hostAlreadyNotified = await notifications.ExistsForReservationAsync(
                reservation.Id, reservation.UserId, NotificationType.ReservationReminder, ct);
            if (hostAlreadyNotified)
            {
                continue;
            }

            var envelope = new EventEnvelope
            {
                EventType = EventTypes.ReservationReminderDue,
                Source = "Booking.Worker",
                Payload = JsonSerializer.Serialize(reservation),
                CorrelationId = correlationIdAccessor.CorrelationId
            };
            await eventPublisher.PublishAsync(envelope, ct);
        }
    }
}
