using Booking.Application.DTOs;
using Booking.Application.Interfaces;
using Booking.Domain.Entities;
using Booking.Domain.Interfaces;

namespace Booking.Application.Services;

public class RoomService(IRoomRepository rooms) : IRoomService
{
    public Task<IReadOnlyList<Room>> GetAllAsync(CancellationToken ct = default)
        => rooms.GetAllAsync(ct);

    public async Task<Room> CreateAsync(CreateRoomRequest request, CancellationToken ct = default)
    {
        var room = new Room
        {
            Name = request.Name,
            Location = request.Location,
            Capacity = request.Capacity
        };

        await rooms.AddAsync(room, ct);
        await rooms.SaveChangesAsync(ct);

        return room;
    }
}
