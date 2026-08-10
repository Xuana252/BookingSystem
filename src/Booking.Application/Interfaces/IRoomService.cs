using Booking.Application.DTOs;
using Booking.Domain.Entities;

namespace Booking.Application.Interfaces;

public interface IRoomService
{
    Task<IReadOnlyList<Room>> GetAllAsync(CancellationToken ct = default);
    Task<Room> CreateAsync(CreateRoomRequest request, CancellationToken ct = default);
}
