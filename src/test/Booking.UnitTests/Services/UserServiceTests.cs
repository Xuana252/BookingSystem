using Booking.Application.Services;
using Booking.Domain.Entities;
using Booking.Domain.Interfaces;
using FluentAssertions;
using Moq;

namespace Booking.UnitTests.Services;

public class UserServiceTests
{
    private readonly Mock<IUserRepository> _users = new();

    private UserService CreateSut() => new(_users.Object);

    [Fact]
    public async Task GetAllAsync_DelegatesToRepository()
    {
        // Arrange
        var expected = new List<User> { new() { Username = "alice" } };
        _users.Setup(r => r.GetAllAsync(It.IsAny<CancellationToken>())).ReturnsAsync(expected);

        // Act
        var result = await CreateSut().GetAllAsync();

        // Assert
        result.Should().BeEquivalentTo(expected);
    }
}
