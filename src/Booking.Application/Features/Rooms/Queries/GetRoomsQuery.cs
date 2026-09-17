using Booking.Application.Features.Common.Caching;
using Booking.Domain.Entities;
using Booking.Domain.Interfaces;
using MediatR;

namespace Booking.Application.Features.Rooms.Queries;

public record GetRoomsQuery(bool IncludeInactive) : ICachedQuery<IReadOnlyList<Room>>
{
    public string CacheKey => $"Rooms_All_{IncludeInactive}";
    public TimeSpan? Expiration => TimeSpan.FromMinutes(5);
}

public class GetRoomsQueryHandler : IRequestHandler<GetRoomsQuery, IReadOnlyList<Room>>
{
    private readonly IRoomRepository _rooms;

    public GetRoomsQueryHandler(IRoomRepository rooms)
    {
        _rooms = rooms;
    }

    public async Task<IReadOnlyList<Room>> Handle(GetRoomsQuery request, CancellationToken cancellationToken)
    {
        var allRooms = await _rooms.GetAllAsync(cancellationToken);
        
        if (request.IncludeInactive)
        {
            return allRooms;
        }

        return allRooms.Where(r => r.IsActive).ToList();
    }
}
