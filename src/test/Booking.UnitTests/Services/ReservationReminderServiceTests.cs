using Booking.Application.Services;
using Booking.Domain.Configuration;
using Booking.Domain.Entities;
using Booking.Domain.Events;
using Booking.Domain.Interfaces;
using FluentAssertions;
using Moq;

namespace Booking.UnitTests.Services;

public class ReservationReminderServiceTests
{
    private readonly Mock<IReservationRepository> _reservations = new();
    private readonly Mock<INotificationRepository> _notifications = new();
    private readonly Mock<IEventPublisher> _eventPublisher = new();
    private readonly ReservationReminderSettings _settings = new() { WindowMinutes = 30 };

    private ReservationReminderService CreateSut() => new(_reservations.Object, _notifications.Object, _eventPublisher.Object, _settings);

    private static Reservation UpcomingReservation() => new()
    {
        StartTime = DateTime.UtcNow.AddMinutes(10),
        EndTime = DateTime.UtcNow.AddMinutes(40)
    };

    [Fact]
    public async Task ScanAndPublishDueRemindersAsync_UpcomingReservationNotYetNotified_PublishesReminderEvent()
    {
        // Arrange
        var reservation = UpcomingReservation();
        _reservations.Setup(r => r.GetUpcomingAsync(It.IsAny<DateTime>(), It.IsAny<DateTime>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync([reservation]);
        _notifications.Setup(n => n.ExistsForReservationAsync(reservation.Id, NotificationType.ReservationReminder, It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);

        // Act
        await CreateSut().ScanAndPublishDueRemindersAsync();

        // Assert
        _eventPublisher.Verify(p => p.PublishAsync(
            It.Is<EventEnvelope>(e => e.EventType == EventTypes.ReservationReminderDue && e.Source == "Booking.Worker"),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task ScanAndPublishDueRemindersAsync_AlreadyNotified_DoesNotPublishAgain()
    {
        // Arrange
        var reservation = UpcomingReservation();
        _reservations.Setup(r => r.GetUpcomingAsync(It.IsAny<DateTime>(), It.IsAny<DateTime>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync([reservation]);
        _notifications.Setup(n => n.ExistsForReservationAsync(reservation.Id, NotificationType.ReservationReminder, It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        // Act
        await CreateSut().ScanAndPublishDueRemindersAsync();

        // Assert
        _eventPublisher.Verify(p => p.PublishAsync(It.IsAny<EventEnvelope>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task ScanAndPublishDueRemindersAsync_NoUpcomingReservations_DoesNotPublish()
    {
        // Arrange
        _reservations.Setup(r => r.GetUpcomingAsync(It.IsAny<DateTime>(), It.IsAny<DateTime>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync([]);

        // Act
        await CreateSut().ScanAndPublishDueRemindersAsync();

        // Assert
        _eventPublisher.Verify(p => p.PublishAsync(It.IsAny<EventEnvelope>(), It.IsAny<CancellationToken>()), Times.Never);
        _notifications.Verify(n => n.ExistsForReservationAsync(It.IsAny<Guid>(), It.IsAny<NotificationType>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task ScanAndPublishDueRemindersAsync_UsesConfiguredWindow()
    {
        // Arrange
        DateTime? capturedTo = null;
        _reservations.Setup(r => r.GetUpcomingAsync(It.IsAny<DateTime>(), It.IsAny<DateTime>(), It.IsAny<CancellationToken>()))
            .Callback<DateTime, DateTime, CancellationToken>((_, to, _) => capturedTo = to)
            .ReturnsAsync([]);

        // Act
        await CreateSut().ScanAndPublishDueRemindersAsync();

        // Assert
        capturedTo.Should().NotBeNull();
        capturedTo!.Value.Should().BeCloseTo(DateTime.UtcNow.AddMinutes(_settings.WindowMinutes), TimeSpan.FromSeconds(5));
    }
}
