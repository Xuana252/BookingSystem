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
    public async Task GetAllAsync_ProjectsIdAndUsernameOnly()
    {
        // Arrange
        var user = new User { Username = "alice", Email = "alice@example.com", PasswordHash = "hashed-password" };
        _users.Setup(r => r.GetAllAsync(It.IsAny<CancellationToken>())).ReturnsAsync([user]);

        // Act
        var result = await CreateSut().GetAllAsync();

        // Assert — the whole point of UserSummaryResponse is that it *can't* carry PasswordHash/Email,
        // the compiler enforces that; this just confirms Id/Username actually made it through.
        result.Should().ContainSingle().Which.Should().BeEquivalentTo(new { user.Id, user.Username });
    }
}
