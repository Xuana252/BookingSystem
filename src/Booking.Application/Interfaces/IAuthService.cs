using Booking.Application.DTOs;

namespace Booking.Application.Interfaces;

public interface IAuthService
{
    /// <exception cref="InvalidOperationException">Username is already taken.</exception>
    Task<AuthResponse> RegisterAsync(RegisterRequest request, CancellationToken ct = default);

    /// <exception cref="UnauthorizedAccessException">Username not found or password incorrect.</exception>
    Task<AuthResponse> LoginAsync(LoginRequest request, CancellationToken ct = default);
}
