using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace Booking.Infrastructure.Hubs;

/// <summary>
/// No client-invokable methods — clients only connect and listen. Broadcasts go out via
/// <see cref="SignalRRealtimeNotifier"/> (an <see cref="IHubContext{ReservationHub}"/>), from
/// either Booking.Api (reservation create/cancel) or Booking.Worker (reminder notifications),
/// relayed to connected clients through the Redis backplane either process may not itself hold
/// the connection for.
/// </summary>
[Authorize]
public class ReservationHub : Hub;
