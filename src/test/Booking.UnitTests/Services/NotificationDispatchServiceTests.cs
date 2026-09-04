using Booking.Application.Services;
using Booking.Domain.Configuration;
using Booking.Domain.Entities;
using Booking.Domain.Interfaces;
using FluentAssertions;
using Microsoft.Extensions.Logging;
using Moq;

namespace Booking.UnitTests.Services;

public class NotificationDispatchServiceTests
{
    private readonly Mock<INotificationRepository> _notifications = new();
    private readonly Mock<IUserRepository> _users = new();
    private readonly Mock<IRoomRepository> _rooms = new();
    private readonly Mock<IReservationAttendeeRepository> _attendees = new();
    private readonly Mock<INotificationSender> _sender = new();
    private readonly Mock<IRealtimeNotifier> _realtimeNotifier = new();
    private readonly Mock<ILogger<NotificationDispatchService>> _logger = new();
    private readonly BusinessSettings _businessSettings = new() { TimeZoneId = "UTC" };

    public NotificationDispatchServiceTests()
    {
        _rooms.Setup(r => r.GetByIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>())).ReturnsAsync((Room?)null);
        _attendees.Setup(a => a.GetAttendeeUserIdsAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>())).ReturnsAsync([]);
    }

    private NotificationDispatchService CreateSut() =>
        new(_notifications.Object, _users.Object, _rooms.Object, _attendees.Object, _sender.Object, _realtimeNotifier.Object, _businessSettings, _logger.Object);

    private static Reservation SomeReservation() => new()
    {
        UserId = Guid.NewGuid(),
        RoomId = Guid.NewGuid(),
        StartTime = DateTime.UtcNow.AddMinutes(10),
        EndTime = DateTime.UtcNow.AddMinutes(40)
    };

    [Fact]
    public async Task DispatchReminderAsync_HostAlreadyNotified_DoesNothing()
    {
        // Arrange
        var reservation = SomeReservation();
        _notifications.Setup(n => n.ExistsForReservationAsync(reservation.Id, reservation.UserId, NotificationType.ReservationReminder, It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        // Act
        await CreateSut().DispatchReminderAsync(reservation);

        // Assert
        _notifications.Verify(n => n.AddAsync(It.IsAny<Notification>(), It.IsAny<CancellationToken>()), Times.Never);
        _sender.Verify(s => s.SendAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
        _realtimeNotifier.Verify(n => n.NotifyUserAsync(It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task DispatchReminderAsync_UserNotFound_PersistsNotificationButDoesNotSend()
    {
        // Arrange
        var reservation = SomeReservation();
        _notifications.Setup(n => n.ExistsForReservationAsync(reservation.Id, reservation.UserId, NotificationType.ReservationReminder, It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);
        _users.Setup(u => u.GetByIdAsync(reservation.UserId, It.IsAny<CancellationToken>())).ReturnsAsync((User?)null);

        // Act
        await CreateSut().DispatchReminderAsync(reservation);

        // Assert
        _notifications.Verify(n => n.AddAsync(It.IsAny<Notification>(), It.IsAny<CancellationToken>()), Times.Once);
        _notifications.Verify(n => n.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
        _sender.Verify(s => s.SendAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
        // The live channel doesn't depend on the user record at all (it only needs the id
        // already on the reservation), so it still fires even when email delivery can't happen.
        _realtimeNotifier.Verify(n => n.NotifyUserAsync(reservation.UserId, It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task DispatchReminderAsync_SendSucceeds_MarksNotificationSent()
    {
        // Arrange
        var reservation = SomeReservation();
        var user = new User { Id = reservation.UserId, Email = "user@example.com" };
        _notifications.Setup(n => n.ExistsForReservationAsync(reservation.Id, reservation.UserId, NotificationType.ReservationReminder, It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);
        _users.Setup(u => u.GetByIdAsync(reservation.UserId, It.IsAny<CancellationToken>())).ReturnsAsync(user);
        _sender.Setup(s => s.SendAsync(user.Email, It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        Notification? persisted = null;
        _notifications.Setup(n => n.AddAsync(It.IsAny<Notification>(), It.IsAny<CancellationToken>()))
            .Callback<Notification, CancellationToken>((n, _) => persisted = n)
            .Returns(Task.CompletedTask);

        // Act
        await CreateSut().DispatchReminderAsync(reservation);

        // Assert
        persisted.Should().NotBeNull();
        persisted!.SentAt.Should().NotBeNull();
        _notifications.Verify(n => n.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Exactly(2));
        _realtimeNotifier.Verify(n => n.NotifyUserAsync(reservation.UserId, persisted.Message, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task DispatchReminderAsync_RoomFound_MessageUsesRoomNameNotRawGuid()
    {
        // Arrange
        var reservation = SomeReservation();
        var room = new Room { Id = reservation.RoomId, Name = "Falcon" };
        _notifications.Setup(n => n.ExistsForReservationAsync(reservation.Id, reservation.UserId, NotificationType.ReservationReminder, It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);
        _rooms.Setup(r => r.GetByIdAsync(reservation.RoomId, It.IsAny<CancellationToken>())).ReturnsAsync(room);
        _users.Setup(u => u.GetByIdAsync(reservation.UserId, It.IsAny<CancellationToken>())).ReturnsAsync((User?)null);

        Notification? persisted = null;
        _notifications.Setup(n => n.AddAsync(It.IsAny<Notification>(), It.IsAny<CancellationToken>()))
            .Callback<Notification, CancellationToken>((n, _) => persisted = n)
            .Returns(Task.CompletedTask);

        // Act
        await CreateSut().DispatchReminderAsync(reservation);

        // Assert
        persisted.Should().NotBeNull();
        persisted!.Message.Should().Contain("Falcon").And.NotContain(reservation.RoomId.ToString());
    }

    [Fact]
    public async Task DispatchReminderAsync_SendFails_LeavesNotificationUnsent()
    {
        // Arrange
        var reservation = SomeReservation();
        var user = new User { Id = reservation.UserId, Email = "user@example.com" };
        _notifications.Setup(n => n.ExistsForReservationAsync(reservation.Id, reservation.UserId, NotificationType.ReservationReminder, It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);
        _users.Setup(u => u.GetByIdAsync(reservation.UserId, It.IsAny<CancellationToken>())).ReturnsAsync(user);
        _sender.Setup(s => s.SendAsync(user.Email, It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);

        Notification? persisted = null;
        _notifications.Setup(n => n.AddAsync(It.IsAny<Notification>(), It.IsAny<CancellationToken>()))
            .Callback<Notification, CancellationToken>((n, _) => persisted = n)
            .Returns(Task.CompletedTask);

        // Act
        await CreateSut().DispatchReminderAsync(reservation);

        // Assert
        persisted.Should().NotBeNull();
        persisted!.SentAt.Should().BeNull();
        _notifications.Verify(n => n.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task DispatchReminderAsync_HasAttendees_NotifiesHostAndEveryAttendeeIndependently()
    {
        // Arrange
        var reservation = SomeReservation();
        var attendee1 = Guid.NewGuid();
        var attendee2 = Guid.NewGuid();
        _attendees.Setup(a => a.GetAttendeeUserIdsAsync(reservation.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync([attendee1, attendee2]);
        _notifications.Setup(n => n.ExistsForReservationAsync(reservation.Id, It.IsAny<Guid>(), NotificationType.ReservationReminder, It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);

        // Act
        await CreateSut().DispatchReminderAsync(reservation);

        // Assert — one Notification row per recipient (host + 2 attendees), each with the
        // right UserId.
        _notifications.Verify(n => n.AddAsync(It.Is<Notification>(x => x.UserId == reservation.UserId), It.IsAny<CancellationToken>()), Times.Once);
        _notifications.Verify(n => n.AddAsync(It.Is<Notification>(x => x.UserId == attendee1), It.IsAny<CancellationToken>()), Times.Once);
        _notifications.Verify(n => n.AddAsync(It.Is<Notification>(x => x.UserId == attendee2), It.IsAny<CancellationToken>()), Times.Once);
        _realtimeNotifier.Verify(n => n.NotifyUserAsync(reservation.UserId, It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Once);
        _realtimeNotifier.Verify(n => n.NotifyUserAsync(attendee1, It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Once);
        _realtimeNotifier.Verify(n => n.NotifyUserAsync(attendee2, It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task DispatchReminderAsync_AttendeeMessageDiffersFromHostMessage()
    {
        // Arrange
        var reservation = SomeReservation();
        var attendeeId = Guid.NewGuid();
        _attendees.Setup(a => a.GetAttendeeUserIdsAsync(reservation.Id, It.IsAny<CancellationToken>())).ReturnsAsync([attendeeId]);
        _notifications.Setup(n => n.ExistsForReservationAsync(reservation.Id, It.IsAny<Guid>(), NotificationType.ReservationReminder, It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);

        var persisted = new List<Notification>();
        _notifications.Setup(n => n.AddAsync(It.IsAny<Notification>(), It.IsAny<CancellationToken>()))
            .Callback<Notification, CancellationToken>((n, _) => persisted.Add(n))
            .Returns(Task.CompletedTask);

        // Act
        await CreateSut().DispatchReminderAsync(reservation);

        // Assert
        var hostMessage = persisted.Single(n => n.UserId == reservation.UserId).Message;
        var attendeeMessage = persisted.Single(n => n.UserId == attendeeId).Message;
        hostMessage.Should().Contain("your reservation");
        attendeeMessage.Should().Contain("you're attending").And.NotContain("your reservation");
    }

    [Fact]
    public async Task DispatchReminderAsync_HostAlreadyNotifiedButAttendeeIsNot_StillNotifiesAttendee()
    {
        // Arrange — proves the dedup check is genuinely per-recipient, not per-reservation.
        var reservation = SomeReservation();
        var attendeeId = Guid.NewGuid();
        _attendees.Setup(a => a.GetAttendeeUserIdsAsync(reservation.Id, It.IsAny<CancellationToken>())).ReturnsAsync([attendeeId]);
        _notifications.Setup(n => n.ExistsForReservationAsync(reservation.Id, reservation.UserId, NotificationType.ReservationReminder, It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);
        _notifications.Setup(n => n.ExistsForReservationAsync(reservation.Id, attendeeId, NotificationType.ReservationReminder, It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);

        // Act
        await CreateSut().DispatchReminderAsync(reservation);

        // Assert
        _notifications.Verify(n => n.AddAsync(It.Is<Notification>(x => x.UserId == reservation.UserId), It.IsAny<CancellationToken>()), Times.Never);
        _notifications.Verify(n => n.AddAsync(It.Is<Notification>(x => x.UserId == attendeeId), It.IsAny<CancellationToken>()), Times.Once);
    }
}
