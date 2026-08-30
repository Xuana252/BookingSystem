using Booking.Domain.Interfaces;
using Microsoft.AspNetCore.SignalR;

namespace Booking.Infrastructure.Hubs;

public sealed class SignalRRealtimeNotifier(IHubContext<ReservationHub> hubContext) : IRealtimeNotifier
{
    public Task RoomAvailabilityChangedAsync(Guid roomId, CancellationToken ct = default)
        => hubContext.Clients.All.SendAsync("RoomAvailabilityChanged", roomId, cancellationToken: ct);

    public Task NotifyUserAsync(Guid userId, string message, CancellationToken ct = default)
        => hubContext.Clients.User(userId.ToString()).SendAsync("NotificationReceived", message, cancellationToken: ct);
}
