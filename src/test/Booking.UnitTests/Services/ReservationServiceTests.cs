using Booking.Application.DTOs;
using Booking.Application.Services;
using Booking.Domain.Entities;
using Booking.Domain.Events;
using Booking.Domain.Interfaces;
using FluentAssertions;
using Moq;

namespace Booking.UnitTests.Services;

public class ReservationServiceTests
{
    private readonly Mock<IReservationRepository> _reservations = new();
    private readonly Mock<IEventPublisher> _eventPublisher = new();
    private readonly Mock<IBookingRuleEngine> _ruleEngine = new();

    public ReservationServiceTests()
    {
        _reservations.Setup(r => r.GetByRoomIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<Reservation>());
    }

    private ReservationService CreateSut() => new(_reservations.Object, _eventPublisher.Object, _ruleEngine.Object);

    private static CreateReservationRequest ValidRequest() => new(
        RoomId: Guid.NewGuid(),
        StartTime: new DateTime(2026, 8, 20, 9, 0, 0, DateTimeKind.Utc),
        EndTime: new DateTime(2026, 8, 20, 10, 0, 0, DateTimeKind.Utc));

    [Fact]
    public async Task GetAllAsync_DelegatesToRepository()
    {
        // Arrange
        var expected = new List<Reservation> { new() };
        _reservations.Setup(r => r.GetAllAsync(It.IsAny<CancellationToken>())).ReturnsAsync(expected);

        // Act
        var result = await CreateSut().GetAllAsync();

        // Assert
        result.Should().BeEquivalentTo(expected);
    }

    [Fact]
    public async Task CreateAsync_ValidRange_PersistsAndPublishesReservationCreated()
    {
        // Arrange
        var request = ValidRequest();
        var userId = Guid.NewGuid();

        // Act
        var reservation = await CreateSut().CreateAsync(request, userId);

        // Assert
        reservation.RoomId.Should().Be(request.RoomId);
        reservation.UserId.Should().Be(userId);
        reservation.StartTime.Should().Be(request.StartTime);
        reservation.EndTime.Should().Be(request.EndTime);

        _reservations.Verify(r => r.AddAsync(It.Is<Reservation>(x => x == reservation), It.IsAny<CancellationToken>()), Times.Once);
        _reservations.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
        _eventPublisher.Verify(p => p.PublishAsync(
            It.Is<EventEnvelope>(e => e.EventType == EventTypes.ReservationCreated && e.Source == "Booking.Api"),
            It.IsAny<CancellationToken>()), Times.Once);
        _ruleEngine.Verify(e => e.Validate(
            It.Is<Reservation>(x => x.RoomId == request.RoomId),
            It.IsAny<IReadOnlyList<Reservation>>()), Times.Once);
    }

    [Fact]
    public async Task CreateAsync_EndBeforeStart_ThrowsAndDoesNotPersistOrPublish()
    {
        // Arrange
        var baseRequest = ValidRequest();
        var request = baseRequest with { EndTime = baseRequest.StartTime.AddHours(-1) };

        // Act
        var act = () => CreateSut().CreateAsync(request, Guid.NewGuid());

        // Assert
        await act.Should().ThrowAsync<ArgumentException>();
        _reservations.Verify(r => r.AddAsync(It.IsAny<Reservation>(), It.IsAny<CancellationToken>()), Times.Never);
        _reservations.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Never);
        _eventPublisher.Verify(p => p.PublishAsync(It.IsAny<EventEnvelope>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task CreateAsync_RuleEngineRejects_ThrowsAndDoesNotPersistOrPublish()
    {
        // Arrange
        var request = ValidRequest();
        _ruleEngine.Setup(e => e.Validate(It.IsAny<Reservation>(), It.IsAny<IReadOnlyList<Reservation>>()))
            .Throws(new ArgumentException("Room is already booked for an overlapping time range."));

        // Act
        var act = () => CreateSut().CreateAsync(request, Guid.NewGuid());

        // Assert
        await act.Should().ThrowAsync<ArgumentException>();
        _reservations.Verify(r => r.AddAsync(It.IsAny<Reservation>(), It.IsAny<CancellationToken>()), Times.Never);
        _reservations.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Never);
        _eventPublisher.Verify(p => p.PublishAsync(It.IsAny<EventEnvelope>(), It.IsAny<CancellationToken>()), Times.Never);
    }
}
