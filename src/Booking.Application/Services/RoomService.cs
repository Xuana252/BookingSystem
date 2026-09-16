using Booking.Application.DTOs;
using Booking.Application.Interfaces;
using Booking.Domain.Entities;
using Booking.Domain.Interfaces;

namespace Booking.Application.Services;

public class RoomService(IRoomRepository rooms) : IRoomService
{
    public async Task<IReadOnlyList<Room>> GetAllAsync(CancellationToken ct = default)
        => (await rooms.GetAllAsync(ct)).Where(r => r.IsActive).ToList();

    public Task<IReadOnlyList<Room>> GetAllIncludingInactiveAsync(CancellationToken ct = default)
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

    public async Task<Room> UpdateAsync(Guid roomId, UpdateRoomRequest request, CancellationToken ct = default)
    {
        var room = await rooms.GetByIdAsync(roomId, ct)
            ?? throw new KeyNotFoundException($"Room '{roomId}' not found.");

        room.Name = request.Name;
        room.Location = request.Location;
        room.Capacity = request.Capacity;
        
        if (request.Amenities != null) room.Amenities = request.Amenities;
        if (request.WebhookUrls != null) room.WebhookUrls = request.WebhookUrls;

        await rooms.SaveChangesAsync(ct);
        return room;
    }

    public async Task UpdateWebhooksAsync(Guid roomId, List<string> webhookUrls, CancellationToken ct = default)
    {
        var room = await rooms.GetByIdAsync(roomId, ct)
            ?? throw new KeyNotFoundException($"Room '{roomId}' not found.");

        room.WebhookUrls = webhookUrls ?? new List<string>();
        await rooms.SaveChangesAsync(ct);
    }

    public async Task UpdateAmenitiesAsync(Guid roomId, List<string> amenities, CancellationToken ct = default)
    {
        var room = await rooms.GetByIdAsync(roomId, ct)
            ?? throw new KeyNotFoundException($"Room '{roomId}' not found.");

        room.Amenities = amenities ?? new List<string>();
        await rooms.SaveChangesAsync(ct);
    }

    public async Task DeactivateAsync(Guid roomId, CancellationToken ct = default)
    {
        var room = await rooms.GetByIdAsync(roomId, ct)
            ?? throw new KeyNotFoundException($"Room '{roomId}' not found.");

        if (!room.IsActive)
        {
            return;
        }

        room.IsActive = false;
        await rooms.SaveChangesAsync(ct);
    }

    public async Task ActivateAsync(Guid roomId, CancellationToken ct = default)
    {
        var room = await rooms.GetByIdAsync(roomId, ct)
            ?? throw new KeyNotFoundException($"Room '{roomId}' not found.");

        if (room.IsActive)
        {
            return;
        }

        room.IsActive = true;
        await rooms.SaveChangesAsync(ct);
    }
}
