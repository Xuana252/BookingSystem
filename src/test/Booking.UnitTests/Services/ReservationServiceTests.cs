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
    private readonly Mock<IRoomRepository> _rooms = new();
    private readonly Mock<IReservationAttendeeRepository> _attendees = new();
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

        // Generously large capacity by default, so tests not specifically about capacity/room
        // state don't have to think about it — CreateAsync_RoomNotFound_* and
        // CreateAsync_InactiveRoom_* below override this per-test with a more specific setup.
        _rooms.Setup(r => r.GetByIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Room { IsActive = true, Capacity = 100 });

        _attendees.Setup(a => a.GetForReservationsAsync(It.IsAny<IEnumerable<Guid>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<ReservationAttendee>());
    }

    private ReservationService CreateSut() => new(
        _reservations.Object, _users.Object, _rooms.Object, _attendees.Object, _eventPublisher.Object, _ruleEngine.Object,
        _correlationIdAccessor.Object, _realtimeNotifier.Object, _logger.Object);

    private static CreateReservationRequest ValidRequest(IReadOnlyList<Guid>? attendeeUserIds = null) => new(
        RoomId: Guid.NewGuid(),
        StartTime: new DateTime(2026, 8, 20, 9, 0, 0, DateTimeKind.Utc),
        EndTime: new DateTime(2026, 8, 20, 10, 0, 0, DateTimeKind.Utc),
        AttendeeUserIds: attendeeUserIds);

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
        response.Attendees.Should().BeEmpty();
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
    public async Task GetAllAsync_ResolvesAttendeesInOneBulkQueryNotOnePerReservation()
    {
        // Arrange
        var host = new User { Username = "host" };
        var attendee = new User { Username = "attendee" };
        var reservation = new Reservation { UserId = host.Id };
        _reservations.Setup(r => r.GetAllAsync(It.IsAny<CancellationToken>())).ReturnsAsync([reservation]);
        _users.Setup(u => u.GetAllAsync(It.IsAny<CancellationToken>())).ReturnsAsync([host, attendee]);
        _attendees.Setup(a => a.GetForReservationsAsync(It.IsAny<IEnumerable<Guid>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync([new ReservationAttendee { ReservationId = reservation.Id, UserId = attendee.Id }]);

        // Act
        var result = await CreateSut().GetAllAsync();

        // Assert
        result.Should().ContainSingle().Which.Attendees.Should().ContainSingle()
            .Which.Should().BeEquivalentTo(new AttendeeSummary(attendee.Id, "attendee"));
        _attendees.Verify(a => a.GetForReservationsAsync(It.IsAny<IEnumerable<Guid>>(), It.IsAny<CancellationToken>()), Times.Once);
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
        reservation.Attendees.Should().BeEmpty();

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
            It.IsAny<IReadOnlyList<Reservation>>(), It.IsAny<int>(), It.IsAny<int>()), Times.Once);
        _realtimeNotifier.Verify(n => n.RoomAvailabilityChangedAsync(request.RoomId, It.IsAny<CancellationToken>()), Times.Once);
        _attendees.Verify(a => a.AddRangeAsync(It.IsAny<Guid>(), It.IsAny<IEnumerable<Guid>>(), It.IsAny<CancellationToken>()), Times.Never);
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
        _ruleEngine.Setup(e => e.Validate(
                It.IsAny<Reservation>(), It.IsAny<IReadOnlyList<Reservation>>(), It.IsAny<int>(), It.IsAny<int>()))
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
    public async Task CreateAsync_RoomNotFound_ThrowsAndDoesNotPersist()
    {
        // Arrange
        var request = ValidRequest();
        _rooms.Setup(r => r.GetByIdAsync(request.RoomId, It.IsAny<CancellationToken>())).ReturnsAsync((Room?)null);

        // Act
        var act = () => CreateSut().CreateAsync(request, Guid.NewGuid());

        // Assert
        await act.Should().ThrowAsync<KeyNotFoundException>();
        _reservations.Verify(r => r.AddAsync(It.IsAny<Reservation>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task CreateAsync_InactiveRoom_ThrowsAndDoesNotPersist()
    {
        // Arrange — closes a real pre-existing gap: the deactivate-room feature only ever
        // filtered inactive rooms out of the *list*; nothing stopped a direct create call
        // against one by id until this check was added.
        var request = ValidRequest();
        _rooms.Setup(r => r.GetByIdAsync(request.RoomId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Room { IsActive = false, Capacity = 100 });

        // Act
        var act = () => CreateSut().CreateAsync(request, Guid.NewGuid());

        // Assert
        await act.Should().ThrowAsync<ArgumentException>().WithMessage("*not currently available*");
        _reservations.Verify(r => r.AddAsync(It.IsAny<Reservation>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task CreateAsync_PassesRoomCapacityAndAttendeeCountToRuleEngine()
    {
        // Arrange
        var attendee1 = Guid.NewGuid();
        var attendee2 = Guid.NewGuid();
        var request = ValidRequest([attendee1, attendee2]);
        _rooms.Setup(r => r.GetByIdAsync(request.RoomId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Room { IsActive = true, Capacity = 7 });

        // Act
        await CreateSut().CreateAsync(request, Guid.NewGuid());

        // Assert
        _ruleEngine.Verify(e => e.Validate(
            It.IsAny<Reservation>(), It.IsAny<IReadOnlyList<Reservation>>(), 7, 2), Times.Once);
    }

    [Fact]
    public async Task CreateAsync_WithValidAttendees_PersistsAttendeesAndIncludesThemInResponse()
    {
        // Arrange
        var attendee1 = new User { Username = "bob" };
        var attendee2 = new User { Username = "carol" };
        _users.Setup(u => u.GetByIdAsync(attendee1.Id, It.IsAny<CancellationToken>())).ReturnsAsync(attendee1);
        _users.Setup(u => u.GetByIdAsync(attendee2.Id, It.IsAny<CancellationToken>())).ReturnsAsync(attendee2);
        var request = ValidRequest([attendee1.Id, attendee2.Id]);

        // Act
        var response = await CreateSut().CreateAsync(request, Guid.NewGuid());

        // Assert
        response.Attendees.Should().BeEquivalentTo(
        [
            new AttendeeSummary(attendee1.Id, "bob"),
            new AttendeeSummary(attendee2.Id, "carol")
        ]);
        _attendees.Verify(a => a.AddRangeAsync(
            response.Id, It.Is<IEnumerable<Guid>>(ids => ids.Contains(attendee1.Id) && ids.Contains(attendee2.Id)),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task CreateAsync_AttendeeNotFound_ThrowsAndDoesNotPersist()
    {
        // Arrange
        var unknownAttendeeId = Guid.NewGuid();
        _users.Setup(u => u.GetByIdAsync(unknownAttendeeId, It.IsAny<CancellationToken>())).ReturnsAsync((User?)null);
        var request = ValidRequest([unknownAttendeeId]);

        // Act
        var act = () => CreateSut().CreateAsync(request, Guid.NewGuid());

        // Assert
        await act.Should().ThrowAsync<ArgumentException>();
        _reservations.Verify(r => r.AddAsync(It.IsAny<Reservation>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task CreateAsync_HostListedAsOwnAttendee_IsSilentlyExcludedNotAnError()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var request = ValidRequest([userId]);

        // Act
        var response = await CreateSut().CreateAsync(request, userId);

        // Assert
        response.Attendees.Should().BeEmpty();
        _ruleEngine.Verify(e => e.Validate(
            It.IsAny<Reservation>(), It.IsAny<IReadOnlyList<Reservation>>(), It.IsAny<int>(), 0), Times.Once);
    }

    [Fact]
    public async Task CreateAsync_DuplicateAttendeeIds_AreDeduplicated()
    {
        // Arrange
        var attendee = new User { Username = "bob" };
        _users.Setup(u => u.GetByIdAsync(attendee.Id, It.IsAny<CancellationToken>())).ReturnsAsync(attendee);
        var request = ValidRequest([attendee.Id, attendee.Id]);

        // Act
        var response = await CreateSut().CreateAsync(request, Guid.NewGuid());

        // Assert
        response.Attendees.Should().ContainSingle();
        _ruleEngine.Verify(e => e.Validate(
            It.IsAny<Reservation>(), It.IsAny<IReadOnlyList<Reservation>>(), It.IsAny<int>(), 1), Times.Once);
    }

    [Fact]
    public async Task CancelAsync_Owner_CancelsPersistsPublishesAndBroadcasts()
    {
        // Arrange
        var reservation = new Reservation
        {
            UserId = Guid.NewGuid(),
            RoomId = Guid.NewGuid(),
            Status = ReservationStatus.Confirmed,
            StartTime = DateTime.UtcNow.AddHours(2),
            EndTime = DateTime.UtcNow.AddHours(3)
        };
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
    public async Task CancelAsync_StartTimeInThePast_ThrowsAndDoesNotPersistOrPublish()
    {
        // Arrange
        var reservation = new Reservation
        {
            UserId = Guid.NewGuid(),
            RoomId = Guid.NewGuid(),
            Status = ReservationStatus.Confirmed,
            StartTime = DateTime.UtcNow.AddHours(-1),
            EndTime = DateTime.UtcNow.AddMinutes(-30)
        };
        _reservations.Setup(r => r.GetByIdAsync(reservation.Id, It.IsAny<CancellationToken>())).ReturnsAsync(reservation);

        // Act
        var act = () => CreateSut().CancelAsync(reservation.Id, reservation.UserId);

        // Assert
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("Cannot cancel a reservation that has already started.");
        _reservations.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Never);
        _eventPublisher.Verify(p => p.PublishAsync(It.IsAny<EventEnvelope>(), It.IsAny<CancellationToken>()), Times.Never);
        _realtimeNotifier.Verify(n => n.RoomAvailabilityChangedAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Never);
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
        var reservation = new Reservation
        {
            UserId = Guid.NewGuid(),
            Status = ReservationStatus.Confirmed,
            StartTime = DateTime.UtcNow.AddHours(2),
            EndTime = DateTime.UtcNow.AddHours(3)
        };
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
        var reservation = new Reservation
        {
            UserId = Guid.NewGuid(),
            Status = ReservationStatus.Cancelled,
            StartTime = DateTime.UtcNow.AddHours(2),
            EndTime = DateTime.UtcNow.AddHours(3)
        };
        _reservations.Setup(r => r.GetByIdAsync(reservation.Id, It.IsAny<CancellationToken>())).ReturnsAsync(reservation);

        // Act
        await CreateSut().CancelAsync(reservation.Id, reservation.UserId);

        // Assert
        _reservations.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Never);
        _eventPublisher.Verify(p => p.PublishAsync(It.IsAny<EventEnvelope>(), It.IsAny<CancellationToken>()), Times.Never);
        _realtimeNotifier.Verify(n => n.RoomAvailabilityChangedAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Never);
    }
}
