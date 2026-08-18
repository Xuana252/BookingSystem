using Booking.Domain.Entities;

namespace Booking.Application.Interfaces;

public interface IUserService
{
    Task<IReadOnlyList<User>> GetAllAsync(CancellationToken ct = default);
}
