using Booking.Application.DTOs;
using Booking.Application.Services;
using Booking.Domain.Entities;
using Booking.Domain.Interfaces;
using FluentAssertions;
using Moq;

namespace Booking.UnitTests.Services;

public class RoomServiceTests
{
    private readonly Mock<IRoomRepository> _rooms = new();

    private RoomService CreateSut() => new(_rooms.Object);

    [Fact]
    public async Task GetAllAsync_ExcludesInactiveRooms()
    {
        // Arrange
        var active = new Room { Name = "Conference A", IsActive = true };
        var inactive = new Room { Name = "Conference B (under maintenance)", IsActive = false };
        _rooms.Setup(r => r.GetAllAsync(It.IsAny<CancellationToken>())).ReturnsAsync([active, inactive]);

        // Act
        var result = await CreateSut().GetAllAsync();

        // Assert
        result.Should().ContainSingle().Which.Should().Be(active);
    }

    [Fact]
    public async Task GetAllIncludingInactiveAsync_ReturnsEveryRoomRegardlessOfActiveStatus()
    {
        // Arrange
        var active = new Room { Name = "Conference A", IsActive = true };
        var inactive = new Room { Name = "Conference B (under maintenance)", IsActive = false };
        _rooms.Setup(r => r.GetAllAsync(It.IsAny<CancellationToken>())).ReturnsAsync([active, inactive]);

        // Act
        var result = await CreateSut().GetAllIncludingInactiveAsync();

        // Assert
        result.Should().BeEquivalentTo([active, inactive]);
    }

    [Fact]
    public async Task DeactivateAsync_ActiveRoom_SetsInactiveAndSaves()
    {
        // Arrange
        var room = new Room { IsActive = true };
        _rooms.Setup(r => r.GetByIdAsync(room.Id, It.IsAny<CancellationToken>())).ReturnsAsync(room);

        // Act
        await CreateSut().DeactivateAsync(room.Id);

        // Assert
        room.IsActive.Should().BeFalse();
        _rooms.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task DeactivateAsync_AlreadyInactive_IsIdempotentAndDoesNotSave()
    {
        // Arrange
        var room = new Room { IsActive = false };
        _rooms.Setup(r => r.GetByIdAsync(room.Id, It.IsAny<CancellationToken>())).ReturnsAsync(room);

        // Act
        await CreateSut().DeactivateAsync(room.Id);

        // Assert
        _rooms.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task DeactivateAsync_RoomNotFound_Throws()
    {
        // Arrange
        var roomId = Guid.NewGuid();
        _rooms.Setup(r => r.GetByIdAsync(roomId, It.IsAny<CancellationToken>())).ReturnsAsync((Room?)null);

        // Act
        var act = () => CreateSut().DeactivateAsync(roomId);

        // Assert
        await act.Should().ThrowAsync<KeyNotFoundException>();
    }

    [Fact]
    public async Task ActivateAsync_InactiveRoom_SetsActiveAndSaves()
    {
        // Arrange
        var room = new Room { IsActive = false };
        _rooms.Setup(r => r.GetByIdAsync(room.Id, It.IsAny<CancellationToken>())).ReturnsAsync(room);

        // Act
        await CreateSut().ActivateAsync(room.Id);

        // Assert
        room.IsActive.Should().BeTrue();
        _rooms.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task ActivateAsync_AlreadyActive_IsIdempotentAndDoesNotSave()
    {
        // Arrange
        var room = new Room { IsActive = true };
        _rooms.Setup(r => r.GetByIdAsync(room.Id, It.IsAny<CancellationToken>())).ReturnsAsync(room);

        // Act
        await CreateSut().ActivateAsync(room.Id);

        // Assert
        _rooms.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task ActivateAsync_RoomNotFound_Throws()
    {
        // Arrange
        var roomId = Guid.NewGuid();
        _rooms.Setup(r => r.GetByIdAsync(roomId, It.IsAny<CancellationToken>())).ReturnsAsync((Room?)null);

        // Act
        var act = () => CreateSut().ActivateAsync(roomId);

        // Assert
        await act.Should().ThrowAsync<KeyNotFoundException>();
    }

    [Fact]
    public async Task CreateAsync_PersistsRoomWithRequestedFields()
    {
        // Arrange
        var request = new CreateRoomRequest("Conference A", "Floor 3", 8);

        // Act
        var room = await CreateSut().CreateAsync(request);

        // Assert
        room.Name.Should().Be(request.Name);
        room.Location.Should().Be(request.Location);
        room.Capacity.Should().Be(request.Capacity);
        _rooms.Verify(r => r.AddAsync(It.Is<Room>(x => x == room), It.IsAny<CancellationToken>()), Times.Once);
        _rooms.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }
}
