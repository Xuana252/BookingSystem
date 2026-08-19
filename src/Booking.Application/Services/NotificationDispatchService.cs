using Booking.Application.Interfaces;
using Booking.Domain.Entities;
using Booking.Domain.Interfaces;
using Microsoft.Extensions.Logging;

namespace Booking.Application.Services;

public class NotificationDispatchService(
    INotificationRepository notifications,
    IUserRepository users,
    INotificationSender sender,
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

        var notification = new Notification
        {
            UserId = reservation.UserId,
            ReservationId = reservation.Id,
            Type = NotificationType.ReservationReminder,
            Message = $"Reminder: your reservation for room {reservation.RoomId} starts at {reservation.StartTime:u}."
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
