using Booking.Application.DTOs;

namespace Booking.Application.Interfaces;

public interface IUserService
{
    Task<IReadOnlyList<UserSummaryResponse>> GetAllAsync(CancellationToken ct = default);

    /// <summary>The admin management view — every user, with Email/Role/IsActive.</summary>
    Task<IReadOnlyList<UserManagementResponse>> GetAllForManagementAsync(CancellationToken ct = default);

    Task DeactivateAsync(Guid userId, CancellationToken ct = default);
    Task ActivateAsync(Guid userId, CancellationToken ct = default);

    /// <summary>Employee -> Admin.</summary>
    Task PromoteAsync(Guid userId, CancellationToken ct = default);

    /// <summary>Admin -> Employee. Throws InvalidOperationException if this is the last Admin.</summary>
    Task DemoteAsync(Guid userId, CancellationToken ct = default);
}
