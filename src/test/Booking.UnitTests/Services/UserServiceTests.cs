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

    [Fact]
    public async Task GetAllForManagementAsync_ProjectsEmailRoleAndIsActive()
    {
        // Arrange
        var user = new User
        {
            Username = "alice", Email = "alice@example.com", PasswordHash = "hashed-password",
            Role = UserRole.Admin, IsActive = false
        };
        _users.Setup(r => r.GetAllAsync(It.IsAny<CancellationToken>())).ReturnsAsync([user]);

        // Act
        var result = await CreateSut().GetAllForManagementAsync();

        // Assert
        result.Should().ContainSingle().Which.Should().BeEquivalentTo(
            new { user.Id, user.Username, user.Email, user.Role, user.IsActive });
    }

    [Fact]
    public async Task DeactivateAsync_ActiveEmployee_SetsInactiveAndSaves()
    {
        // Arrange
        var user = new User { IsActive = true, Role = UserRole.Employee };
        _users.Setup(r => r.GetByIdAsync(user.Id, It.IsAny<CancellationToken>())).ReturnsAsync(user);

        // Act
        await CreateSut().DeactivateAsync(user.Id);

        // Assert
        user.IsActive.Should().BeFalse();
        _users.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task DeactivateAsync_AlreadyInactive_IsIdempotentAndDoesNotSave()
    {
        // Arrange
        var user = new User { IsActive = false };
        _users.Setup(r => r.GetByIdAsync(user.Id, It.IsAny<CancellationToken>())).ReturnsAsync(user);

        // Act
        await CreateSut().DeactivateAsync(user.Id);

        // Assert
        _users.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task DeactivateAsync_UserNotFound_Throws()
    {
        // Arrange
        var userId = Guid.NewGuid();
        _users.Setup(r => r.GetByIdAsync(userId, It.IsAny<CancellationToken>())).ReturnsAsync((User?)null);

        // Act
        var act = () => CreateSut().DeactivateAsync(userId);

        // Assert
        await act.Should().ThrowAsync<KeyNotFoundException>();
    }

    [Fact]
    public async Task DeactivateAsync_LastActiveAdmin_ThrowsAndDoesNotSave()
    {
        // Arrange
        var admin = new User { IsActive = true, Role = UserRole.Admin };
        _users.Setup(r => r.GetByIdAsync(admin.Id, It.IsAny<CancellationToken>())).ReturnsAsync(admin);
        _users.Setup(r => r.GetAllAsync(It.IsAny<CancellationToken>())).ReturnsAsync([admin]);

        // Act
        var act = () => CreateSut().DeactivateAsync(admin.Id);

        // Assert
        await act.Should().ThrowAsync<InvalidOperationException>();
        admin.IsActive.Should().BeTrue();
        _users.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task DeactivateAsync_AdminWithAnotherActiveAdmin_Succeeds()
    {
        // Arrange
        var admin = new User { IsActive = true, Role = UserRole.Admin };
        var otherAdmin = new User { IsActive = true, Role = UserRole.Admin };
        _users.Setup(r => r.GetByIdAsync(admin.Id, It.IsAny<CancellationToken>())).ReturnsAsync(admin);
        _users.Setup(r => r.GetAllAsync(It.IsAny<CancellationToken>())).ReturnsAsync([admin, otherAdmin]);

        // Act
        await CreateSut().DeactivateAsync(admin.Id);

        // Assert
        admin.IsActive.Should().BeFalse();
    }

    [Fact]
    public async Task ActivateAsync_InactiveUser_SetsActiveAndSaves()
    {
        // Arrange
        var user = new User { IsActive = false };
        _users.Setup(r => r.GetByIdAsync(user.Id, It.IsAny<CancellationToken>())).ReturnsAsync(user);

        // Act
        await CreateSut().ActivateAsync(user.Id);

        // Assert
        user.IsActive.Should().BeTrue();
        _users.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task ActivateAsync_AlreadyActive_IsIdempotentAndDoesNotSave()
    {
        // Arrange
        var user = new User { IsActive = true };
        _users.Setup(r => r.GetByIdAsync(user.Id, It.IsAny<CancellationToken>())).ReturnsAsync(user);

        // Act
        await CreateSut().ActivateAsync(user.Id);

        // Assert
        _users.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task ActivateAsync_UserNotFound_Throws()
    {
        // Arrange
        var userId = Guid.NewGuid();
        _users.Setup(r => r.GetByIdAsync(userId, It.IsAny<CancellationToken>())).ReturnsAsync((User?)null);

        // Act
        var act = () => CreateSut().ActivateAsync(userId);

        // Assert
        await act.Should().ThrowAsync<KeyNotFoundException>();
    }

    [Fact]
    public async Task PromoteAsync_Employee_SetsAdminRoleAndSaves()
    {
        // Arrange
        var user = new User { Role = UserRole.Employee };
        _users.Setup(r => r.GetByIdAsync(user.Id, It.IsAny<CancellationToken>())).ReturnsAsync(user);

        // Act
        await CreateSut().PromoteAsync(user.Id);

        // Assert
        user.Role.Should().Be(UserRole.Admin);
        _users.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task PromoteAsync_AlreadyAdmin_IsIdempotentAndDoesNotSave()
    {
        // Arrange
        var user = new User { Role = UserRole.Admin };
        _users.Setup(r => r.GetByIdAsync(user.Id, It.IsAny<CancellationToken>())).ReturnsAsync(user);

        // Act
        await CreateSut().PromoteAsync(user.Id);

        // Assert
        _users.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task PromoteAsync_UserNotFound_Throws()
    {
        // Arrange
        var userId = Guid.NewGuid();
        _users.Setup(r => r.GetByIdAsync(userId, It.IsAny<CancellationToken>())).ReturnsAsync((User?)null);

        // Act
        var act = () => CreateSut().PromoteAsync(userId);

        // Assert
        await act.Should().ThrowAsync<KeyNotFoundException>();
    }

    [Fact]
    public async Task DemoteAsync_AdminWithAnotherActiveAdmin_SetsEmployeeRoleAndSaves()
    {
        // Arrange
        var admin = new User { Role = UserRole.Admin, IsActive = true };
        var otherAdmin = new User { Role = UserRole.Admin, IsActive = true };
        _users.Setup(r => r.GetByIdAsync(admin.Id, It.IsAny<CancellationToken>())).ReturnsAsync(admin);
        _users.Setup(r => r.GetAllAsync(It.IsAny<CancellationToken>())).ReturnsAsync([admin, otherAdmin]);

        // Act
        await CreateSut().DemoteAsync(admin.Id);

        // Assert
        admin.Role.Should().Be(UserRole.Employee);
        _users.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task DemoteAsync_LastActiveAdmin_ThrowsAndDoesNotSave()
    {
        // Arrange
        var admin = new User { Role = UserRole.Admin, IsActive = true };
        _users.Setup(r => r.GetByIdAsync(admin.Id, It.IsAny<CancellationToken>())).ReturnsAsync(admin);
        _users.Setup(r => r.GetAllAsync(It.IsAny<CancellationToken>())).ReturnsAsync([admin]);

        // Act
        var act = () => CreateSut().DemoteAsync(admin.Id);

        // Assert
        await act.Should().ThrowAsync<InvalidOperationException>();
        admin.Role.Should().Be(UserRole.Admin);
        _users.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task DemoteAsync_OnlyOtherAdminIsInactive_StillThrows()
    {
        // Arrange — an inactive Admin can't log in, so it doesn't count as "still available"
        // to administer the system either.
        var admin = new User { Role = UserRole.Admin, IsActive = true };
        var inactiveAdmin = new User { Role = UserRole.Admin, IsActive = false };
        _users.Setup(r => r.GetByIdAsync(admin.Id, It.IsAny<CancellationToken>())).ReturnsAsync(admin);
        _users.Setup(r => r.GetAllAsync(It.IsAny<CancellationToken>())).ReturnsAsync([admin, inactiveAdmin]);

        // Act
        var act = () => CreateSut().DemoteAsync(admin.Id);

        // Assert
        await act.Should().ThrowAsync<InvalidOperationException>();
    }

    [Fact]
    public async Task DemoteAsync_AlreadyEmployee_IsIdempotentAndDoesNotSave()
    {
        // Arrange
        var user = new User { Role = UserRole.Employee };
        _users.Setup(r => r.GetByIdAsync(user.Id, It.IsAny<CancellationToken>())).ReturnsAsync(user);

        // Act
        await CreateSut().DemoteAsync(user.Id);

        // Assert
        _users.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task DemoteAsync_UserNotFound_Throws()
    {
        // Arrange
        var userId = Guid.NewGuid();
        _users.Setup(r => r.GetByIdAsync(userId, It.IsAny<CancellationToken>())).ReturnsAsync((User?)null);

        // Act
        var act = () => CreateSut().DemoteAsync(userId);

        // Assert
        await act.Should().ThrowAsync<KeyNotFoundException>();
    }
}
