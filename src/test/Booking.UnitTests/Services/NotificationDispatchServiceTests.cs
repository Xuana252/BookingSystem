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
    private readonly Mock<INotificationSender> _sender = new();
    private readonly Mock<ILogger<NotificationDispatchService>> _logger = new();
    private readonly BusinessSettings _businessSettings = new() { TimeZoneId = "UTC" };

    public NotificationDispatchServiceTests()
    {
        _rooms.Setup(r => r.GetByIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>())).ReturnsAsync((Room?)null);
    }

    private NotificationDispatchService CreateSut() =>
        new(_notifications.Object, _users.Object, _rooms.Object, _sender.Object, _businessSettings, _logger.Object);

    private static Reservation SomeReservation() => new()
    {
        UserId = Guid.NewGuid(),
        RoomId = Guid.NewGuid(),
        StartTime = DateTime.UtcNow.AddMinutes(10),
        EndTime = DateTime.UtcNow.AddMinutes(40)
    };

    [Fact]
    public async Task DispatchReminderAsync_AlreadyNotified_DoesNothing()
    {
        // Arrange
        var reservation = SomeReservation();
        _notifications.Setup(n => n.ExistsForReservationAsync(reservation.Id, NotificationType.ReservationReminder, It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        // Act
        await CreateSut().DispatchReminderAsync(reservation);

        // Assert
        _notifications.Verify(n => n.AddAsync(It.IsAny<Notification>(), It.IsAny<CancellationToken>()), Times.Never);
        _sender.Verify(s => s.SendAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task DispatchReminderAsync_UserNotFound_PersistsNotificationButDoesNotSend()
    {
        // Arrange
        var reservation = SomeReservation();
        _notifications.Setup(n => n.ExistsForReservationAsync(reservation.Id, NotificationType.ReservationReminder, It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);
        _users.Setup(u => u.GetByIdAsync(reservation.UserId, It.IsAny<CancellationToken>())).ReturnsAsync((User?)null);

        // Act
        await CreateSut().DispatchReminderAsync(reservation);

        // Assert
        _notifications.Verify(n => n.AddAsync(It.IsAny<Notification>(), It.IsAny<CancellationToken>()), Times.Once);
        _notifications.Verify(n => n.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
        _sender.Verify(s => s.SendAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task DispatchReminderAsync_SendSucceeds_MarksNotificationSent()
    {
        // Arrange
        var reservation = SomeReservation();
        var user = new User { Id = reservation.UserId, Email = "user@example.com" };
        _notifications.Setup(n => n.ExistsForReservationAsync(reservation.Id, NotificationType.ReservationReminder, It.IsAny<CancellationToken>()))
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
    }

    [Fact]
    public async Task DispatchReminderAsync_RoomFound_MessageUsesRoomNameNotRawGuid()
    {
        // Arrange
        var reservation = SomeReservation();
        var room = new Room { Id = reservation.RoomId, Name = "Falcon" };
        _notifications.Setup(n => n.ExistsForReservationAsync(reservation.Id, NotificationType.ReservationReminder, It.IsAny<CancellationToken>()))
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
        _notifications.Setup(n => n.ExistsForReservationAsync(reservation.Id, NotificationType.ReservationReminder, It.IsAny<CancellationToken>()))
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
}
