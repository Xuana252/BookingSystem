using Booking.Application.DTOs;
using Booking.Application.Validators;
using FluentAssertions;

namespace Booking.UnitTests.Validators;

public class CreateRoomRequestValidatorTests
{
    private static CreateRoomRequestValidator CreateSut() => new();

    [Fact]
    public void Validate_ValidRequest_IsValid()
    {
        // Arrange
        var request = new CreateRoomRequest("Conference Room A", "HQ - Floor 3", 8);

        // Act
        var result = CreateSut().Validate(request);

        // Assert
        result.IsValid.Should().BeTrue();
    }

    [Fact]
    public void Validate_MissingNameAndInvalidCapacity_HasFriendlyErrors()
    {
        // Arrange
        var request = new CreateRoomRequest(string.Empty, "HQ", 0);

        // Act
        var result = CreateSut().Validate(request);

        // Assert
        result.IsValid.Should().BeFalse();
        result.Errors.Select(e => e.ErrorMessage).Should().Contain(
        [
            "Room name is required.",
            "Room capacity must be at least 1."
        ]);
    }
}
