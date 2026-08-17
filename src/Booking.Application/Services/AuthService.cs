using Booking.Application.DTOs;
using Booking.Application.Interfaces;
using Booking.Domain.Entities;
using Booking.Domain.Interfaces;

namespace Booking.Application.Services;

public class AuthService(IUserRepository users, IPasswordHasher passwordHasher, IJwtTokenGenerator jwtTokenGenerator) : IAuthService
{
    public async Task<AuthResponse> RegisterAsync(RegisterRequest request, CancellationToken ct = default)
    {
        var existing = await users.GetByUsernameAsync(request.Username, ct);
        if (existing is not null)
        {
            throw new InvalidOperationException($"Username '{request.Username}' is already taken.");
        }

        var user = new User
        {
            Username = request.Username,
            Email = request.Email,
            PasswordHash = passwordHasher.Hash(request.Password)
        };

        await users.AddAsync(user, ct);
        await users.SaveChangesAsync(ct);

        return new AuthResponse(jwtTokenGenerator.GenerateToken(user), user.Id, user.Username);
    }

    public async Task<AuthResponse> LoginAsync(LoginRequest request, CancellationToken ct = default)
    {
        var user = await users.GetByUsernameAsync(request.Username, ct);
        if (user is null || !passwordHasher.Verify(request.Password, user.PasswordHash))
        {
            throw new UnauthorizedAccessException("Invalid username or password.");
        }

        return new AuthResponse(jwtTokenGenerator.GenerateToken(user), user.Id, user.Username);
    }
}
