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
    ISystemSettingsRepository systemSettings,
    ILogger<NotificationDispatchService> logger) : INotificationDispatchService
{
    public async Task DispatchReminderAsync(Reservation reservation, CancellationToken ct = default)
    {
        // SANITY CHECK: If the server was down and this Hangfire job is firing late,
        // check if the meeting has already started.
        if (reservation.StartTime <= DateTime.UtcNow) 
        {
            logger.LogWarning("[NotificationDispatchService] Reminder job fired late for Reservation {ReservationId}. Meeting already started. Skipping.", reservation.Id);
            return;
        }

        var room = await rooms.GetByIdAsync(reservation.RoomId, ct);
        var roomLabel = room?.Name ?? reservation.RoomId.ToString();

        var settings = await systemSettings.GetSettingsAsync(ct);
        var businessTimeZone = TimeZoneInfo.FindSystemTimeZoneById(settings.TimeZoneId);
        var localStart = TimeZoneInfo.ConvertTimeFromUtc(DateTime.SpecifyKind(reservation.StartTime, DateTimeKind.Utc), businessTimeZone);
        var whenText = $"{localStart:dddd, MMMM d 'at' h:mm tt} ({settings.TimeZoneId})";

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

        var sent = await sender.SendAsync(user.Email, "Reservation Reminder", notification.Message, null, ct);
        if (sent)
        {
            notification.SentAt = DateTime.UtcNow;
            await notifications.SaveChangesAsync(ct);
        }
    }

    public async Task DispatchCalendarInviteAsync(Reservation reservation, CancellationToken ct = default)
    {
        var room = await rooms.GetByIdAsync(reservation.RoomId, ct);
        var roomLabel = room?.Name ?? reservation.RoomId.ToString();

        var attendeeIds = await attendees.GetAttendeeUserIdsAsync(reservation.Id, ct);
        var recipientIds = new[] { reservation.UserId }.Concat(attendeeIds).Distinct();

        var icsContent = GenerateIcsContent(reservation, roomLabel);

        foreach (var recipientId in recipientIds)
        {
            var user = await users.GetByIdAsync(recipientId, ct);
            if (user is null) continue;

            string subject = $"Calendar Invite: {roomLabel}";
            string message = $"You have a reservation at {roomLabel}. Please find the calendar invite attached.";

            await sender.SendAsync(user.Email, subject, message, icsContent, ct);
        }
    }

    private string GenerateIcsContent(Reservation reservation, string roomLabel)
    {
        var dtStart = reservation.StartTime.ToUniversalTime().ToString("yyyyMMddTHHmmssZ");
        var dtEnd = reservation.EndTime.ToUniversalTime().ToString("yyyyMMddTHHmmssZ");
        var now = DateTime.UtcNow.ToString("yyyyMMddTHHmmssZ");

        return $@"BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//MyCompany//BookingSystem//EN
METHOD:REQUEST
BEGIN:VEVENT
UID:{reservation.Id}
DTSTAMP:{now}
DTSTART:{dtStart}
DTEND:{dtEnd}
SUMMARY:Booking: {roomLabel}
DESCRIPTION:Reservation for {roomLabel}
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR".Replace("\r\n", "\n").Replace("\n", "\r\n");
    }
}
