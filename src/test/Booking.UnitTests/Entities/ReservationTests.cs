using Booking.Domain.Entities;
using FluentAssertions;

namespace Booking.UnitTests.Entities;

public class ReservationTests
{
    [Fact]
    public void IsValidTimeRange_EndAfterStart_ReturnsTrue()
    {
        // Arrange
        var start = new DateTime(2026, 8, 10, 9, 0, 0, DateTimeKind.Utc);
        var end = start.AddHours(1);

        // Act
        var result = Reservation.IsValidTimeRange(start, end);

        // Assert
        result.Should().BeTrue();
    }

    [Fact]
    public void IsValidTimeRange_EndEqualsStart_ReturnsFalse()
    {
        // Arrange
        var start = new DateTime(2026, 8, 10, 9, 0, 0, DateTimeKind.Utc);

        // Act
        var result = Reservation.IsValidTimeRange(start, start);

        // Assert
        result.Should().BeFalse();
    }

    [Fact]
    public void IsValidTimeRange_EndBeforeStart_ReturnsFalse()
    {
        // Arrange
        var start = new DateTime(2026, 8, 10, 9, 0, 0, DateTimeKind.Utc);
        var end = start.AddHours(-1);

        // Act
        var result = Reservation.IsValidTimeRange(start, end);

        // Assert
        result.Should().BeFalse();
    }
}
