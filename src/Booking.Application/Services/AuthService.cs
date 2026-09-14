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

        // Checked only after the password's already confirmed correct — so a wrong-password
        // attempt against a deactivated account still just gets the generic message above,
        // rather than leaking "this account exists and is deactivated" to someone who doesn't
        // actually know the password. The genuine account owner (who does) gets told plainly.
        if (!user.IsActive)
        {
            throw new UnauthorizedAccessException("Your account has been deactivated. Contact an administrator.");
        }

        return new AuthResponse(jwtTokenGenerator.GenerateToken(user), user.Id, user.Username);
    }
}
