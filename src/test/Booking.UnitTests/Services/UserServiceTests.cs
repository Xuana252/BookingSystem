using Booking.Application.DTOs;
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

    [Fact]
    public async Task CreateAsync_PersistsUserWithRequestedFields()
    {
        // Arrange
        var request = new CreateUserRequest("alice", "alice@example.com");

        // Act
        var user = await CreateSut().CreateAsync(request);

        // Assert
        user.Username.Should().Be(request.Username);
        user.Email.Should().Be(request.Email);
        _users.Verify(r => r.AddAsync(It.Is<User>(x => x == user), It.IsAny<CancellationToken>()), Times.Once);
        _users.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }
}
