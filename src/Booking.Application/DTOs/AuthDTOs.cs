using System.ComponentModel.DataAnnotations;

namespace Booking.Application.DTOs;

public record RegisterRequest(
    [property: Required(ErrorMessage = "Username is required.")]
    [property: StringLength(50, MinimumLength = 3, ErrorMessage = "Username must be between 3 and 50 characters.")]
    string Username,

    [property: Required(ErrorMessage = "Email is required.")]
    [property: EmailAddress(ErrorMessage = "Please provide a valid email address.")]
    string Email,

    [property: Required(ErrorMessage = "Password is required.")]
    [property: MinLength(8, ErrorMessage = "Password must be at least 8 characters long.")]
    string Password);

public record LoginRequest(
    [property: Required(ErrorMessage = "Username is required.")]
    string Username,

    [property: Required(ErrorMessage = "Password is required.")]
    string Password);

public record AuthResponse(string Token, Guid UserId, string Username);
