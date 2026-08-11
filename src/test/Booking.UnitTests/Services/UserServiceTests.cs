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
        var expected = new List<User> { new() { Username = "alice" } };
        _users.Setup(r => r.GetAllAsync(It.IsAny<CancellationToken>())).ReturnsAsync(expected);

        var result = await CreateSut().GetAllAsync();

        result.Should().BeEquivalentTo(expected);
    }

    [Fact]
    public async Task CreateAsync_PersistsUserWithRequestedFields()
    {
        var request = new CreateUserRequest("alice", "alice@example.com");

        var user = await CreateSut().CreateAsync(request);

        user.Username.Should().Be(request.Username);
        user.Email.Should().Be(request.Email);
        _users.Verify(r => r.AddAsync(It.Is<User>(x => x == user), It.IsAny<CancellationToken>()), Times.Once);
        _users.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }
}
