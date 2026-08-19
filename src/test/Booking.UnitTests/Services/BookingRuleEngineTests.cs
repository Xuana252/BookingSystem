using Booking.Application.Services;
using Booking.Domain.Configuration;
using Booking.Domain.Entities;
using FluentAssertions;

namespace Booking.UnitTests.Services;

public class BookingRuleEngineTests
{
    private static readonly ReservationRuleSettings DefaultSettings = new()
    {
        BusinessHoursStart = TimeSpan.FromHours(8),
        BusinessHoursEnd = TimeSpan.FromHours(18),
        MaxDurationHours = 4
    };

    private static BookingRuleEngine CreateSut(ReservationRuleSettings? settings = null) => new(settings ?? DefaultSettings);

    private static Reservation Candidate(DateTime start, DateTime end) => new()
    {
        RoomId = Guid.NewGuid(),
        StartTime = start,
        EndTime = end
    };

    private static Reservation Existing(Guid roomId, DateTime start, DateTime end, ReservationStatus status = ReservationStatus.Confirmed) => new()
    {
        RoomId = roomId,
        StartTime = start,
        EndTime = end,
        Status = status
    };

    [Fact]
    public void Validate_WithinBusinessHoursNoOverlapUnderMaxDuration_DoesNotThrow()
    {
        // Arrange
        var candidate = Candidate(
            new DateTime(2026, 8, 20, 9, 0, 0, DateTimeKind.Utc),
            new DateTime(2026, 8, 20, 10, 0, 0, DateTimeKind.Utc));

        // Act
        var act = () => CreateSut().Validate(candidate, []);

        // Assert
        act.Should().NotThrow();
    }

    [Fact]
    public void Validate_StartsBeforeBusinessHours_Throws()
    {
        // Arrange
        var candidate = Candidate(
            new DateTime(2026, 8, 20, 7, 0, 0, DateTimeKind.Utc),
            new DateTime(2026, 8, 20, 9, 0, 0, DateTimeKind.Utc));

        // Act
        var act = () => CreateSut().Validate(candidate, []);

        // Assert
        act.Should().Throw<ArgumentException>().WithMessage("*business hours*");
    }

    [Fact]
    public void Validate_EndsAfterBusinessHours_Throws()
    {
        // Arrange
        var candidate = Candidate(
            new DateTime(2026, 8, 20, 17, 0, 0, DateTimeKind.Utc),
            new DateTime(2026, 8, 20, 19, 0, 0, DateTimeKind.Utc));

        // Act
        var act = () => CreateSut().Validate(candidate, []);

        // Assert
        act.Should().Throw<ArgumentException>().WithMessage("*business hours*");
    }

    [Fact]
    public void Validate_SpansMultipleDays_Throws()
    {
        // Arrange
        var candidate = Candidate(
            new DateTime(2026, 8, 20, 9, 0, 0, DateTimeKind.Utc),
            new DateTime(2026, 8, 21, 10, 0, 0, DateTimeKind.Utc));

        // Act
        var act = () => CreateSut().Validate(candidate, []);

        // Assert
        act.Should().Throw<ArgumentException>().WithMessage("*business hours*");
    }

    [Fact]
    public void Validate_ExactlyAtBusinessHoursBoundary_DoesNotThrow()
    {
        // Arrange
        var candidate = Candidate(
            new DateTime(2026, 8, 20, 8, 0, 0, DateTimeKind.Utc),
            new DateTime(2026, 8, 20, 12, 0, 0, DateTimeKind.Utc));

        // Act
        var act = () => CreateSut().Validate(candidate, []);

        // Assert
        act.Should().NotThrow();
    }

    [Fact]
    public void Validate_ExceedsMaxDuration_Throws()
    {
        // Arrange
        var candidate = Candidate(
            new DateTime(2026, 8, 20, 9, 0, 0, DateTimeKind.Utc),
            new DateTime(2026, 8, 20, 13, 30, 0, DateTimeKind.Utc));

        // Act
        var act = () => CreateSut().Validate(candidate, []);

        // Assert
        act.Should().Throw<ArgumentException>().WithMessage("*duration*");
    }

    [Fact]
    public void Validate_ExactlyAtMaxDuration_DoesNotThrow()
    {
        // Arrange
        var candidate = Candidate(
            new DateTime(2026, 8, 20, 9, 0, 0, DateTimeKind.Utc),
            new DateTime(2026, 8, 20, 13, 0, 0, DateTimeKind.Utc));

        // Act
        var act = () => CreateSut().Validate(candidate, []);

        // Assert
        act.Should().NotThrow();
    }

    [Fact]
    public void Validate_OverlapsExistingConfirmedReservation_Throws()
    {
        // Arrange
        var candidate = Candidate(
            new DateTime(2026, 8, 20, 9, 0, 0, DateTimeKind.Utc),
            new DateTime(2026, 8, 20, 11, 0, 0, DateTimeKind.Utc));
        var existing = Existing(
            candidate.RoomId,
            new DateTime(2026, 8, 20, 10, 0, 0, DateTimeKind.Utc),
            new DateTime(2026, 8, 20, 12, 0, 0, DateTimeKind.Utc));

        // Act
        var act = () => CreateSut().Validate(candidate, [existing]);

        // Assert
        act.Should().Throw<ArgumentException>().WithMessage("*overlap*");
    }

    [Fact]
    public void Validate_BackToBackReservations_DoesNotThrow()
    {
        // Arrange
        var candidate = Candidate(
            new DateTime(2026, 8, 20, 10, 0, 0, DateTimeKind.Utc),
            new DateTime(2026, 8, 20, 11, 0, 0, DateTimeKind.Utc));
        var existing = Existing(
            candidate.RoomId,
            new DateTime(2026, 8, 20, 9, 0, 0, DateTimeKind.Utc),
            new DateTime(2026, 8, 20, 10, 0, 0, DateTimeKind.Utc));

        // Act
        var act = () => CreateSut().Validate(candidate, [existing]);

        // Assert
        act.Should().NotThrow();
    }

    [Fact]
    public void Validate_OverlapsCancelledReservation_DoesNotThrow()
    {
        // Arrange
        var candidate = Candidate(
            new DateTime(2026, 8, 20, 9, 0, 0, DateTimeKind.Utc),
            new DateTime(2026, 8, 20, 11, 0, 0, DateTimeKind.Utc));
        var existing = Existing(
            candidate.RoomId,
            new DateTime(2026, 8, 20, 10, 0, 0, DateTimeKind.Utc),
            new DateTime(2026, 8, 20, 12, 0, 0, DateTimeKind.Utc),
            ReservationStatus.Cancelled);

        // Act
        var act = () => CreateSut().Validate(candidate, [existing]);

        // Assert
        act.Should().NotThrow();
    }

    [Fact]
    public void Validate_ExistingListContainsCandidateItself_IsExcludedFromOverlapCheck()
    {
        // Arrange
        var candidate = Candidate(
            new DateTime(2026, 8, 20, 9, 0, 0, DateTimeKind.Utc),
            new DateTime(2026, 8, 20, 11, 0, 0, DateTimeKind.Utc));

        // Act
        var act = () => CreateSut().Validate(candidate, [candidate]);

        // Assert
        act.Should().NotThrow();
    }

    [Fact]
    public void Validate_DifferentRoomOverlap_DoesNotThrow()
    {
        // Arrange
        var candidate = Candidate(
            new DateTime(2026, 8, 20, 9, 0, 0, DateTimeKind.Utc),
            new DateTime(2026, 8, 20, 11, 0, 0, DateTimeKind.Utc));
        var existingInOtherRoom = Existing(
            Guid.NewGuid(),
            new DateTime(2026, 8, 20, 9, 0, 0, DateTimeKind.Utc),
            new DateTime(2026, 8, 20, 11, 0, 0, DateTimeKind.Utc));

        // Act
        var act = () => CreateSut().Validate(candidate, [existingInOtherRoom]);

        // Assert
        act.Should().NotThrow();
    }
}
