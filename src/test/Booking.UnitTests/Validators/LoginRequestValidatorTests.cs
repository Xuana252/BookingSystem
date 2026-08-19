using Booking.Application.DTOs;
using Booking.Application.Validators;
using FluentAssertions;

namespace Booking.UnitTests.Validators;

public class LoginRequestValidatorTests
{
    private static LoginRequestValidator CreateSut() => new();

    [Fact]
    public void Validate_ValidRequest_IsValid()
    {
        // Arrange
        var request = new LoginRequest("someuser", "somepassword");

        // Act
        var result = CreateSut().Validate(request);

        // Assert
        result.IsValid.Should().BeTrue();
    }

    [Fact]
    public void Validate_MissingFields_HasFriendlyErrors()
    {
        // Arrange
        var request = new LoginRequest(string.Empty, string.Empty);

        // Act
        var result = CreateSut().Validate(request);

        // Assert
        result.IsValid.Should().BeFalse();
        result.Errors.Select(e => e.ErrorMessage).Should().Contain(
        [
            "Username is required.",
            "Password is required."
        ]);
    }
}
