using Booking.Domain.Entities;
using Booking.Domain.Interfaces;
using MediatR;

namespace Booking.Application.Features.Rooms.Commands;

public record UpdateRoomCommand(Guid Id, string Name, string Location, int Capacity, List<string>? Amenities, List<string>? WebhookUrls) : IRequest<Room>;

public class UpdateRoomCommandHandler : IRequestHandler<UpdateRoomCommand, Room>
{
    private readonly IRoomRepository _rooms;

    public UpdateRoomCommandHandler(IRoomRepository rooms)
    {
        _rooms = rooms;
    }

    public async Task<Room> Handle(UpdateRoomCommand request, CancellationToken cancellationToken)
    {
        var room = await _rooms.GetByIdAsync(request.Id, cancellationToken)
            ?? throw new KeyNotFoundException($"Room '{request.Id}' not found.");

        room.Name = request.Name;
        room.Location = request.Location;
        room.Capacity = request.Capacity;
        
        if (request.Amenities != null) room.Amenities = request.Amenities;
        if (request.WebhookUrls != null) room.WebhookUrls = request.WebhookUrls;

        await _rooms.SaveChangesAsync(cancellationToken);
        return room;
    }
}
