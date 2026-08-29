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
    INotificationSender sender,
    BusinessSettings businessSettings,
    ILogger<NotificationDispatchService> logger) : INotificationDispatchService
{
    public async Task DispatchReminderAsync(Reservation reservation, CancellationToken ct = default)
    {
        var alreadyNotified = await notifications.ExistsForReservationAsync(
            reservation.Id, NotificationType.ReservationReminder, ct);
        if (alreadyNotified)
        {
            return;
        }

        var room = await rooms.GetByIdAsync(reservation.RoomId, ct);
        var roomLabel = room?.Name ?? reservation.RoomId.ToString();

        var businessTimeZone = TimeZoneInfo.FindSystemTimeZoneById(businessSettings.TimeZoneId);
        var localStart = TimeZoneInfo.ConvertTimeFromUtc(DateTime.SpecifyKind(reservation.StartTime, DateTimeKind.Utc), businessTimeZone);

        var notification = new Notification
        {
            UserId = reservation.UserId,
            ReservationId = reservation.Id,
            Type = NotificationType.ReservationReminder,
            Message = $"Reminder: your reservation for {roomLabel} starts at {localStart:dddd, MMMM d 'at' h:mm tt} ({businessSettings.TimeZoneId})."
        };

        await notifications.AddAsync(notification, ct);
        await notifications.SaveChangesAsync(ct);

        var user = await users.GetByIdAsync(reservation.UserId, ct);
        if (user is null)
        {
            logger.LogWarning(
                "[NotificationDispatchService] User {UserId} not found; leaving Notification {NotificationId} unsent.",
                reservation.UserId, notification.Id);
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
