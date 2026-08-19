using System.Text.Json;
using Booking.Domain.Entities;
using Booking.Domain.Interfaces;
using Booking.Infrastructure.Persistence.Repositories;
using FluentAssertions;
using Moq;
using StackExchange.Redis;

namespace Booking.UnitTests.Persistence;

public class CachedReservationRepositoryTests
{
    private readonly Mock<IReservationRepository> _inner = new();
    private readonly Mock<IConnectionMultiplexer> _redis = new();
    private readonly Mock<IDatabase> _database = new();

    public CachedReservationRepositoryTests()
    {
        _redis.Setup(r => r.GetDatabase(It.IsAny<int>(), It.IsAny<object>())).Returns(_database.Object);
    }

    private CachedReservationRepository CreateSut() => new(_inner.Object, _redis.Object);

    [Fact]
    public async Task GetByRoomIdAsync_CacheMiss_QueriesInnerAndPopulatesCache()
    {
        // Arrange
        var roomId = Guid.NewGuid();
        var expected = new List<Reservation> { new() { RoomId = roomId } };
        _database.Setup(d => d.StringGetAsync(It.IsAny<RedisKey>(), It.IsAny<CommandFlags>()))
            .ReturnsAsync(RedisValue.Null);
        _inner.Setup(r => r.GetByRoomIdAsync(roomId, It.IsAny<CancellationToken>())).ReturnsAsync(expected);

        // Act
        var result = await CreateSut().GetByRoomIdAsync(roomId);

        // Assert
        result.Should().BeEquivalentTo(expected);
        _inner.Verify(r => r.GetByRoomIdAsync(roomId, It.IsAny<CancellationToken>()), Times.Once);
        // StackExchange.Redis has several StringSetAsync overloads (TimeSpan? vs. Expiry) whose
        // exact resolution can shift between versions — assert by method name instead of pinning
        // to one overload's full parameter list.
        _database.Invocations.Should().Contain(i =>
            i.Method.Name == nameof(IDatabase.StringSetAsync) && (RedisKey)i.Arguments[0]! == $"room-availability:{roomId}");
    }

    [Fact]
    public async Task GetByRoomIdAsync_CacheHit_ReturnsCachedValueWithoutQueryingInner()
    {
        // Arrange
        var roomId = Guid.NewGuid();
        var cached = new List<Reservation> { new() { RoomId = roomId } };
        _database.Setup(d => d.StringGetAsync(It.IsAny<RedisKey>(), It.IsAny<CommandFlags>()))
            .ReturnsAsync(new RedisValue(JsonSerializer.Serialize(cached)));

        // Act
        var result = await CreateSut().GetByRoomIdAsync(roomId);

        // Assert
        result.Should().BeEquivalentTo(cached);
        _inner.Verify(r => r.GetByRoomIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task SaveChangesAsync_AfterAddForRoom_InvalidatesThatRoomsCacheKey()
    {
        // Arrange
        var reservation = new Reservation { RoomId = Guid.NewGuid() };
        var sut = CreateSut();
        await sut.AddAsync(reservation);

        // Act
        await sut.SaveChangesAsync();

        // Assert
        _inner.Verify(r => r.AddAsync(reservation, It.IsAny<CancellationToken>()), Times.Once);
        _inner.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
        _database.Verify(d => d.KeyDeleteAsync($"room-availability:{reservation.RoomId}", It.IsAny<CommandFlags>()), Times.Once);
    }

    [Fact]
    public async Task SaveChangesAsync_NoPendingAdds_DoesNotTouchCache()
    {
        // Arrange
        var sut = CreateSut();

        // Act
        await sut.SaveChangesAsync();

        // Assert
        _database.Verify(d => d.KeyDeleteAsync(It.IsAny<RedisKey>(), It.IsAny<CommandFlags>()), Times.Never);
    }

    [Fact]
    public async Task GetUpcomingAsync_AlwaysDelegatesToInnerWithoutCaching()
    {
        // Arrange
        var from = DateTime.UtcNow;
        var to = from.AddMinutes(30);
        _inner.Setup(r => r.GetUpcomingAsync(from, to, It.IsAny<CancellationToken>())).ReturnsAsync([]);

        // Act
        await CreateSut().GetUpcomingAsync(from, to);

        // Assert
        _inner.Verify(r => r.GetUpcomingAsync(from, to, It.IsAny<CancellationToken>()), Times.Once);
        _database.Verify(d => d.StringGetAsync(It.IsAny<RedisKey>(), It.IsAny<CommandFlags>()), Times.Never);
    }
}
