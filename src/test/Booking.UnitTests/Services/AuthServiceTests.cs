using Booking.Application.DTOs;
using Booking.Application.Services;
using Booking.Domain.Entities;
using Booking.Domain.Interfaces;
using FluentAssertions;
using Moq;

namespace Booking.UnitTests.Services;

public class AuthServiceTests
{
    private readonly Mock<IUserRepository> _users = new();
    private readonly Mock<IPasswordHasher> _passwordHasher = new();
    private readonly Mock<IJwtTokenGenerator> _jwtTokenGenerator = new();

    private AuthService CreateSut() => new(_users.Object, _passwordHasher.Object, _jwtTokenGenerator.Object);

    [Fact]
    public async Task RegisterAsync_NewUsername_HashesPasswordPersistsUserAndReturnsToken()
    {
        // Arrange
        var request = new RegisterRequest("alice", "alice@example.com", "p@ssword1");
        _users.Setup(r => r.GetByUsernameAsync(request.Username, It.IsAny<CancellationToken>())).ReturnsAsync((User?)null);
        _passwordHasher.Setup(h => h.Hash(request.Password)).Returns("hashed-password");
        _jwtTokenGenerator.Setup(j => j.GenerateToken(It.IsAny<User>())).Returns("jwt-token");

        // Act
        var response = await CreateSut().RegisterAsync(request);

        // Assert
        response.Token.Should().Be("jwt-token");
        response.Username.Should().Be(request.Username);
        _users.Verify(r => r.AddAsync(
            It.Is<User>(u => u.Username == request.Username && u.Email == request.Email && u.PasswordHash == "hashed-password"),
            It.IsAny<CancellationToken>()), Times.Once);
        _users.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task RegisterAsync_UsernameAlreadyTaken_ThrowsAndDoesNotPersist()
    {
        // Arrange
        var request = new RegisterRequest("alice", "alice@example.com", "p@ssword1");
        _users.Setup(r => r.GetByUsernameAsync(request.Username, It.IsAny<CancellationToken>())).ReturnsAsync(new User());

        // Act
        var act = () => CreateSut().RegisterAsync(request);

        // Assert
        await act.Should().ThrowAsync<InvalidOperationException>();
        _users.Verify(r => r.AddAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()), Times.Never);
        _users.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task LoginAsync_ValidCredentials_ReturnsToken()
    {
        // Arrange
        var user = new User { Username = "alice", PasswordHash = "hashed-password" };
        var request = new LoginRequest("alice", "p@ssword1");
        _users.Setup(r => r.GetByUsernameAsync(request.Username, It.IsAny<CancellationToken>())).ReturnsAsync(user);
        _passwordHasher.Setup(h => h.Verify(request.Password, user.PasswordHash)).Returns(true);
        _jwtTokenGenerator.Setup(j => j.GenerateToken(user)).Returns("jwt-token");

        // Act
        var response = await CreateSut().LoginAsync(request);

        // Assert
        response.Token.Should().Be("jwt-token");
        response.UserId.Should().Be(user.Id);
        response.Username.Should().Be(user.Username);
    }

    [Fact]
    public async Task LoginAsync_UnknownUsername_ThrowsUnauthorized()
    {
        // Arrange
        var request = new LoginRequest("ghost", "p@ssword1");
        _users.Setup(r => r.GetByUsernameAsync(request.Username, It.IsAny<CancellationToken>())).ReturnsAsync((User?)null);

        // Act
        var act = () => CreateSut().LoginAsync(request);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task LoginAsync_WrongPassword_ThrowsUnauthorized()
    {
        // Arrange
        var user = new User { Username = "alice", PasswordHash = "hashed-password" };
        var request = new LoginRequest("alice", "wrong-password");
        _users.Setup(r => r.GetByUsernameAsync(request.Username, It.IsAny<CancellationToken>())).ReturnsAsync(user);
        _passwordHasher.Setup(h => h.Verify(request.Password, user.PasswordHash)).Returns(false);

        // Act
        var act = () => CreateSut().LoginAsync(request);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }
}
