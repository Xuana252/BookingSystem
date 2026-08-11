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
    public async Task GetAllAsync_DelegatesToRepository()
    {
        var expected = new List<Room> { new() { Name = "Conference A" } };
        _rooms.Setup(r => r.GetAllAsync(It.IsAny<CancellationToken>())).ReturnsAsync(expected);

        var result = await CreateSut().GetAllAsync();

        result.Should().BeEquivalentTo(expected);
    }

    [Fact]
    public async Task CreateAsync_PersistsRoomWithRequestedFields()
    {
        var request = new CreateRoomRequest("Conference A", "Floor 3", 8);

        var room = await CreateSut().CreateAsync(request);

        room.Name.Should().Be(request.Name);
        room.Location.Should().Be(request.Location);
        room.Capacity.Should().Be(request.Capacity);
        _rooms.Verify(r => r.AddAsync(It.Is<Room>(x => x == room), It.IsAny<CancellationToken>()), Times.Once);
        _rooms.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }
}
