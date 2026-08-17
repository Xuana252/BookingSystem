using Booking.Application.Interfaces;
using Booking.Domain.Entities;
using Booking.Domain.Interfaces;

namespace Booking.Application.Services;

public class UserService(IUserRepository users) : IUserService
{
    public Task<IReadOnlyList<User>> GetAllAsync(CancellationToken ct = default)
        => users.GetAllAsync(ct);
}
