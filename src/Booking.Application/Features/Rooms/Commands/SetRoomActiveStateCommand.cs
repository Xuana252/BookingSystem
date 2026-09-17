using Booking.Application.Features.Common.Caching;
using Booking.Domain.Interfaces;
using MediatR;

namespace Booking.Application.Features.Rooms.Commands;

public record SetRoomActiveStateCommand(Guid Id, bool IsActive) : ICacheInvalidatorCommand
{
    public string[] CacheKeysToInvalidate => ["Rooms_All_True", "Rooms_All_False"];
}

public class SetRoomActiveStateCommandHandler : IRequestHandler<SetRoomActiveStateCommand>
{
    private readonly IRoomRepository _rooms;

    public SetRoomActiveStateCommandHandler(IRoomRepository rooms)
    {
        _rooms = rooms;
    }

    public async Task Handle(SetRoomActiveStateCommand request, CancellationToken cancellationToken)
    {
        var room = await _rooms.GetByIdAsync(request.Id, cancellationToken)
            ?? throw new KeyNotFoundException($"Room '{request.Id}' not found.");

        if (room.IsActive == request.IsActive)
        {
            return;
        }

        room.IsActive = request.IsActive;
        await _rooms.SaveChangesAsync(cancellationToken);
    }
}
