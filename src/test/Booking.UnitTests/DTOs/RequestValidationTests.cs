using System.ComponentModel.DataAnnotations;
using Booking.Application.DTOs;
using FluentAssertions;

namespace Booking.UnitTests.DTOs;

public class RequestValidationTests
{
    private static IList<ValidationResult> Validate(object dto)
    {
        var context = new ValidationContext(dto);
        var results = new List<ValidationResult>();
        Validator.TryValidateObject(dto, context, results, validateAllProperties: true);
        return results;
    }

    [Fact]
    public void CreateReservationRequest_EmptyRoomId_ReturnsFriendlyError()
    {
        // Arrange
        var request = new CreateReservationRequest(Guid.Empty, DateTime.UtcNow, DateTime.UtcNow.AddHours(1));

        // Act
        var results = Validate(request);

        // Assert
        results.Should().ContainSingle(r => r.ErrorMessage == "Please select a room to reserve.");
    }

    [Fact]
    public void CreateReservationRequest_ValidPayload_NoErrors()
    {
        // Arrange
        var request = new CreateReservationRequest(Guid.NewGuid(), DateTime.UtcNow, DateTime.UtcNow.AddHours(1));

        // Act
        var results = Validate(request);

        // Assert
        results.Should().BeEmpty();
    }

    [Fact]
    public void CreateRoomRequest_MissingNameAndInvalidCapacity_ReturnsFriendlyErrors()
    {
        // Arrange
        var request = new CreateRoomRequest(string.Empty, "HQ", 0);

        // Act
        var results = Validate(request);

        // Assert
        results.Select(r => r.ErrorMessage).Should().Contain(
        [
            "Room name is required.",
            "Room capacity must be at least 1."
        ]);
    }

    [Fact]
    public void RegisterRequest_InvalidEmailAndShortPassword_ReturnsFriendlyErrors()
    {
        // Arrange
        var request = new RegisterRequest("ab", "not-an-email", "short");

        // Act
        var results = Validate(request);

        // Assert
        results.Select(r => r.ErrorMessage).Should().Contain(
        [
            "Username must be between 3 and 50 characters.",
            "Please provide a valid email address.",
            "Password must be at least 8 characters long."
        ]);
    }

    [Fact]
    public void LoginRequest_MissingFields_ReturnsFriendlyErrors()
    {
        // Arrange
        var request = new LoginRequest(string.Empty, string.Empty);

        // Act
        var results = Validate(request);

        // Assert
        results.Select(r => r.ErrorMessage).Should().Contain(
        [
            "Username is required.",
            "Password is required."
        ]);
    }
}
