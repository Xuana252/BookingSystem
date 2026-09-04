using Booking.Application.DTOs;
using Booking.Application.Services;
using Booking.Domain.Entities;
using Booking.Domain.Events;
using Booking.Domain.Interfaces;
using FluentAssertions;
using Microsoft.Extensions.Logging;
using Moq;

namespace Booking.UnitTests.Services;

public class ReservationServiceTests
{
    private readonly Mock<IReservationRepository> _reservations = new();
    private readonly Mock<IUserRepository> _users = new();
    private readonly Mock<IEventPublisher> _eventPublisher = new();
    private readonly Mock<IBookingRuleEngine> _ruleEngine = new();
    private readonly Mock<ICorrelationIdAccessor> _correlationIdAccessor = new();
    private readonly Mock<IRealtimeNotifier> _realtimeNotifier = new();
    private readonly Mock<ILogger<ReservationService>> _logger = new();

    private const string TestCorrelationId = "test-correlation-id";
    private const string TestUsername = "alice";

    // CreateAsync/CancelAsync fire the event publish without awaiting it (see
    // ReservationService.PublishInBackground) — the PublishAsync Times.Once assertions below
    // stay deterministic only because Moq returns an already-completed Task for an unconfigured
    // async mock, and awaiting an already-completed Task never actually yields control (the
    // compiler's async state machine just continues synchronously). If _eventPublisher ever gets
    // an explicit setup that returns a genuinely pending Task (e.g. via TaskCompletionSource or
    // Task.Delay), these assertions would need an explicit await/poll instead.

    public ReservationServiceTests()
    {
        _reservations.Setup(r => r.GetByRoomIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<Reservation>());
        _correlationIdAccessor.Setup(c => c.CorrelationId).Returns(TestCorrelationId);
        _users.Setup(u => u.GetByIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Guid id, CancellationToken _) => new User { Id = id, Username = TestUsername });
        _users.Setup(u => u.GetAllAsync(It.IsAny<CancellationToken>())).ReturnsAsync(new List<User>());
    }

    private ReservationService CreateSut() => new(
        _reservations.Object, _users.Object, _eventPublisher.Object, _ruleEngine.Object, _correlationIdAccessor.Object,
        _realtimeNotifier.Object, _logger.Object);

    private static CreateReservationRequest ValidRequest() => new(
        RoomId: Guid.NewGuid(),
        StartTime: new DateTime(2026, 8, 20, 9, 0, 0, DateTimeKind.Utc),
        EndTime: new DateTime(2026, 8, 20, 10, 0, 0, DateTimeKind.Utc));

    [Fact]
    public async Task GetAllAsync_ProjectsReservationsWithBookerUsername()
    {
        // Arrange
        var user = new User { Username = TestUsername };
        var reservation = new Reservation { UserId = user.Id };
        _reservations.Setup(r => r.GetAllAsync(It.IsAny<CancellationToken>())).ReturnsAsync([reservation]);
        _users.Setup(u => u.GetAllAsync(It.IsAny<CancellationToken>())).ReturnsAsync([user]);

        // Act
        var result = await CreateSut().GetAllAsync();

        // Assert
        var response = result.Should().ContainSingle().Subject;
        response.Id.Should().Be(reservation.Id);
        response.RoomId.Should().Be(reservation.RoomId);
        response.UserId.Should().Be(user.Id);
        response.Username.Should().Be(TestUsername);
    }

    [Fact]
    public async Task GetAllAsync_ReservationsUserNoLongerFound_UsernameFallsBackToUnknown()
    {
        // Arrange
        var reservation = new Reservation { UserId = Guid.NewGuid() };
        _reservations.Setup(r => r.GetAllAsync(It.IsAny<CancellationToken>())).ReturnsAsync([reservation]);
        _users.Setup(u => u.GetAllAsync(It.IsAny<CancellationToken>())).ReturnsAsync([]);

        // Act
        var result = await CreateSut().GetAllAsync();

        // Assert
        result.Should().ContainSingle().Which.Username.Should().Be("Unknown");
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
        reservation.Username.Should().Be(TestUsername);

        _reservations.Verify(r => r.AddAsync(
            It.Is<Reservation>(x => x.Id == reservation.Id && x.RoomId == request.RoomId && x.UserId == userId),
            It.IsAny<CancellationToken>()), Times.Once);
        _reservations.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
        _eventPublisher.Verify(p => p.PublishAsync(
            It.Is<EventEnvelope>(e => e.EventType == EventTypes.ReservationCreated && e.Source == "Booking.Api"
                && e.CorrelationId == TestCorrelationId),
            It.IsAny<CancellationToken>()), Times.Once);
        _ruleEngine.Verify(e => e.Validate(
            It.Is<Reservation>(x => x.RoomId == request.RoomId),
            It.IsAny<IReadOnlyList<Reservation>>()), Times.Once);
        _realtimeNotifier.Verify(n => n.RoomAvailabilityChangedAsync(request.RoomId, It.IsAny<CancellationToken>()), Times.Once);
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

    [Fact]
    public async Task CancelAsync_Owner_CancelsPersistsPublishesAndBroadcasts()
    {
        // Arrange
        var reservation = new Reservation { UserId = Guid.NewGuid(), RoomId = Guid.NewGuid(), Status = ReservationStatus.Confirmed };
        _reservations.Setup(r => r.GetByIdAsync(reservation.Id, It.IsAny<CancellationToken>())).ReturnsAsync(reservation);

        // Act
        await CreateSut().CancelAsync(reservation.Id, reservation.UserId);

        // Assert
        reservation.Status.Should().Be(ReservationStatus.Cancelled);
        _reservations.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
        _eventPublisher.Verify(p => p.PublishAsync(
            It.Is<EventEnvelope>(e => e.EventType == EventTypes.ReservationCancelled), It.IsAny<CancellationToken>()), Times.Once);
        _realtimeNotifier.Verify(n => n.RoomAvailabilityChangedAsync(reservation.RoomId, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task CancelAsync_ReservationNotFound_ThrowsAndDoesNotPublish()
    {
        // Arrange
        var reservationId = Guid.NewGuid();
        _reservations.Setup(r => r.GetByIdAsync(reservationId, It.IsAny<CancellationToken>())).ReturnsAsync((Reservation?)null);

        // Act
        var act = () => CreateSut().CancelAsync(reservationId, Guid.NewGuid());

        // Assert
        await act.Should().ThrowAsync<KeyNotFoundException>();
        _eventPublisher.Verify(p => p.PublishAsync(It.IsAny<EventEnvelope>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task CancelAsync_NotOwner_ThrowsAndDoesNotPersistOrPublish()
    {
        // Arrange
        var reservation = new Reservation { UserId = Guid.NewGuid(), Status = ReservationStatus.Confirmed };
        _reservations.Setup(r => r.GetByIdAsync(reservation.Id, It.IsAny<CancellationToken>())).ReturnsAsync(reservation);

        // Act
        var act = () => CreateSut().CancelAsync(reservation.Id, Guid.NewGuid());

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>();
        _reservations.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Never);
        _eventPublisher.Verify(p => p.PublishAsync(It.IsAny<EventEnvelope>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task CancelAsync_AlreadyCancelled_IsIdempotentAndDoesNotRepublish()
    {
        // Arrange
        var reservation = new Reservation { UserId = Guid.NewGuid(), Status = ReservationStatus.Cancelled };
        _reservations.Setup(r => r.GetByIdAsync(reservation.Id, It.IsAny<CancellationToken>())).ReturnsAsync(reservation);

        // Act
        await CreateSut().CancelAsync(reservation.Id, reservation.UserId);

        // Assert
        _reservations.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Never);
        _eventPublisher.Verify(p => p.PublishAsync(It.IsAny<EventEnvelope>(), It.IsAny<CancellationToken>()), Times.Never);
        _realtimeNotifier.Verify(n => n.RoomAvailabilityChangedAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Never);
    }
}
