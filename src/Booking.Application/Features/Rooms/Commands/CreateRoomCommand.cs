using Booking.Application.Features.Common.Caching;
using Booking.Domain.Entities;
using Booking.Domain.Interfaces;
using MediatR;

namespace Booking.Application.Features.Rooms.Commands;

public record CreateRoomCommand(string Name, string Location, int Capacity, List<string>? Amenities, List<string>? WebhookUrls) 
    : ICacheInvalidatorCommand<Room>
{
    public string[] CacheKeysToInvalidate => ["Rooms_All_True", "Rooms_All_False"];
}

public class CreateRoomCommandHandler : IRequestHandler<CreateRoomCommand, Room>
{
    private readonly IRoomRepository _rooms;

    public CreateRoomCommandHandler(IRoomRepository rooms)
    {
        _rooms = rooms;
    }

    public async Task<Room> Handle(CreateRoomCommand request, CancellationToken cancellationToken)
    {
        var room = new Room
        {
            Name = request.Name,
            Location = request.Location,
            Capacity = request.Capacity,
            IsActive = true,
            Amenities = request.Amenities ?? new List<string>(),
            WebhookUrls = request.WebhookUrls ?? new List<string>()
        };

        await _rooms.AddAsync(room, cancellationToken);
        await _rooms.SaveChangesAsync(cancellationToken);

        return room;
    }
}
