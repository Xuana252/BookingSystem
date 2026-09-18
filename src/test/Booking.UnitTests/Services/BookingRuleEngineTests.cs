using Booking.Application.Services;
using Booking.Domain.Configuration;
using Booking.Domain.Entities;
using FluentAssertions;

namespace Booking.UnitTests.Services;

public class BookingRuleEngineTests
{
    private static readonly SystemSettings DefaultSettings = new()
    {
        BusinessHoursStart = TimeSpan.FromHours(8),
        BusinessHoursEnd = TimeSpan.FromHours(18),
        MaxDurationHours = 4,
        TimeZoneId = "UTC"
    };

    // Fixed well before every hardcoded candidate date below (all 2026-08-20+), so the
    // not-in-the-past check doesn't retroactively break every other test in this file as real
    // time moves on. TimeProvider (not DateTime.UtcNow directly) is exactly what makes this
    // controllable instead of racing the real clock.
    private static readonly DateTimeOffset FixedNow = new(2026, 1, 1, 0, 0, 0, TimeSpan.Zero);

    private class FixedTimeProvider(DateTimeOffset now) : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() => now;
    }

    private static BookingRuleEngine CreateSut(DateTimeOffset? now = null)
        => new(new FixedTimeProvider(now ?? FixedNow));

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
    public void Validate_StartTimeInThePast_Throws()
    {
        // Arrange — "now" is fixed later than the candidate for this one test, the inverse of
        // every other test's setup, to exercise the past-check specifically.
        var now = new DateTimeOffset(2026, 8, 21, 0, 0, 0, TimeSpan.Zero);
        var candidate = Candidate(
            new DateTime(2026, 8, 20, 9, 0, 0, DateTimeKind.Utc),
            new DateTime(2026, 8, 20, 10, 0, 0, DateTimeKind.Utc));

        // Act
        var act = () => CreateSut(now: now).Validate(candidate, [], 100, 0, DefaultSettings);

        // Assert
        act.Should().Throw<ArgumentException>().WithMessage("*past*");
    }

    [Fact]
    public void Validate_StartTimeExactlyNow_DoesNotThrow()
    {
        // Arrange — the boundary: StartTime == now should still be bookable, only strictly
        // before now is rejected.
        var now = new DateTimeOffset(2026, 8, 20, 9, 0, 0, TimeSpan.Zero);
        var candidate = Candidate(
            new DateTime(2026, 8, 20, 9, 0, 0, DateTimeKind.Utc),
            new DateTime(2026, 8, 20, 10, 0, 0, DateTimeKind.Utc));

        // Act
        var act = () => CreateSut(now: now).Validate(candidate, [], 100, 0, DefaultSettings);

        // Assert
        act.Should().NotThrow();
    }

    [Fact]
    public void Validate_WithinBusinessHoursNoOverlapUnderMaxDuration_DoesNotThrow()
    {
        // Arrange
        var candidate = Candidate(
            new DateTime(2026, 8, 20, 9, 0, 0, DateTimeKind.Utc),
            new DateTime(2026, 8, 20, 10, 0, 0, DateTimeKind.Utc));

        // Act
        var act = () => CreateSut().Validate(candidate, [], 100, 0, DefaultSettings);

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
        var act = () => CreateSut().Validate(candidate, [], 100, 0, DefaultSettings);

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
        var act = () => CreateSut().Validate(candidate, [], 100, 0, DefaultSettings);

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
        var act = () => CreateSut().Validate(candidate, [], 100, 0, DefaultSettings);

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
        var act = () => CreateSut().Validate(candidate, [], 100, 0, DefaultSettings);

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
        var act = () => CreateSut().Validate(candidate, [], 100, 0, DefaultSettings);

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
        var act = () => CreateSut().Validate(candidate, [], 100, 0, DefaultSettings);

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
        var act = () => CreateSut().Validate(candidate, [existing], 100, 0, DefaultSettings);

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
        var act = () => CreateSut().Validate(candidate, [existing], 100, 0, DefaultSettings);

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
        var act = () => CreateSut().Validate(candidate, [existing], 100, 0, DefaultSettings);

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
        var act = () => CreateSut().Validate(candidate, [candidate], 100, 0, DefaultSettings);

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
        var act = () => CreateSut().Validate(candidate, [existingInOtherRoom], 100, 0, DefaultSettings);

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
        var act = () => CreateSut(businessSettings: businessSettings).Validate(candidate, [], 100, 0, DefaultSettings);

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
        var act = () => CreateSut(businessSettings: businessSettings).Validate(candidate, [], 100, 0, DefaultSettings);

        // Assert
        act.Should().Throw<ArgumentException>().WithMessage("*business hours*");
    }

    [Fact]
    public void Validate_HostPlusAttendeesExactlyAtCapacity_DoesNotThrow()
    {
        // Arrange — capacity 4, host + 3 attendees = 4, exactly at the limit.
        var candidate = Candidate(
            new DateTime(2026, 8, 20, 9, 0, 0, DateTimeKind.Utc),
            new DateTime(2026, 8, 20, 10, 0, 0, DateTimeKind.Utc));

        // Act
        var act = () => CreateSut().Validate(candidate, [], roomCapacity: 4, attendeeCount: 3, DefaultSettings);

        // Assert
        act.Should().NotThrow();
    }

    [Fact]
    public void Validate_HostPlusAttendeesExceedsCapacity_Throws()
    {
        // Arrange — capacity 4, host + 4 attendees = 5, one over.
        var candidate = Candidate(
            new DateTime(2026, 8, 20, 9, 0, 0, DateTimeKind.Utc),
            new DateTime(2026, 8, 20, 10, 0, 0, DateTimeKind.Utc));

        // Act
        var act = () => CreateSut().Validate(candidate, [], roomCapacity: 4, attendeeCount: 4, DefaultSettings);

        // Assert
        act.Should().Throw<ArgumentException>().WithMessage("*capacity*");
    }

    [Fact]
    public void Validate_NoAttendeesExceedsCapacity_Throws()
    {
        // Arrange — a room with 0 capacity can't even hold the host alone. Contrived, but proves
        // the "+1 for the host" isn't accidentally dropped when attendeeCount is 0.
        var candidate = Candidate(
            new DateTime(2026, 8, 20, 9, 0, 0, DateTimeKind.Utc),
            new DateTime(2026, 8, 20, 10, 0, 0, DateTimeKind.Utc));

        // Act
        var act = () => CreateSut().Validate(candidate, [], roomCapacity: 0, attendeeCount: 0, DefaultSettings);

        // Assert
        act.Should().Throw<ArgumentException>().WithMessage("*capacity*");
    }
}
