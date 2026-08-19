using Booking.Application.DTOs;
using Booking.Application.Validators;
using FluentAssertions;

namespace Booking.UnitTests.Validators;

public class RegisterRequestValidatorTests
{
    private static RegisterRequestValidator CreateSut() => new();

    [Fact]
    public void Validate_ValidRequest_IsValid()
    {
        // Arrange
        var request = new RegisterRequest("newuser", "user@example.com", "password123");

        // Act
        var result = CreateSut().Validate(request);

        // Assert
        result.IsValid.Should().BeTrue();
    }

    [Fact]
    public void Validate_InvalidEmailAndShortPassword_HasFriendlyErrors()
    {
        // Arrange
        var request = new RegisterRequest("ab", "not-an-email", "short");

        // Act
        var result = CreateSut().Validate(request);

        // Assert
        result.IsValid.Should().BeFalse();
        result.Errors.Select(e => e.ErrorMessage).Should().Contain(
        [
            "Username must be between 3 and 50 characters.",
            "Please provide a valid email address.",
            "Password must be at least 8 characters long."
        ]);
    }
}
