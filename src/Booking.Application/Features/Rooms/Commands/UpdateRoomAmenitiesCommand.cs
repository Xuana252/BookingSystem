using Booking.Domain.Interfaces;
using MediatR;

namespace Booking.Application.Features.Rooms.Commands;

public record UpdateRoomAmenitiesCommand(Guid Id, List<string> Amenities) : IRequest;

public class UpdateRoomAmenitiesCommandHandler : IRequestHandler<UpdateRoomAmenitiesCommand>
{
    private readonly IRoomRepository _rooms;

    public UpdateRoomAmenitiesCommandHandler(IRoomRepository rooms)
    {
        _rooms = rooms;
    }

    public async Task Handle(UpdateRoomAmenitiesCommand request, CancellationToken cancellationToken)
    {
        var room = await _rooms.GetByIdAsync(request.Id, cancellationToken)
            ?? throw new KeyNotFoundException($"Room '{request.Id}' not found.");

        room.Amenities = request.Amenities ?? new List<string>();
        await _rooms.SaveChangesAsync(cancellationToken);
    }
}
