using Booking.Application.Interfaces;
using Booking.Domain.Configuration;
using Booking.Domain.Entities;
using Booking.Domain.Interfaces;
using Microsoft.Extensions.Logging;

namespace Booking.Application.Services;

public class NotificationDispatchService(
    INotificationRepository notifications,
    IUserRepository users,
    IRoomRepository rooms,
    IReservationAttendeeRepository attendees,
    INotificationSender sender,
    IRealtimeNotifier realtimeNotifier,
    BusinessSettings businessSettings,
    ILogger<NotificationDispatchService> logger) : INotificationDispatchService
{
    public async Task DispatchReminderAsync(Reservation reservation, CancellationToken ct = default)
    {
        var room = await rooms.GetByIdAsync(reservation.RoomId, ct);
        var roomLabel = room?.Name ?? reservation.RoomId.ToString();

        var businessTimeZone = TimeZoneInfo.FindSystemTimeZoneById(businessSettings.TimeZoneId);
        var localStart = TimeZoneInfo.ConvertTimeFromUtc(DateTime.SpecifyKind(reservation.StartTime, DateTimeKind.Utc), businessTimeZone);
        var whenText = $"{localStart:dddd, MMMM d 'at' h:mm tt} ({businessSettings.TimeZoneId})";

        var attendeeIds = await attendees.GetAttendeeUserIdsAsync(reservation.Id, ct);

        // Host first, then attendees, de-duplicated in case an attendee row ever ended up
        // matching the host's own id — each recipient is dispatched (and dedup-checked)
        // independently below, so nobody's reminder depends on anyone else's succeeding.
        var recipientIds = new[] { reservation.UserId }.Concat(attendeeIds).Distinct();

        foreach (var recipientId in recipientIds)
        {
            var isHost = recipientId == reservation.UserId;
            await DispatchToRecipientAsync(reservation, roomLabel, whenText, recipientId, isHost, ct);
        }
    }

    private async Task DispatchToRecipientAsync(
        Reservation reservation, string roomLabel, string whenText, Guid recipientId, bool isHost, CancellationToken ct)
    {
        var alreadyNotified = await notifications.ExistsForReservationAsync(
            reservation.Id, recipientId, NotificationType.ReservationReminder, ct);
        if (alreadyNotified)
        {
            return;
        }

        var message = isHost
            ? $"Reminder: your reservation for {roomLabel} starts at {whenText}."
            : $"Reminder: you're attending a reservation for {roomLabel}, starting at {whenText}.";

        var notification = new Notification
        {
            UserId = recipientId,
            ReservationId = reservation.Id,
            Type = NotificationType.ReservationReminder,
            Message = message
        };

        await notifications.AddAsync(notification, ct);
        await notifications.SaveChangesAsync(ct);

        // In-app/live channel — independent of the email below, so it still reaches a connected
        // user even if SMTP delivery fails or the user's email lookup comes back empty.
        await realtimeNotifier.NotifyUserAsync(recipientId, notification.Message, ct);

        var user = await users.GetByIdAsync(recipientId, ct);
        if (user is null)
        {
            logger.LogWarning(
                "[NotificationDispatchService] User {UserId} not found; leaving Notification {NotificationId} unsent.",
                recipientId, notification.Id);
            return;
        }

        var sent = await sender.SendAsync(user.Email, "Reservation Reminder", notification.Message, ct);
        if (sent)
        {
            notification.SentAt = DateTime.UtcNow;
            await notifications.SaveChangesAsync(ct);
        }
    }
}
