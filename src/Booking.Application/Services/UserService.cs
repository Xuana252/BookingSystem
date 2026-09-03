using Booking.Application.DTOs;
using Booking.Application.Interfaces;
using Booking.Domain.Interfaces;

namespace Booking.Application.Services;

public class UserService(IUserRepository users) : IUserService
{
    public async Task<IReadOnlyList<UserSummaryResponse>> GetAllAsync(CancellationToken ct = default)
        => (await users.GetAllAsync(ct))
            .Select(u => new UserSummaryResponse(u.Id, u.Username))
            .ToList();
}
