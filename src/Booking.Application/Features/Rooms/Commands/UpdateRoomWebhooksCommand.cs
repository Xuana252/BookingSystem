using Booking.Domain.Interfaces;
using MediatR;

namespace Booking.Application.Features.Rooms.Commands;

public record UpdateRoomWebhooksCommand(Guid Id, List<string> WebhookUrls) : IRequest;

public class UpdateRoomWebhooksCommandHandler : IRequestHandler<UpdateRoomWebhooksCommand>
{
    private readonly IRoomRepository _rooms;

    public UpdateRoomWebhooksCommandHandler(IRoomRepository rooms)
    {
        _rooms = rooms;
    }

    public async Task Handle(UpdateRoomWebhooksCommand request, CancellationToken cancellationToken)
    {
        var room = await _rooms.GetByIdAsync(request.Id, cancellationToken)
            ?? throw new KeyNotFoundException($"Room '{request.Id}' not found.");

        room.WebhookUrls = request.WebhookUrls ?? new List<string>();
        await _rooms.SaveChangesAsync(cancellationToken);
    }
}
