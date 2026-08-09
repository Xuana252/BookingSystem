using Booking.Domain.Entities;
using FluentAssertions;

namespace Booking.UnitTests.Entities;

public class ReservationTests
{
    [Fact]
    public void IsValidTimeRange_EndAfterStart_ReturnsTrue()
    {
        var start = new DateTime(2026, 8, 10, 9, 0, 0, DateTimeKind.Utc);
        var end = start.AddHours(1);

        Reservation.IsValidTimeRange(start, end).Should().BeTrue();
    }

    [Fact]
    public void IsValidTimeRange_EndEqualsStart_ReturnsFalse()
    {
        var start = new DateTime(2026, 8, 10, 9, 0, 0, DateTimeKind.Utc);

        Reservation.IsValidTimeRange(start, start).Should().BeFalse();
    }

    [Fact]
    public void IsValidTimeRange_EndBeforeStart_ReturnsFalse()
    {
        var start = new DateTime(2026, 8, 10, 9, 0, 0, DateTimeKind.Utc);
        var end = start.AddHours(-1);

        Reservation.IsValidTimeRange(start, end).Should().BeFalse();
    }
}
