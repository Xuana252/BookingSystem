using Booking.Application.DTOs;
using Booking.Domain.Entities;

namespace Booking.Application.Interfaces;

public interface IRoomService
{
    /// <summary>Active rooms only — what the booking calendar shows.</summary>
    Task<IReadOnlyList<Room>> GetAllAsync(CancellationToken ct = default);

    /// <summary>Every room regardless of IsActive — the admin room-management view.</summary>
    Task<IReadOnlyList<Room>> GetAllIncludingInactiveAsync(CancellationToken ct = default);

    Task<Room> CreateAsync(CreateRoomRequest request, CancellationToken ct = default);
    Task<Room> UpdateAsync(Guid roomId, UpdateRoomRequest request, CancellationToken ct = default);
    Task DeactivateAsync(Guid roomId, CancellationToken ct = default);
    Task ActivateAsync(Guid roomId, CancellationToken ct = default);
    Task UpdateWebhooksAsync(Guid roomId, List<string> webhookUrls, CancellationToken ct = default);
    Task UpdateAmenitiesAsync(Guid roomId, List<string> amenities, CancellationToken ct = default);
}
