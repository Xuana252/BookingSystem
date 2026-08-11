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

    private ReservationService CreateSut() => new(_reservations.Object, _eventPublisher.Object);

    private static CreateReservationRequest ValidRequest() => new(
        RoomId: Guid.NewGuid(),
        UserId: Guid.NewGuid(),
        StartTime: new DateTime(2026, 8, 20, 9, 0, 0, DateTimeKind.Utc),
        EndTime: new DateTime(2026, 8, 20, 10, 0, 0, DateTimeKind.Utc));

    [Fact]
    public async Task GetAllAsync_DelegatesToRepository()
    {
        var expected = new List<Reservation> { new() };
        _reservations.Setup(r => r.GetAllAsync(It.IsAny<CancellationToken>())).ReturnsAsync(expected);

        var result = await CreateSut().GetAllAsync();

        result.Should().BeEquivalentTo(expected);
    }

    [Fact]
    public async Task CreateAsync_ValidRange_PersistsAndPublishesReservationCreated()
    {
        var request = ValidRequest();

        var reservation = await CreateSut().CreateAsync(request);

        reservation.RoomId.Should().Be(request.RoomId);
        reservation.UserId.Should().Be(request.UserId);
        reservation.StartTime.Should().Be(request.StartTime);
        reservation.EndTime.Should().Be(request.EndTime);

        _reservations.Verify(r => r.AddAsync(It.Is<Reservation>(x => x == reservation), It.IsAny<CancellationToken>()), Times.Once);
        _reservations.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
        _eventPublisher.Verify(p => p.PublishAsync(
            It.Is<EventEnvelope>(e => e.EventType == EventTypes.ReservationCreated && e.Source == "Booking.Api"),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task CreateAsync_EndBeforeStart_ThrowsAndDoesNotPersistOrPublish()
    {
        var baseRequest = ValidRequest();
        var request = baseRequest with { EndTime = baseRequest.StartTime.AddHours(-1) };

        var act = () => CreateSut().CreateAsync(request);

        await act.Should().ThrowAsync<ArgumentException>();
        _reservations.Verify(r => r.AddAsync(It.IsAny<Reservation>(), It.IsAny<CancellationToken>()), Times.Never);
        _reservations.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Never);
        _eventPublisher.Verify(p => p.PublishAsync(It.IsAny<EventEnvelope>(), It.IsAny<CancellationToken>()), Times.Never);
    }
}
