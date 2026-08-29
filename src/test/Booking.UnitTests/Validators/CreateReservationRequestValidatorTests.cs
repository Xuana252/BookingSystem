using Booking.Application.DTOs;
using Booking.Application.Validators;
using FluentAssertions;

namespace Booking.UnitTests.Validators;

public class CreateReservationRequestValidatorTests
{
    private static CreateReservationRequestValidator CreateSut() => new();

    [Fact]
    public void Validate_ValidRequest_IsValid()
    {
        // Arrange
        var request = new CreateReservationRequest(
            Guid.NewGuid(),
            new DateTime(2026, 8, 20, 9, 0, 0, DateTimeKind.Utc),
            new DateTime(2026, 8, 20, 10, 0, 0, DateTimeKind.Utc));

        // Act
        var result = CreateSut().Validate(request);

        // Assert
        result.IsValid.Should().BeTrue();
    }

    [Fact]
    public void Validate_EmptyRoomId_HasFriendlyError()
    {
        // Arrange
        var request = new CreateReservationRequest(
            Guid.Empty,
            new DateTime(2026, 8, 20, 9, 0, 0, DateTimeKind.Utc),
            new DateTime(2026, 8, 20, 10, 0, 0, DateTimeKind.Utc));

        // Act
        var result = CreateSut().Validate(request);

        // Assert
        result.IsValid.Should().BeFalse();
        result.Errors.Should().ContainSingle(e => e.ErrorMessage == "Please select a room to reserve.");
    }

    [Fact]
    public void Validate_DefaultStartAndEndTimes_HasFriendlyErrors()
    {
        // Arrange
        var request = new CreateReservationRequest(Guid.NewGuid(), default, default);

        // Act
        var result = CreateSut().Validate(request);

        // Assert
        result.IsValid.Should().BeFalse();
        result.Errors.Select(e => e.ErrorMessage).Should().Contain(
        [
            "Please provide a start time for the reservation.",
            "Please provide an end time for the reservation."
        ]);
    }
}
