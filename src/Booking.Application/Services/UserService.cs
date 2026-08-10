using Booking.Application.DTOs;
using Booking.Application.Interfaces;
using Booking.Domain.Entities;
using Booking.Domain.Interfaces;

namespace Booking.Application.Services;

public class UserService(IUserRepository users) : IUserService
{
    public Task<IReadOnlyList<User>> GetAllAsync(CancellationToken ct = default)
        => users.GetAllAsync(ct);

    public async Task<User> CreateAsync(CreateUserRequest request, CancellationToken ct = default)
    {
        var user = new User
        {
            Username = request.Username,
            Email = request.Email
        };

        await users.AddAsync(user, ct);
        await users.SaveChangesAsync(ct);

        return user;
    }
}
