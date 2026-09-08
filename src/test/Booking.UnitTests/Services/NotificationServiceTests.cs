using Booking.Application.Services;
using Booking.Domain.Entities;
using Booking.Domain.Interfaces;
using FluentAssertions;
using Moq;

namespace Booking.UnitTests.Services;

public class NotificationServiceTests
{
    private readonly Mock<INotificationRepository> _notifications = new();

    private NotificationService CreateSut() => new(_notifications.Object);

    [Fact]
    public async Task GetForUserAsync_DelegatesToRepository()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var expected = new List<Notification> { new() { UserId = userId } };
        _notifications.Setup(n => n.GetForUserAsync(userId, It.IsAny<CancellationToken>())).ReturnsAsync(expected);

        // Act
        var result = await CreateSut().GetForUserAsync(userId);

        // Assert
        result.Should().BeEquivalentTo(expected);
    }

    [Fact]
    public async Task MarkAsReadAsync_DelegatesToRepository_ReturnsResult()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var notificationId = Guid.NewGuid();
        _notifications.Setup(n => n.MarkAsReadAsync(notificationId, userId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        // Act
        var result = await CreateSut().MarkAsReadAsync(notificationId, userId);

        // Assert
        result.Should().BeTrue();
        _notifications.Verify(n => n.MarkAsReadAsync(notificationId, userId, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task MarkAllAsReadAsync_DelegatesToRepository()
    {
        // Arrange
        var userId = Guid.NewGuid();
        _notifications.Setup(n => n.MarkAllAsReadAsync(userId, It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        // Act
        await CreateSut().MarkAllAsReadAsync(userId);

        // Assert
        _notifications.Verify(n => n.MarkAllAsReadAsync(userId, It.IsAny<CancellationToken>()), Times.Once);
    }
}
