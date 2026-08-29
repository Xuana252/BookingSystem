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

    // UTC here so every existing test's DateTimeKind.Utc literals keep meaning exactly what they
    // say — the timezone-conversion behavior itself gets its own dedicated tests below.
    private static readonly BusinessSettings DefaultBusinessSettings = new() { TimeZoneId = "UTC" };

    private static BookingRuleEngine CreateSut(ReservationRuleSettings? settings = null, BusinessSettings? businessSettings = null)
        => new(settings ?? DefaultSettings, businessSettings ?? DefaultBusinessSettings);

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

    [Fact]
    public void Validate_UtcTimeOutsideRawHoursButWithinConfiguredTimeZone_DoesNotThrow()
    {
        // Arrange — 02:00-03:00 UTC is 09:00-10:00 in Asia/Ho_Chi_Minh (UTC+7), a valid slot
        // there even though it looks well outside 08:00-18:00 read as raw UTC.
        var candidate = Candidate(
            new DateTime(2026, 8, 20, 2, 0, 0, DateTimeKind.Utc),
            new DateTime(2026, 8, 20, 3, 0, 0, DateTimeKind.Utc));
        var businessSettings = new BusinessSettings { TimeZoneId = "Asia/Ho_Chi_Minh" };

        // Act
        var act = () => CreateSut(businessSettings: businessSettings).Validate(candidate, []);

        // Assert
        act.Should().NotThrow();
    }

    [Fact]
    public void Validate_UtcTimeWithinRawHoursButOutsideConfiguredTimeZone_Throws()
    {
        // Arrange — 12:00-13:00 UTC looks like a normal midday slot, but is 19:00-20:00 in
        // Asia/Ho_Chi_Minh (UTC+7) — after that zone's 18:00 cutoff.
        var candidate = Candidate(
            new DateTime(2026, 8, 20, 12, 0, 0, DateTimeKind.Utc),
            new DateTime(2026, 8, 20, 13, 0, 0, DateTimeKind.Utc));
        var businessSettings = new BusinessSettings { TimeZoneId = "Asia/Ho_Chi_Minh" };

        // Act
        var act = () => CreateSut(businessSettings: businessSettings).Validate(candidate, []);

        // Assert
        act.Should().Throw<ArgumentException>().WithMessage("*business hours*");
    }
}
