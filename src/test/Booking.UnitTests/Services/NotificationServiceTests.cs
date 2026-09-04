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
}
