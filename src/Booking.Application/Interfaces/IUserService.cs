using Booking.Application.DTOs;

namespace Booking.Application.Interfaces;

public interface IUserService
{
    Task<IReadOnlyList<UserSummaryResponse>> GetAllAsync(CancellationToken ct = default);
}
